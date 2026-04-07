from flask import Flask

import routes.sentiment as sentiment_routes
from routes.sentiment import sentiment_bp


def _create_sentiment_client():
    app = Flask(__name__)
    app.config["TESTING"] = True
    app.register_blueprint(sentiment_bp, url_prefix="/api/sentiment")
    return app.test_client()


def test_analyze_requires_text():
    client = _create_sentiment_client()

    response = client.post("/api/sentiment/analyze", json={})

    assert response.status_code == 400
    assert response.get_json()["error"] == "No text provided"


def test_analyze_success_returns_payload(monkeypatch):
    client = _create_sentiment_client()
    metric_calls = []
    history_calls = []

    def fake_infer(text, model_name):
        return {
            "task": "sentiment",
            "model_name": model_name,
            "input": {"text": text, "token_count": 3},
            "result": {"label": "NEU", "NEU": 0.9, "NEG": 0.05, "POS": 0.05, "label_id": 2},
            "meta": {"confidence_score": 0.9, "processing_time_ms": 12.5, "token_count": 3, "warnings": []},
        }

    monkeypatch.setattr(sentiment_routes, "_infer_sentiment", fake_infer)
    monkeypatch.setattr(sentiment_routes, "record_inference_metric", lambda **kwargs: metric_calls.append(kwargs))
    monkeypatch.setattr(sentiment_routes, "save_history", lambda **kwargs: history_calls.append(kwargs))

    response = client.post(
        "/api/sentiment/analyze",
        json={"text": "xin chao ban", "model_name": "sentiment"},
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["label"] == "NEU"
    assert payload["result"]["label_id"] == 2
    assert len(metric_calls) == 1
    assert metric_calls[0]["is_success"] is True
    assert len(history_calls) == 1
    assert history_calls[0]["feature"] == "sentiment"


def test_analyze_supports_ab_test(monkeypatch):
    client = _create_sentiment_client()
    infer_models = []

    monkeypatch.setattr(
        sentiment_routes,
        "choose_ab_variant",
        lambda **kwargs: {
            "model_name": "vispam-VisoBert",
            "experiment": "exp-1",
            "variant": "B",
            "allocation": 0.5,
        },
    )

    def fake_infer(text, model_name):
        infer_models.append(model_name)
        return {
            "task": "sentiment",
            "model_name": model_name,
            "input": {"text": text, "token_count": 2},
            "result": {"label": "spam", "spam": 0.7, "no-spam": 0.3, "label_id": 1},
            "meta": {"confidence_score": 0.7, "processing_time_ms": 5.2, "token_count": 2, "warnings": []},
        }

    monkeypatch.setattr(sentiment_routes, "_infer_sentiment", fake_infer)
    monkeypatch.setattr(sentiment_routes, "record_inference_metric", lambda **kwargs: None)
    monkeypatch.setattr(sentiment_routes, "save_history", lambda **kwargs: None)

    response = client.post(
        "/api/sentiment/analyze",
        json={
            "text": "mau test",
            "model_name": "sentiment",
            "ab_test": {
                "enabled": True,
                "models": ["sentiment", "vispam-VisoBert"],
                "client_id": "user-1",
                "experiment_name": "exp-1",
            },
        },
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert infer_models == ["vispam-VisoBert"]
    assert payload["ab_test"]["variant"] == "B"


def test_analyze_ab_test_failure_returns_400(monkeypatch):
    client = _create_sentiment_client()

    def broken_ab_choice(**kwargs):
        raise RuntimeError("invalid ab payload")

    monkeypatch.setattr(sentiment_routes, "choose_ab_variant", broken_ab_choice)

    response = client.post(
        "/api/sentiment/analyze",
        json={
            "text": "mau test",
            "ab_test": {"enabled": True, "models": ["sentiment", "vispam-VisoBert"]},
        },
    )

    assert response.status_code == 400
    payload = response.get_json()
    assert payload["error_code"] == "ab_test_configuration_failed"


def test_analyze_unsupported_model_returns_400():
    client = _create_sentiment_client()

    response = client.post(
        "/api/sentiment/analyze",
        json={"text": "xin chao", "model_name": "unknown-model"},
    )

    assert response.status_code == 400
    payload = response.get_json()
    assert payload["error_code"] == "unsupported_model_name"
    assert "Unsupported model_name" in payload["error"]


def test_analyze_internal_error_includes_stable_error_code(monkeypatch):
    client = _create_sentiment_client()

    def broken_infer(text, model_name):
        raise RuntimeError("boom")

    monkeypatch.setattr(sentiment_routes, "_infer_sentiment", broken_infer)

    response = client.post(
        "/api/sentiment/analyze",
        json={"text": "xin chao", "model_name": "sentiment"},
    )

    assert response.status_code == 500
    payload = response.get_json()
    assert payload["error_code"] == "sentiment_internal_error"


def test_compare_rejects_invalid_models():
    client = _create_sentiment_client()

    response = client.post(
        "/api/sentiment/compare",
        json={"text": "xin chao", "models": ["only-one"]},
    )

    assert response.status_code == 400
    assert "models must be a list of exactly 2 model names" in response.get_json()["error"]


def test_compare_returns_two_payloads(monkeypatch):
    client = _create_sentiment_client()

    def fake_infer(text, model_name):
        return {
            "task": "sentiment",
            "model_name": model_name,
            "input": {"text": text, "token_count": 2},
            "result": {"label": "spam", "label_id": 1, "spam": 0.8, "no-spam": 0.2},
            "meta": {"confidence_score": 0.8, "processing_time_ms": 8.3, "token_count": 2, "warnings": []},
        }

    monkeypatch.setattr(sentiment_routes, "_infer_sentiment", fake_infer)

    response = client.post(
        "/api/sentiment/compare",
        json={"text": "xin chao", "models": ["vispam-Phobert", "vispam-VisoBert"]},
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["task"] == "sentiment"
    assert len(payload["comparisons"]) == 2
    assert payload["comparisons"][0]["label"] == "spam"


def test_compare_unsupported_model_returns_400():
    client = _create_sentiment_client()

    response = client.post(
        "/api/sentiment/compare",
        json={"text": "xin chao", "models": ["vispam-Phobert", "unknown-model"]},
    )

    assert response.status_code == 400
    payload = response.get_json()
    assert payload["error_code"] == "unsupported_model_name"


def test_analyze_file_requires_valid_upload():
    client = _create_sentiment_client()

    response = client.post("/api/sentiment/analyze-file", data={})

    assert response.status_code == 400
    assert "error" in response.get_json()
