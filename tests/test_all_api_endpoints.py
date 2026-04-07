import importlib
import sys
import types

from flask import Blueprint, jsonify


ROUTE_SPECS = {
    "routes.feedback": {
        "blueprint": "feedback_bp",
        "routes": [
            ("/submit", ["POST"]),
            ("/list", ["GET"]),
            ("/inference", ["POST"]),
            ("/inference/list", ["GET"]),
        ],
    },
    "routes.preprocessing": {
        "blueprint": "preprocessing_bp",
        "routes": [
            ("/normalize", ["POST"]),
            ("/tokenize", ["POST"]),
            ("/preprocess", ["POST"]),
        ],
    },
    "routes.pos": {
        "blueprint": "pos_bp",
        "routes": [
            ("/tag", ["POST"]),
            ("/compare", ["POST"]),
        ],
    },
    "routes.ner": {
        "blueprint": "ner_bp",
        "routes": [
            ("/ner", ["POST"]),
            ("/compare", ["POST"]),
        ],
    },
    "routes.sentiment": {
        "blueprint": "sentiment_bp",
        "routes": [
            ("/analyze", ["POST"]),
            ("/analyze-file", ["POST"]),
            ("/compare", ["POST"]),
        ],
    },
    "routes.classification": {
        "blueprint": "classification_bp",
        "routes": [
            ("/analyze-file", ["POST"]),
            ("/classify", ["POST"]),
            ("/compare", ["POST"]),
        ],
    },
    "routes.summarization": {
        "blueprint": "summarization_bp",
        "routes": [
            ("/summarize", ["POST"]),
        ],
    },
    "routes.statistics": {
        "blueprint": "statistics_bp",
        "routes": [
            ("/statistics", ["GET", "POST"]),
        ],
    },
    "routes.capabilities": {
        "blueprint": "capabilities_bp",
        "routes": [
            ("/", ["GET"]),
        ],
    },
    "routes.metrics": {
        "blueprint": "metrics_bp",
        "routes": [
            ("/online", ["GET"]),
        ],
    },
    "routes.logs": {
        "blueprint": "logs_bp",
        "routes": [
            ("/system", ["GET"]),
        ],
    },
    "routes.tts": {
        "blueprint": "tts_bp",
        "routes": [
            ("/synthesize", ["POST"]),
            ("/history", ["GET"]),
            ("/history/<int:history_id>/audio", ["GET"]),
        ],
    },
}


URL_PREFIX_BY_MODULE = {
    "routes.feedback": "/api/feedback",
    "routes.preprocessing": "/api/preprocessing",
    "routes.pos": "/api/pos",
    "routes.ner": "/api/ner",
    "routes.sentiment": "/api/sentiment",
    "routes.classification": "/api/classification",
    "routes.summarization": "/api/summarization",
    "routes.statistics": "/api/statistics",
    "routes.capabilities": "/api/capabilities",
    "routes.metrics": "/api/metrics",
    "routes.logs": "/api/logs",
    "routes.tts": "/api/tts",
}


def _make_stub_route_module(module_name: str, blueprint_name: str, routes):
    module = types.ModuleType(module_name)
    blueprint = Blueprint(blueprint_name, __name__)

    for path, methods in routes:
        endpoint_name = f"{blueprint_name}_{path.strip('/').replace('/', '_').replace('<', '').replace('>', '').replace(':', '_') or 'root'}"

        def _handler(_endpoint=endpoint_name):
            return jsonify({"ok": True, "endpoint": _endpoint})

        blueprint.add_url_rule(path, endpoint=endpoint_name, view_func=_handler, methods=methods)

    setattr(module, blueprint_name, blueprint)
    return module


def test_all_registered_api_endpoints_are_reachable(monkeypatch):
    for module_name, spec in ROUTE_SPECS.items():
        monkeypatch.setitem(
            sys.modules,
            module_name,
            _make_stub_route_module(module_name, spec["blueprint"], spec["routes"]),
        )

    app_module = importlib.import_module("app")
    app_module = importlib.reload(app_module)
    monkeypatch.setattr(app_module, "save_system_log", lambda **kwargs: None)
    monkeypatch.setattr(app_module.Config, "PRELOAD_MODELS_ON_STARTUP", False)

    flask_app = app_module.create_app()
    flask_app.config["TESTING"] = True
    client = flask_app.test_client()

    all_routes = {rule.rule for rule in flask_app.url_map.iter_rules()}

    for module_name, spec in ROUTE_SPECS.items():
        prefix = URL_PREFIX_BY_MODULE[module_name]
        for route_path, methods in spec["routes"]:
            sample_path = route_path.replace("<int:history_id>", "1")
            full_path = f"{prefix}{sample_path}"
            assert full_path in all_routes

            method = methods[0]
            if method == "GET":
                response = client.get(full_path)
            else:
                response = client.post(full_path, json={})

            assert response.status_code == 200
            payload = response.get_json()
            assert payload["ok"] is True
