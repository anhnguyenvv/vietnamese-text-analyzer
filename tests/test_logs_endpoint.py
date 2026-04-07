import importlib
import sys
import types

from flask import Blueprint, jsonify


ROUTE_BLUEPRINTS = {
    "routes.feedback": "feedback_bp",
    "routes.preprocessing": "preprocessing_bp",
    "routes.pos": "pos_bp",
    "routes.ner": "ner_bp",
    "routes.sentiment": "sentiment_bp",
    "routes.classification": "classification_bp",
    "routes.summarization": "summarization_bp",
    "routes.statistics": "statistics_bp",
    "routes.metrics": "metrics_bp",
    "routes.logs": "logs_bp",
    "routes.model_preload": "model_preload_bp",
    "routes.tts": "tts_bp",
}


def _make_stub_route_module(module_name: str, blueprint_name: str) -> types.ModuleType:
    module = types.ModuleType(module_name)
    blueprint = Blueprint(blueprint_name, __name__)

    @blueprint.route("/ping", methods=["GET"])
    def ping():
        return jsonify({"ok": True})

    setattr(module, blueprint_name, blueprint)
    return module


def test_system_logs_endpoint_returns_rows(monkeypatch):
    for module_name, blueprint_name in ROUTE_BLUEPRINTS.items():
        monkeypatch.setitem(
            sys.modules,
            module_name,
            _make_stub_route_module(module_name, blueprint_name),
        )

    app_module = importlib.import_module("app")
    app_module = importlib.reload(app_module)
    monkeypatch.setattr(app_module, "save_system_log", lambda **kwargs: None)
    monkeypatch.setattr(
        app_module,
        "load_system_log",
        lambda limit=100: [
            {
                "id": 1,
                "level": "INFO",
                "message": "vta component=request event=completed",
                "module": "request",
                "created_at": "2026-04-07T00:00:00",
            }
        ],
    )

    flask_app = app_module.create_app()
    flask_app.config["TESTING"] = True
    client = flask_app.test_client()

    response = client.get("/api/logs/system?limit=1")

    assert response.status_code == 200
    data = response.get_json()
    assert isinstance(data, list)
    assert data[0]["module"] == "request"
    assert "vta component=request event=completed" in data[0]["message"]


def test_system_logs_endpoint_rejects_bad_limit(monkeypatch):
    for module_name, blueprint_name in ROUTE_BLUEPRINTS.items():
        monkeypatch.setitem(
            sys.modules,
            module_name,
            _make_stub_route_module(module_name, blueprint_name),
        )

    app_module = importlib.import_module("app")
    app_module = importlib.reload(app_module)
    monkeypatch.setattr(app_module, "save_system_log", lambda **kwargs: None)

    flask_app = app_module.create_app()
    flask_app.config["TESTING"] = True
    client = flask_app.test_client()

    response = client.get("/api/logs/system?limit=abc")

    assert response.status_code == 400
    assert response.get_json()["error"] == "limit must be an integer"


def test_request_logs_endpoint_returns_matching_rows(monkeypatch):
    for module_name, blueprint_name in ROUTE_BLUEPRINTS.items():
        monkeypatch.setitem(
            sys.modules,
            module_name,
            _make_stub_route_module(module_name, blueprint_name),
        )

    app_module = importlib.import_module("app")
    app_module = importlib.reload(app_module)
    monkeypatch.setattr(app_module, "save_system_log", lambda **kwargs: None)
    monkeypatch.setattr(app_module, "load_system_log", lambda limit=100: [])

    from routes import logs as logs_routes

    monkeypatch.setattr(
        logs_routes,
        "load_system_log_by_request_id",
        lambda request_id, limit=100: [
            {
                "id": 11,
                "level": "INFO",
                "message": f"vta component=request event=received request_id={request_id} path=/api/sentiment/analyze",
                "module": "request",
                "created_at": "2026-04-08T10:00:00",
            },
            {
                "id": 12,
                "level": "ERROR",
                "message": f"vta component=sentiment event=request_failed request_id={request_id} error_code=sentiment_internal_error",
                "module": "sentiment",
                "created_at": "2026-04-08T10:00:01",
            },
        ],
    )

    flask_app = app_module.create_app()
    flask_app.config["TESTING"] = True
    client = flask_app.test_client()

    response = client.get("/api/logs/request/abc-123?limit=2")

    assert response.status_code == 200
    payload = response.get_json()
    assert isinstance(payload, list)
    assert len(payload) == 2
    assert all("abc-123" in row["message"] for row in payload)


def test_request_logs_endpoint_rejects_missing_request_id(monkeypatch):
    for module_name, blueprint_name in ROUTE_BLUEPRINTS.items():
        monkeypatch.setitem(
            sys.modules,
            module_name,
            _make_stub_route_module(module_name, blueprint_name),
        )

    app_module = importlib.import_module("app")
    app_module = importlib.reload(app_module)
    monkeypatch.setattr(app_module, "save_system_log", lambda **kwargs: None)

    flask_app = app_module.create_app()
    flask_app.config["TESTING"] = True
    client = flask_app.test_client()

    response = client.get("/api/logs/request/   ?limit=2")

    assert response.status_code == 400
    assert response.get_json()["error"] == "request_id is required"
