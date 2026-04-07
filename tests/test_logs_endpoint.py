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

    from routes import logs as logs_routes

    monkeypatch.setattr(
        logs_routes,
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

