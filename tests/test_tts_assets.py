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


def test_tts_model_assets_are_served(monkeypatch):
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

    response = client.get("/model/tts/config.json")

    assert response.status_code == 200
    assert response.mimetype == "application/json"
    assert b"phoneme_id_map" in response.data