from modules.sentiment.sentiment import analyze_sentiment
from database.db import record_inference_metric, save_history
from flask import Blueprint, request, jsonify, send_file
import pandas as pd
import io
import logging
from modules.classification.classification import get_classifier
from extensions import limiter
from utils.input_validation import validate_csv_upload, validate_text_input
from utils.inference_response import build_task_response, start_timer, to_export_row
from utils.ab_testing import choose_ab_variant
from utils.logging_utils import build_log_message


sentiment_bp = Blueprint('sentiment', __name__)
LOGGER = logging.getLogger("vta.api.sentiment")


class UnsupportedModelError(ValueError):
    pass


def _preview_text(text, limit=180):
    if text is None:
        return ""
    normalized = str(text).replace("\n", " ").replace("\r", " ").strip()
    if len(normalized) <= limit:
        return normalized
    return f"{normalized[:limit]}..."


def _run_sentiment_model(text, model_name):
    if model_name == 'sentiment':
        return analyze_sentiment(text), 'sentiment'

    if model_name in {'vispam', 'vispam-VisoBert'}:
        model = get_classifier(model_name='vispam-VisoBert')
        return model.classify(text, model_name='vispam-VisoBert'), 'vispam-VisoBert'

    if model_name == 'vispam-Phobert':
        model = get_classifier(model_name='vispam-Phobert')
        return model.classify(text, model_name='vispam-Phobert'), 'vispam-Phobert'

    raise UnsupportedModelError(f"Unsupported model_name: {model_name}")


def _is_supported_model_name(model_name):
    return model_name in {'sentiment', 'vispam', 'vispam-VisoBert', 'vispam-Phobert'}


def _infer_sentiment(text, model_name):
    started_at = start_timer()
    result, resolved_model_name = _run_sentiment_model(text, model_name)
    return build_task_response(
        task="sentiment",
        model_name=resolved_model_name,
        text=text,
        result=result,
        started_at=started_at
    )

@sentiment_bp.route('/analyze', methods=['POST'])
@limiter.limit("30 per minute")
def analyze():
    data = request.get_json(silent=True)
    if not data or 'text' not in data:
        LOGGER.warning(build_log_message("sentiment", "request_missing_text"))
        return jsonify({"error": "No text provided"}), 400

    text, text_error = validate_text_input(data.get('text'))
    if text_error is not None:
        LOGGER.warning(build_log_message("sentiment", "validation_failed"))
        payload, status = text_error
        return jsonify(payload), status

    model_name = data.get('model_name', 'sentiment')
    ab_meta = None
    request_id = request.headers.get("X-Request-ID")
    LOGGER.info(
        build_log_message(
            "sentiment",
            "request_received",
            path=request.path,
            method=request.method,
            request_id=request_id,
            model_name=model_name,
            text_length=len(text),
        ),
    )

    ab_config = data.get("ab_test") or {}
    if isinstance(ab_config, dict) and ab_config.get("enabled"):
        try:
            ab_choice = choose_ab_variant(
                task="sentiment",
                input_text=text,
                models=ab_config.get("models", [model_name, model_name]),
                client_id=ab_config.get("client_id"),
                experiment_name=ab_config.get("experiment_name"),
            )
            model_name = ab_choice["model_name"]
            ab_meta = {
                "experiment": ab_choice["experiment"],
                "variant": ab_choice["variant"],
                "allocation": ab_choice["allocation"],
            }
            LOGGER.info(
                build_log_message(
                    "sentiment",
                    "ab_variant_selected",
                    variant=ab_choice["variant"],
                    experiment=ab_choice["experiment"],
                ),
            )
        except Exception as exc:
            LOGGER.exception(
                build_log_message(
                    "sentiment",
                    "ab_variant_selection_failed",
                    error=str(exc),
                    request_id=request_id,
                    model_name=model_name,
                    text_preview=_preview_text(text),
                    ab_enabled=True,
                )
            )
            return jsonify({"error": f"A/B test configuration failed: {exc}", "error_code": "ab_test_configuration_failed"}), 400

    try:
        payload = _infer_sentiment(text, model_name)
        # Backward-compatible fields for existing clients.
        payload['label'] = payload['result'].get('label')
        if ab_meta is not None:
            payload['ab_test'] = ab_meta

        record_inference_metric(
            task="sentiment",
            model_name=payload.get("model_name"),
            latency_ms=payload.get("meta", {}).get("processing_time_ms", 0),
            is_success=True,
            confidence_score=payload.get("meta", {}).get("confidence_score"),
            ab_experiment=(ab_meta or {}).get("experiment"),
            ab_variant=(ab_meta or {}).get("variant"),
            request_id=request_id,
        )

        save_history(
            feature="sentiment",
            input_text=text,
            result=str(payload)
        )

        LOGGER.info(
            build_log_message(
                "sentiment",
                "request_succeeded",
                model_name=payload.get("model_name"),
                request_id=request_id,
            ),
        )

        return jsonify(payload)
    except UnsupportedModelError as exc:
        LOGGER.warning(
            build_log_message(
                "sentiment",
                "unsupported_model",
                model_name=model_name,
                request_id=request_id,
                error=str(exc),
                error_code="unsupported_model_name",
                text_preview=_preview_text(text),
            )
        )
        return jsonify({"error": str(exc), "error_code": "unsupported_model_name"}), 400
    except Exception as exc:
        LOGGER.exception(
            build_log_message(
                "sentiment",
                "request_failed",
                request_id=request_id,
                model_name=model_name,
                error=str(exc),
                error_code="sentiment_internal_error",
                text_preview=_preview_text(text),
                text_length=len(text),
                ab_experiment=(ab_meta or {}).get("experiment"),
                ab_variant=(ab_meta or {}).get("variant"),
            ),
        )
        record_inference_metric(
            task="sentiment",
            model_name=model_name,
            latency_ms=0,
            is_success=False,
            ab_experiment=(ab_meta or {}).get("experiment"),
            ab_variant=(ab_meta or {}).get("variant"),
            request_id=request_id,
        )
        return jsonify({"error": str(exc), "error_code": "sentiment_internal_error"}), 500

@sentiment_bp.route('/analyze-file', methods=['POST'])
@limiter.limit("5 per minute")
def analyze_file():
    file = request.files.get('file')
    df, validation_error = validate_csv_upload(file, required_columns=["text"])
    if validation_error is not None:
        LOGGER.warning(build_log_message("sentiment", "file_validation_failed"))
        payload, status = validation_error
        return jsonify(payload), status

    model_name = request.form.get('model_name', 'sentiment')
    response_format = request.form.get('format', 'csv').lower()
    inference_payloads = []
    LOGGER.info(
        build_log_message("sentiment", "file_request_received", filename=getattr(file, "filename", None), format=response_format),
    )

    for text in df['text'].astype(str):
        payload = _infer_sentiment(text, model_name)
        inference_payloads.append(payload)
        save_history(
            feature="sentiment",
            input_text=text,
            result=str(payload)
        )
    export_rows = [to_export_row(payload) for payload in inference_payloads]

    if response_format == 'json':
        LOGGER.info(build_log_message("sentiment", "file_request_completed_json", rows=len(export_rows)))
        return jsonify({"results": export_rows})

    export_df = pd.DataFrame(export_rows)
    output = io.StringIO()
    export_df.to_csv(output, index=False, encoding='utf-8-sig')
    output.seek(0)
    return send_file(
        io.BytesIO(output.getvalue().encode('utf-8-sig')),
        mimetype='text/csv',
        as_attachment=True,
        download_name='sentiment_standardized.csv'
    )


@sentiment_bp.route('/compare', methods=['POST'])
@limiter.limit("20 per minute")
def compare_models():
    data = request.get_json(silent=True) or {}
    request_id = request.headers.get("X-Request-ID")
    text, text_error = validate_text_input(data.get('text'))
    if text_error is not None:
        LOGGER.warning(build_log_message("sentiment", "compare_validation_failed"))
        payload, status = text_error
        return jsonify(payload), status

    models = data.get('models', ['vispam-Phobert', 'vispam-VisoBert'])
    if not isinstance(models, list) or len(models) != 2:
        LOGGER.warning(build_log_message("sentiment", "compare_invalid_models"))
        return jsonify({"error": "models must be a list of exactly 2 model names"}), 400

    unsupported_models = [model_name for model_name in models if not _is_supported_model_name(model_name)]
    if unsupported_models:
        unsupported_model = unsupported_models[0]
        LOGGER.warning(
            build_log_message(
                "sentiment",
                "compare_unsupported_model",
                request_id=request_id,
                model_name=unsupported_model,
                error_code="unsupported_model_name",
                models=models,
            )
        )
        return jsonify({"error": f"Unsupported model_name: {unsupported_model}", "error_code": "unsupported_model_name"}), 400

    LOGGER.info(
        build_log_message(
            "sentiment",
            "compare_request_received",
            models=models,
            request_id=request_id,
            text_length=len(text),
        )
    )
    comparisons = []
    try:
        for model_name in models:
            payload = _infer_sentiment(text, model_name)
            payload['label'] = payload['result'].get('label')
            comparisons.append(payload)
    except UnsupportedModelError as exc:
        LOGGER.warning(
            build_log_message(
                "sentiment",
                "compare_unsupported_model",
                error=str(exc),
                request_id=request_id,
                error_code="unsupported_model_name",
                text_preview=_preview_text(text),
                models=models,
            )
        )
        return jsonify({"error": str(exc), "error_code": "unsupported_model_name"}), 400
    except Exception as exc:
        LOGGER.exception(
            build_log_message(
                "sentiment",
                "compare_request_failed",
                error=str(exc),
                request_id=request_id,
                error_code="sentiment_internal_error",
                text_preview=_preview_text(text),
                models=models,
            )
        )
        return jsonify({"error": str(exc), "error_code": "sentiment_internal_error"}), 500

    return jsonify({
        'task': 'sentiment',
        'comparisons': comparisons,
    })


