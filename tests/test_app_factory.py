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


def test_create_app_registers_prefixed_blueprints(monkeypatch):
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
    all_routes = {rule.rule for rule in flask_app.url_map.iter_rules()}

    assert flask_app.config["JSON_AS_ASCII"] is False
    assert "/api/feedback/ping" in all_routes
    assert "/api/preprocessing/ping" in all_routes
    assert "/api/pos/ping" in all_routes
    assert "/api/ner/ping" in all_routes
    assert "/api/sentiment/ping" in all_routes
    assert "/api/classification/ping" in all_routes
    assert "/api/summarization/ping" in all_routes
    assert "/api/statistics/ping" in all_routes
    assert "/api/metrics/ping" in all_routes


def test_root_returns_501_when_frontend_build_missing(monkeypatch):
    for module_name, blueprint_name in ROUTE_BLUEPRINTS.items():
        monkeypatch.setitem(
            sys.modules,
            module_name,
            _make_stub_route_module(module_name, blueprint_name),
        )

    app_module = importlib.import_module("app")
    app_module = importlib.reload(app_module)
    monkeypatch.setattr(app_module, "save_system_log", lambda **kwargs: None)

    original_exists = app_module.os.path.exists

    def fake_exists(path):
        # Force-mock missing frontend build index regardless local machine state.
        if str(path).endswith("index.html"):
            return False
        return original_exists(path)

    monkeypatch.setattr(app_module.os.path, "exists", fake_exists)

    flask_app = app_module.create_app()
    flask_app.config["TESTING"] = True
    client = flask_app.test_client()

    response = client.get("/")

    assert response.status_code == 501
    assert "error" in response.get_json()
