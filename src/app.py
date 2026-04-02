from flask import Flask, request, jsonify, g, Response, send_from_directory
from routes.preprocessing import preprocessing_bp
from routes.pos import pos_bp
from routes.ner import ner_bp
from routes.sentiment import sentiment_bp
from routes.classification import classification_bp
from routes.summarization import summarization_bp
from routes.statistics import statistics_bp
from routes.capabilities import capabilities_bp
from routes.metrics import metrics_bp
from routes.tts import tts_bp
from flask_cors import CORS
from routes.feedback import feedback_bp
from extensions import limiter
import logging
import importlib
import os
import json
import uuid
from datetime import datetime, UTC
from time import perf_counter
from config.settings import Config
logging.getLogger("transformers.modeling_utils").setLevel(logging.ERROR)

from database.db import save_system_log  
from database.db import get_online_metrics_summary
try:
    _prometheus_client = importlib.import_module("prometheus_client")
    CollectorRegistry = _prometheus_client.CollectorRegistry
    CONTENT_TYPE_LATEST = _prometheus_client.CONTENT_TYPE_LATEST
    Counter = _prometheus_client.Counter
    Gauge = _prometheus_client.Gauge
    Histogram = _prometheus_client.Histogram
    generate_latest = _prometheus_client.generate_latest
except Exception:  # pragma: no cover - fallback for environments without the optional dependency.
    CollectorRegistry = None
    CONTENT_TYPE_LATEST = "text/plain; version=0.0.4; charset=utf-8"

    class _NoOpMetric:
        def labels(self, **_kwargs):
            return self

        def inc(self, _amount=1):
            return None

        def observe(self, _value):
            return None

        def set(self, _value):
            return None

    class _NoOpMetricFamily(_NoOpMetric):
        def __init__(self, *args, **kwargs):
            pass

    Counter = Gauge = Histogram = _NoOpMetricFamily

    def generate_latest(_registry):
        return (
            b"# Prometheus client not installed\n"
            b"# HELP vta_http_requests_total Total HTTP requests processed by the API.\n"
            b"# TYPE vta_http_requests_total counter\n"
            b"vta_http_requests_total 0\n"
            b"# HELP vta_inference_requests_total Total inference requests recorded in SQLite.\n"
            b"# TYPE vta_inference_requests_total gauge\n"
            b"vta_inference_requests_total 0\n"
        )


PROMETHEUS_REGISTRY = CollectorRegistry() if CollectorRegistry is not None else None
HTTP_REQUESTS_TOTAL = Counter(
    "vta_http_requests_total",
    "Total HTTP requests processed by the API.",
    ["method", "endpoint", "status_code"],
    registry=PROMETHEUS_REGISTRY,
)
HTTP_REQUEST_DURATION_SECONDS = Histogram(
    "vta_http_request_duration_seconds",
    "HTTP request duration in seconds.",
    ["method", "endpoint"],
    registry=PROMETHEUS_REGISTRY,
)
INFERENCE_REQUESTS_TOTAL = Gauge(
    "vta_inference_requests_total",
    "Total inference requests recorded in SQLite.",
    registry=PROMETHEUS_REGISTRY,
)
INFERENCE_SUCCESS_RATE = Gauge(
    "vta_inference_success_rate",
    "Success rate for recent inference requests.",
    registry=PROMETHEUS_REGISTRY,
)
INFERENCE_ERROR_RATE = Gauge(
    "vta_inference_error_rate",
    "Error rate for recent inference requests.",
    registry=PROMETHEUS_REGISTRY,
)
INFERENCE_AVG_LATENCY_MS = Gauge(
    "vta_inference_avg_latency_ms",
    "Average inference latency in milliseconds.",
    registry=PROMETHEUS_REGISTRY,
)
INFERENCE_AVG_CONFIDENCE = Gauge(
    "vta_inference_avg_confidence",
    "Average model confidence for recent inference requests.",
    registry=PROMETHEUS_REGISTRY,
)
INFERENCE_REQUESTS_BY_TASK = Gauge(
    "vta_inference_requests_by_task",
    "Recent inference requests grouped by task.",
    ["task"],
    registry=PROMETHEUS_REGISTRY,
)
INFERENCE_ERRORS_BY_TASK = Gauge(
    "vta_inference_errors_by_task",
    "Recent inference errors grouped by task.",
    ["task"],
    registry=PROMETHEUS_REGISTRY,
)
INFERENCE_AVG_LATENCY_BY_TASK_MS = Gauge(
    "vta_inference_avg_latency_by_task_ms",
    "Recent average inference latency by task.",
    ["task"],
    registry=PROMETHEUS_REGISTRY,
)
INFERENCE_AVG_CONFIDENCE_BY_TASK = Gauge(
    "vta_inference_avg_confidence_by_task",
    "Recent average inference confidence by task.",
    ["task"],
    registry=PROMETHEUS_REGISTRY,
)


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


def _collect_prometheus_business_metrics() -> None:
    if PROMETHEUS_REGISTRY is None:
        return

    summary = get_online_metrics_summary(limit=1000)
    total_requests = summary.get("total_requests", 0)
    error_rate = summary.get("error_rate", 0)
    avg_latency_ms = summary.get("avg_latency_ms", 0)
    avg_confidence = summary.get("avg_confidence", 0)

    INFERENCE_REQUESTS_TOTAL.set(total_requests)
    INFERENCE_ERROR_RATE.set(error_rate)
    INFERENCE_SUCCESS_RATE.set(max(0, 1 - error_rate))
    INFERENCE_AVG_LATENCY_MS.set(avg_latency_ms)
    INFERENCE_AVG_CONFIDENCE.set(avg_confidence)

    task_totals = summary.get("by_task", {}) or {}
    for task_name, task_summary in task_totals.items():
        INFERENCE_REQUESTS_BY_TASK.labels(task=task_name).set(task_summary.get("total_requests", 0))
        INFERENCE_ERRORS_BY_TASK.labels(task=task_name).set(
            round(task_summary.get("error_rate", 0) * task_summary.get("total_requests", 0), 4)
        )
        INFERENCE_AVG_LATENCY_BY_TASK_MS.labels(task=task_name).set(task_summary.get("avg_latency_ms", 0))
        INFERENCE_AVG_CONFIDENCE_BY_TASK.labels(task=task_name).set(task_summary.get("avg_confidence", 0))

def create_app():
    app = Flask(__name__, static_folder="../front-end/build", static_url_path="/")
    CORS(app)
    limiter.init_app(app)
    api_logger = configure_structured_logging()
    app.config['JSON_AS_ASCII'] = False  # To handle Vietnamese characters correctly

    @app.before_request
    def attach_request_id():
        g.request_id = str(uuid.uuid4())
        g.request_started_at = perf_counter()

    @app.route("/metrics", methods=["GET"])
    def prometheus_metrics():
        _collect_prometheus_business_metrics()
        payload = generate_latest(PROMETHEUS_REGISTRY)
        return Response(payload, mimetype=CONTENT_TYPE_LATEST)

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
    app.register_blueprint(tts_bp, url_prefix='/api/tts')

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
        started_at = getattr(g, "request_started_at", None)
        endpoint = request.url_rule.rule if request.url_rule is not None else "unmatched"
        duration_seconds = max(perf_counter() - started_at, 0) if started_at is not None else 0

        HTTP_REQUESTS_TOTAL.labels(
            method=request.method,
            endpoint=endpoint,
            status_code=str(response.status_code),
        ).inc()
        HTTP_REQUEST_DURATION_SECONDS.labels(
            method=request.method,
            endpoint=endpoint,
        ).observe(duration_seconds)

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