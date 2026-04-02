from flask import Blueprint, jsonify


capabilities_bp = Blueprint("capabilities", __name__)


@capabilities_bp.route("/", methods=["GET"])
def list_capabilities():
    return jsonify(
        {
            "project": "vietnamese-text-analyzer",
            "version": "1.0",
            "tasks": [
                {
                    "name": "preprocessing",
                    "endpoints": [
                        "/api/preprocessing/normalize",
                        "/api/preprocessing/tokenize",
                        "/api/preprocessing/preprocess",
                    ],
                    "rate_limit": "60 per minute",
                },
                {
                    "name": "pos",
                    "endpoints": ["/api/pos/tag", "/api/pos/compare"],
                    "rate_limit": {
                        "tag": "40 per minute",
                        "compare": "20 per minute",
                    },
                    "models": ["underthesea", "vncorenlp"],
                },
                {
                    "name": "ner",
                    "endpoints": ["/api/ner/ner", "/api/ner/compare"],
                    "rate_limit": {
                        "tag": "40 per minute",
                        "compare": "20 per minute",
                    },
                    "models": ["underthesea", "vncorenlp"],
                },
                {
                    "name": "sentiment",
                    "endpoints": [
                        "/api/sentiment/analyze",
                        "/api/sentiment/analyze-file",
                        "/api/sentiment/compare",
                    ],
                    "rate_limit": {
                        "text": "30 per minute",
                        "file": "5 per minute",
                        "compare": "20 per minute",
                    },
                    "models": ["sentiment", "vispam-Phobert", "vispam-VisoBert"],
                    "ab_testing": {
                        "supported": True,
                        "request_field": "ab_test",
                        "required_keys": ["enabled", "models", "client_id", "experiment_name"],
                    },
                },
                {
                    "name": "classification",
                    "endpoints": [
                        "/api/classification/classify",
                        "/api/classification/analyze-file",
                        "/api/classification/compare",
                    ],
                    "rate_limit": {
                        "text": "30 per minute",
                        "file": "5 per minute",
                        "compare": "20 per minute",
                    },
                    "models": ["essay_identification", "topic_classification"],
                    "ab_testing": {
                        "supported": True,
                        "request_field": "ab_test",
                        "required_keys": ["enabled", "models", "client_id", "experiment_name"],
                    },
                },
                {
                    "name": "summarization",
                    "endpoints": ["/api/summarization/summarize"],
                    "rate_limit": "20 per minute",
                },
                {
                    "name": "text_to_speech",
                    "endpoints": ["/api/tts/synthesize"],
                    "rate_limit": "20 per minute",
                    "options": {
                        "lang": ["vi", "en"],
                        "slow": [True, False],
                    },
                },
                {
                    "name": "statistics",
                    "endpoints": ["/api/statistics/statistics"],
                    "rate_limit": "20 per minute",
                },
            ],
            "validation": {
                "max_text_length": 20000,
                "file_upload": {
                    "allowed_type": [".csv"],
                    "required_encoding": ["utf-8", "utf-8-sig"],
                    "max_size_mb": 5,
                    "max_rows": 5000,
                },
            },
            "response_contract": {
                "single_inference": {
                    "fields": ["task", "model_name", "input", "result", "meta"],
                    "meta": ["confidence_score", "processing_time_ms", "token_count", "warnings"],
                },
                "standardized_export": {
                    "fields": [
                        "task",
                        "input_text",
                        "model_name",
                        "prediction_label",
                        "prediction_id",
                        "confidence_score",
                        "processing_time_ms",
                        "token_count",
                        "warnings",
                        "result_json",
                    ],
                    "supported_formats": ["csv", "json"],
                },
            },
            "observability": {
                "online_metrics_endpoint": "/api/metrics/online?limit=1000",
                "metrics": ["avg_latency_ms", "error_rate", "avg_confidence", "by_task"],
            },
            "verification_feedback": {
                "submit": "/api/feedback/inference",
                "list": "/api/feedback/inference/list",
                "fields": [
                    "inference_id",
                    "task",
                    "model_name",
                    "predicted_label",
                    "is_correct",
                    "correct_label",
                    "comment",
                    "metadata",
                ],
            },
        }
    )
