from flask import Flask

from routes.feedback import feedback_bp
import routes.feedback as feedback_routes


def create_feedback_client(monkeypatch):
    saved_calls = []
    saved_inference_calls = []

    def fake_submit_feedback(email, message):
        saved_calls.append({"email": email, "message": message})
        return {"success": True, "message": "Cảm ơn bạn đã gửi phản hồi!"}

    def fake_list_feedback(limit=50):
        return [
            {
                "id": 1,
                "email": "test@example.com",
                "message": "Good app",
                "created_at": "2026-03-27T10:00:00",
            }
        ]

    def fake_submit_inference_feedback(**payload):
        saved_inference_calls.append(payload)
        return {"success": True, "message": "Đã ghi nhận phản hồi đúng/sai cho kết quả mô hình."}

    def fake_list_inference_feedback(limit=100):
        return [
            {
                "id": 1,
                "inference_id": "abc-123",
                "task": "classification",
                "model_name": "essay_identification",
                "predicted_label": "Nghị luận",
                "is_correct": 1,
                "correct_label": "Nghị luận",
                "created_at": "2026-03-27T10:00:00",
            }
        ]

    monkeypatch.setattr(feedback_routes.feedback_service, "submit_feedback", fake_submit_feedback)
    monkeypatch.setattr(feedback_routes.feedback_service, "list_feedback", fake_list_feedback)
    monkeypatch.setattr(feedback_routes.feedback_service, "submit_inference_feedback", fake_submit_inference_feedback)
    monkeypatch.setattr(feedback_routes.feedback_service, "list_inference_feedback", fake_list_inference_feedback)

    app = Flask(__name__)
    app.config["TESTING"] = True
    app.register_blueprint(feedback_bp, url_prefix="/api/feedback")
    return app.test_client(), saved_calls, saved_inference_calls


def test_submit_feedback_requires_message(monkeypatch):
    client, _, _ = create_feedback_client(monkeypatch)

    response = client.post("/api/feedback/submit", json={"email": "a@b.com"})

    assert response.status_code == 400
    assert response.get_json()["error"] == "Invalid request payload"


def test_submit_feedback_success(monkeypatch):
    client, saved_calls, _ = create_feedback_client(monkeypatch)

    response = client.post(
        "/api/feedback/submit",
        json={"email": "a@b.com", "message": "Useful project"},
    )

    assert response.status_code == 200
    assert response.get_json()["success"] is True
    assert saved_calls == [{"email": "a@b.com", "message": "Useful project"}]


def test_list_feedback_returns_json_list(monkeypatch):
    client, _, _ = create_feedback_client(monkeypatch)

    response = client.get("/api/feedback/list")

    assert response.status_code == 200
    data = response.get_json()
    assert isinstance(data, list)
    assert len(data) == 1
    assert data[0]["message"] == "Good app"


def test_submit_inference_feedback_success(monkeypatch):
    client, _, saved_inference_calls = create_feedback_client(monkeypatch)

    response = client.post(
        "/api/feedback/inference",
        json={
            "inference_id": "abc-123",
            "task": "classification",
            "model_name": "essay_identification",
            "input_text": "sample",
            "predicted_label": "Nghị luận",
            "is_correct": True,
            "correct_label": "Nghị luận",
            "comment": "prediction is correct",
            "metadata": {"source": "manual-review"},
        },
    )

    assert response.status_code == 200
    assert response.get_json()["success"] is True
    assert len(saved_inference_calls) == 1
    assert saved_inference_calls[0]["inference_id"] == "abc-123"


def test_list_inference_feedback_returns_json_list(monkeypatch):
    client, _, _ = create_feedback_client(monkeypatch)

    response = client.get("/api/feedback/inference/list")

    assert response.status_code == 200
    data = response.get_json()
    assert isinstance(data, list)
    assert len(data) == 1
    assert data[0]["inference_id"] == "abc-123"
