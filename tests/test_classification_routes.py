from flask import Flask

import routes.classification as classification_routes
from routes.classification import classification_bp


def _create_classification_client():
    app = Flask(__name__)
    app.config["TESTING"] = True
    app.register_blueprint(classification_bp, url_prefix="/api/classification")
    return app.test_client()


def test_classify_requires_text():
    client = _create_classification_client()

    response = client.post("/api/classification/classify", json={})

    assert response.status_code == 400
    assert response.get_json()["error"] == "No text provided"


def test_classify_success_returns_payload(monkeypatch):
    client = _create_classification_client()
    metric_calls = []
    history_calls = []

    def fake_infer(text, model_name):
        return {
            "task": "classification",
            "model_name": model_name,
            "input": {"text": text, "token_count": 4},
            "result": {"label": "Kinh doanh", "label_id": 0, "Kinh doanh": 0.88},
            "meta": {"confidence_score": 0.88, "processing_time_ms": 15.2, "token_count": 4, "warnings": []},
        }

    monkeypatch.setattr(classification_routes, "_infer_classification", fake_infer)
    monkeypatch.setattr(classification_routes, "record_inference_metric", lambda **kwargs: metric_calls.append(kwargs))
    monkeypatch.setattr(classification_routes, "save_history", lambda **kwargs: history_calls.append(kwargs))

    response = client.post(
        "/api/classification/classify",
        json={"text": "xin chao the gioi", "model_name": "topic_classification"},
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["label_name"] == "Kinh doanh"
    assert payload["label_id"] == 0
    assert len(metric_calls) == 1
    assert metric_calls[0]["is_success"] is True
    assert len(history_calls) == 1
    assert history_calls[0]["feature"] == "classification"


def test_classify_supports_ab_test(monkeypatch):
    client = _create_classification_client()
    infer_models = []

    monkeypatch.setattr(
        classification_routes,
        "choose_ab_variant",
        lambda **kwargs: {
            "model_name": "topic_classification",
            "experiment": "clf-exp-1",
            "variant": "B",
            "allocation": 0.5,
        },
    )

    def fake_infer(text, model_name):
        infer_models.append(model_name)
        return {
            "task": "classification",
            "model_name": model_name,
            "input": {"text": text, "token_count": 2},
            "result": {"label": "Khoa học", "label_id": 8, "Khoa học": 0.77},
            "meta": {"confidence_score": 0.77, "processing_time_ms": 9.1, "token_count": 2, "warnings": []},
        }

    monkeypatch.setattr(classification_routes, "_infer_classification", fake_infer)
    monkeypatch.setattr(classification_routes, "record_inference_metric", lambda **kwargs: None)
    monkeypatch.setattr(classification_routes, "save_history", lambda **kwargs: None)

    response = client.post(
        "/api/classification/classify",
        json={
            "text": "mau test",
            "model_name": "essay_identification",
            "ab_test": {
                "enabled": True,
                "models": ["essay_identification", "topic_classification"],
                "client_id": "user-1",
                "experiment_name": "clf-exp-1",
            },
        },
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert infer_models == ["topic_classification"]
    assert payload["ab_test"]["variant"] == "B"


def test_classify_internal_error_returns_500(monkeypatch):
    client = _create_classification_client()

    def broken_infer(text, model_name):
        raise RuntimeError("boom")

    monkeypatch.setattr(classification_routes, "_infer_classification", broken_infer)
    monkeypatch.setattr(classification_routes, "record_inference_metric", lambda **kwargs: None)
    monkeypatch.setattr(classification_routes, "save_history", lambda **kwargs: None)

    response = client.post(
        "/api/classification/classify",
        json={"text": "xin chao", "model_name": "essay_identification"},
    )

    assert response.status_code == 500
    assert response.get_json()["error"] == "boom"


def test_compare_rejects_invalid_models():
    client = _create_classification_client()

    response = client.post(
        "/api/classification/compare",
        json={"text": "xin chao", "models": ["only-one"]},
    )

    assert response.status_code == 400
    assert "models must be a list of exactly 2 model names" in response.get_json()["error"]


def test_compare_returns_two_payloads(monkeypatch):
    client = _create_classification_client()

    def fake_infer(text, model_name):
        return {
            "task": "classification",
            "model_name": model_name,
            "input": {"text": text, "token_count": 2},
            "result": {"label": "Thể thao", "label_id": 6, "Thể thao": 0.8},
            "meta": {"confidence_score": 0.8, "processing_time_ms": 7.8, "token_count": 2, "warnings": []},
        }

    monkeypatch.setattr(classification_routes, "_infer_classification", fake_infer)

    response = client.post(
        "/api/classification/compare",
        json={"text": "xin chao", "models": ["essay_identification", "topic_classification"]},
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["task"] == "classification"
    assert len(payload["comparisons"]) == 2
    assert payload["comparisons"][0]["label_name"] == "Thể thao"


def test_analyze_file_requires_valid_upload():
    client = _create_classification_client()

    response = client.post("/api/classification/analyze-file", data={})

    assert response.status_code == 400
    assert "error" in response.get_json()
