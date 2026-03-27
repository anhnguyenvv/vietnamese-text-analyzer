from flask import Flask, request, jsonify, g
from routes.preprocessing import preprocessing_bp
from routes.pos import pos_bp
from routes.ner import ner_bp
from routes.sentiment import sentiment_bp
from routes.classification import classification_bp
from routes.summarization import summarization_bp
from routes.statistics import statistics_bp
from routes.capabilities import capabilities_bp
from routes.metrics import metrics_bp
from flask_cors import CORS
from routes.feedback import feedback_bp
from extensions import limiter
import logging
import os
import json
import uuid
from datetime import datetime, UTC
from config.settings import Config
from utils.model_warmup import warmup_models
logging.getLogger("transformers.modeling_utils").setLevel(logging.ERROR)

from database.db import save_system_log  
from flask import send_from_directory


class JsonFormatter(logging.Formatter):
    """Simple JSON formatter for structured backend logs."""

    def format(self, record):
        payload = {
            "timestamp": datetime.now(UTC).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        if hasattr(record, "request_id"):
            payload["request_id"] = record.request_id
        if hasattr(record, "path"):
            payload["path"] = record.path
        if hasattr(record, "method"):
            payload["method"] = record.method
        if hasattr(record, "status_code"):
            payload["status_code"] = record.status_code

        return json.dumps(payload, ensure_ascii=False)


def configure_structured_logging() -> logging.Logger:
    logger = logging.getLogger("vta.api")
    logger.setLevel(logging.INFO)
    logger.propagate = False

    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(JsonFormatter())
        logger.addHandler(handler)

    return logger

def log_to_db(level, message, module="system"):
    try:
        save_system_log(level=level, message=message, module=module)
    except Exception as e:
        print("Log DB error:", e)

def create_app():
    app = Flask(__name__, static_folder="../front-end/build", static_url_path="/")
    CORS(app)
    limiter.init_app(app)
    api_logger = configure_structured_logging()
    app.config['JSON_AS_ASCII'] = False  # To handle Vietnamese characters correctly

    @app.before_request
    def attach_request_id():
        g.request_id = str(uuid.uuid4())

    @app.errorhandler(429)
    def ratelimit_handler(_):
        return jsonify({"error": "Too many requests. Please try again later."}), 429

    # Register blueprints
    app.register_blueprint(feedback_bp, url_prefix='/api/feedback')
    app.register_blueprint(preprocessing_bp, url_prefix='/api/preprocessing')
    app.register_blueprint(pos_bp, url_prefix='/api/pos')
    app.register_blueprint(ner_bp, url_prefix='/api/ner')
    app.register_blueprint(sentiment_bp, url_prefix='/api/sentiment')
    app.register_blueprint(classification_bp, url_prefix='/api/classification')
    app.register_blueprint(summarization_bp, url_prefix='/api/summarization')
    app.register_blueprint(statistics_bp, url_prefix='/api/statistics')
    app.register_blueprint(capabilities_bp, url_prefix='/api/capabilities')
    app.register_blueprint(metrics_bp, url_prefix='/api/metrics')

    if Config.PRELOAD_MODELS_ON_STARTUP:
        warmup_summary = warmup_models(
            model_names=Config.PRELOAD_MODELS,
            logger=api_logger,
            fail_fast=Config.PRELOAD_FAIL_FAST,
        )
        api_logger.info(
            "model_preload_summary",
            extra={
                "request_id": "startup",
                "path": "startup",
                "method": "BOOT",
                "status_code": 200 if not warmup_summary["failed"] else 207,
            },
        )

    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve_react(path):
        build_dir = app.static_folder
        index_path = os.path.join(build_dir, "index.html")
        if not os.path.exists(index_path):
            return jsonify({"error": "Frontend is not built yet. Please run 'npm run build' in the front-end directory."}), 501
        if path != "" and os.path.exists(os.path.join(build_dir, path)):
            return send_from_directory(build_dir, path)
        return send_from_directory(build_dir, "index.html")
    @app.after_request
    def after_request(response):
        request_id = getattr(g, "request_id", "")

        api_logger.info(
            "request_completed",
            extra={
                "request_id": request_id,
                "path": request.path,
                "method": request.method,
                "status_code": response.status_code,
            },
        )

        log_to_db(
            level="INFO",
            message=f"request_id={request_id} {request.method} {request.path} - {response.status_code}",
            module="request"
        )

        response.headers["X-Request-ID"] = request_id
        return response
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=False, host='0.0.0.0', port=5000)