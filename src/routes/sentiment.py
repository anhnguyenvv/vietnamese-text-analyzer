from modules.sentiment.sentiment import analyze_sentiment
from database.db import record_inference_metric, save_history
from flask import Blueprint, request, jsonify, send_file
import pandas as pd
import io
from modules.classification.classification import get_classifier
from extensions import limiter
from utils.input_validation import validate_csv_upload, validate_text_input
from utils.inference_response import build_task_response, start_timer, to_export_row
from utils.ab_testing import choose_ab_variant


sentiment_bp = Blueprint('sentiment', __name__)

SUPPORTED_SENTIMENT_MODELS = {
    'sentiment',
    'vispam',
    'vispam-VisoBert',
    'vispam-Phobert',
}


def _run_sentiment_model(text, model_name):
    if model_name == 'sentiment':
        return analyze_sentiment(text), 'sentiment'

    if model_name in {'vispam', 'vispam-VisoBert'}:
        model = get_classifier(model_name='vispam-VisoBert')
        return model.classify(text, model_name='vispam-VisoBert'), 'vispam-VisoBert'

    if model_name == 'vispam-Phobert':
        model = get_classifier(model_name='vispam-Phobert')
        return model.classify(text, model_name='vispam-Phobert'), 'vispam-Phobert'

    raise ValueError(f"Unsupported model_name: {model_name}")


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
        return jsonify({"error": "No text provided"}), 400

    text, text_error = validate_text_input(data.get('text'))
    if text_error is not None:
        payload, status = text_error
        return jsonify(payload), status

    model_name = data.get('model_name', 'sentiment')
    ab_meta = None

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
        except Exception as exc:
            return jsonify({
                "error": str(exc),
                "error_code": "ab_test_configuration_failed",
            }), 400
        model_name = ab_choice["model_name"]
        ab_meta = {
            "experiment": ab_choice["experiment"],
            "variant": ab_choice["variant"],
            "allocation": ab_choice["allocation"],
        }

    request_id = request.headers.get("X-Request-ID")
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

        return jsonify(payload)
    except ValueError as exc:
        record_inference_metric(
            task="sentiment",
            model_name=model_name,
            latency_ms=0,
            is_success=False,
            ab_experiment=(ab_meta or {}).get("experiment"),
            ab_variant=(ab_meta or {}).get("variant"),
            request_id=request_id,
        )
        return jsonify({
            "error": str(exc),
            "error_code": "unsupported_model_name",
        }), 400
    except Exception as exc:
        record_inference_metric(
            task="sentiment",
            model_name=model_name,
            latency_ms=0,
            is_success=False,
            ab_experiment=(ab_meta or {}).get("experiment"),
            ab_variant=(ab_meta or {}).get("variant"),
            request_id=request_id,
        )
        return jsonify({
            "error": str(exc),
            "error_code": "sentiment_internal_error",
        }), 500

@sentiment_bp.route('/analyze-file', methods=['POST'])
@limiter.limit("5 per minute")
def analyze_file():
    file = request.files.get('file')
    df, validation_error = validate_csv_upload(file, required_columns=["text"])
    if validation_error is not None:
        payload, status = validation_error
        return jsonify(payload), status

    model_name = request.form.get('model_name', 'sentiment')
    response_format = request.form.get('format', 'csv').lower()
    inference_payloads = []

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
    text, text_error = validate_text_input(data.get('text'))
    if text_error is not None:
        payload, status = text_error
        return jsonify(payload), status

    models = data.get('models', ['vispam-Phobert', 'vispam-VisoBert'])
    if not isinstance(models, list) or len(models) != 2:
        return jsonify({"error": "models must be a list of exactly 2 model names"}), 400

    invalid_models = [model_name for model_name in models if model_name not in SUPPORTED_SENTIMENT_MODELS]
    if invalid_models:
        return jsonify({
            "error": f"Unsupported model_name: {invalid_models[0]}",
            "error_code": "unsupported_model_name",
        }), 400

    comparisons = []
    try:
        for model_name in models:
            payload = _infer_sentiment(text, model_name)
            payload['label'] = payload['result'].get('label')
            comparisons.append(payload)
    except ValueError as exc:
        return jsonify({
            "error": str(exc),
            "error_code": "unsupported_model_name",
        }), 400
    except Exception as exc:
        return jsonify({
            "error": str(exc),
            "error_code": "sentiment_internal_error",
        }), 500

    return jsonify({
        'task': 'sentiment',
        'input_text': text,
        'comparisons': comparisons,
    })