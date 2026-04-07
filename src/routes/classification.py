from flask import Blueprint, request, jsonify, send_file
from modules.classification.classification import get_classifier
from database.db import record_inference_metric, save_history
import pandas as pd
import io
import logging
from extensions import limiter
from utils.input_validation import validate_csv_upload, validate_text_input
from utils.inference_response import build_task_response, start_timer, to_export_row
from utils.ab_testing import choose_ab_variant
from utils.logging_utils import build_log_message

classification_bp = Blueprint('classification', __name__)
LOGGER = logging.getLogger("vta.api.classification")


def _infer_classification(text, model_name):
    classification = get_classifier(model_name)
    started_at = start_timer()
    predicted = classification.classify(
        text,
        model_name=model_name if model_name else classification.model_name
    )
    return build_task_response(
        task="classification",
        model_name=classification.model_name,
        text=text,
        result=predicted,
        started_at=started_at
    )

@classification_bp.route('/analyze-file', methods=['POST'])
@limiter.limit("5 per minute")
def analyze_file():
    file = request.files.get('file')
    df, validation_error = validate_csv_upload(file, required_columns=["text"])
    if validation_error is not None:
        LOGGER.warning(build_log_message("classification", "file_validation_failed"))
        payload, status = validation_error
        return jsonify(payload), status

    model_name = request.form.get('model_name', 'essay_identification')
    response_format = request.form.get('format', 'csv').lower()
    inference_payloads = []
    LOGGER.info(
        build_log_message(
            "classification",
            "file_request_received",
            filename=getattr(file, "filename", None),
            model_name=model_name,
            format=response_format,
        ),
    )

    for text in df['text'].astype(str):
        payload = _infer_classification(text, model_name)
        inference_payloads.append(payload)
        save_history(
            feature="classification",
            input_text=text,
            result=str(payload)
        )
    export_rows = [to_export_row(payload) for payload in inference_payloads]

    if response_format == 'json':
        LOGGER.info(build_log_message("classification", "file_request_completed_json", rows=len(export_rows)))
        return jsonify({"results": export_rows})

    export_df = pd.DataFrame(export_rows)

    output = io.StringIO()
    export_df.to_csv(output, index=False, encoding='utf-8-sig')
    output.seek(0)
    return send_file(
        io.BytesIO(output.getvalue().encode('utf-8-sig')),
        mimetype='text/csv',
        as_attachment=True,
        download_name=f"{file.filename.rsplit('.', 1)[0]}_classification_standardized.csv"
    )

@classification_bp.route('/classify', methods=['POST'])
@limiter.limit("30 per minute")
def classify():
    data = request.get_json(silent=True)
    if not data or 'text' not in data:
        LOGGER.warning(build_log_message("classification", "request_missing_text"))
        return jsonify({"error": "No text provided"}), 400

    text, text_error = validate_text_input(data.get('text'))
    if text_error is not None:
        LOGGER.warning(build_log_message("classification", "validation_failed"))
        payload, status = text_error
        return jsonify(payload), status

    model_name = data.get('model_name', "essay_identification")
    ab_meta = None

    ab_config = data.get("ab_test") or {}
    if isinstance(ab_config, dict) and ab_config.get("enabled"):
        ab_choice = choose_ab_variant(
            task="classification",
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
                "classification",
                "ab_variant_selected",
                experiment=ab_choice["experiment"],
                variant=ab_choice["variant"],
            ),
        )

    request_id = request.headers.get("X-Request-ID")
    try:
        payload = _infer_classification(text, model_name)

        # Backward-compatible fields for existing clients.
        payload["label_name"] = payload["result"].get("label")
        payload["label_id"] = payload["result"].get("label_id")
        if ab_meta is not None:
            payload["ab_test"] = ab_meta

        record_inference_metric(
            task="classification",
            model_name=payload.get("model_name"),
            latency_ms=payload.get("meta", {}).get("processing_time_ms", 0),
            is_success=True,
            confidence_score=payload.get("meta", {}).get("confidence_score"),
            ab_experiment=(ab_meta or {}).get("experiment"),
            ab_variant=(ab_meta or {}).get("variant"),
            request_id=request_id,
        )

        save_history(
            feature="classification",
            input_text=text,
            result=str(payload)
        )
        LOGGER.info(
            build_log_message("classification", "request_succeeded", request_id=request_id, model_name=payload.get("model_name")),
        )
        return jsonify(payload)
    except Exception as e:
        LOGGER.exception(
            build_log_message("classification", "request_failed", request_id=request_id, model_name=model_name),
        )
        record_inference_metric(
            task="classification",
            model_name=model_name,
            latency_ms=0,
            is_success=False,
            ab_experiment=(ab_meta or {}).get("experiment"),
            ab_variant=(ab_meta or {}).get("variant"),
            request_id=request_id,
        )
        save_history(
            feature="classification",
            input_text=text,
            result=str({"error": str(e)})
        )
        return jsonify({"error": str(e)}), 500


@classification_bp.route('/compare', methods=['POST'])
@limiter.limit("20 per minute")
def compare_models():
    data = request.get_json(silent=True) or {}
    text, text_error = validate_text_input(data.get('text'))
    if text_error is not None:
        LOGGER.warning(build_log_message("classification", "compare_validation_failed"))
        payload, status = text_error
        return jsonify(payload), status

    models = data.get('models', ['essay_identification', 'topic_classification'])
    if not isinstance(models, list) or len(models) != 2:
        LOGGER.warning(build_log_message("classification", "compare_invalid_models"))
        return jsonify({"error": "models must be a list of exactly 2 model names"}), 400

    LOGGER.info(build_log_message("classification", "compare_request_received", models=models))
    results = []
    for model_name in models:
        payload = _infer_classification(text, model_name)
        payload["label_name"] = payload["result"].get("label")
        payload["label_id"] = payload["result"].get("label_id")
        results.append(payload)

    return jsonify({
        "task": "classification",
        "input_text": text,
        "comparisons": results
    })