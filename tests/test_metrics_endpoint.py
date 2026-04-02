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


def test_metrics_endpoint_exposes_prometheus_payload(monkeypatch):
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
        "get_online_metrics_summary",
        lambda limit=1000: {
            "total_requests": 3,
            "avg_latency_ms": 12.5,
            "error_rate": 0.25,
            "avg_confidence": 0.9,
            "by_task": {
                "classification": {
                    "total_requests": 2,
                    "avg_latency_ms": 10.0,
                    "error_rate": 0.5,
                    "avg_confidence": 0.85,
                }
            },
        },
    )

    flask_app = app_module.create_app()
    flask_app.config["TESTING"] = True
    client = flask_app.test_client()

    response = client.get("/metrics")

    assert response.status_code == 200
    assert response.mimetype == "text/plain"
    assert b"vta_http_requests_total" in response.data
    assert b"vta_inference_requests_total" in response.data
