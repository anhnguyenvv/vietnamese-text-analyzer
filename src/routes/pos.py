import logging

from flask import Blueprint, request, jsonify
from modules.pos_ner.pos_ner import pos_tagging as tag_text
from modules.preprocessing import preprocess_text
from extensions import limiter
from utils.input_validation import validate_text_input
from collections import Counter
from utils.logging_utils import build_log_message


pos_bp = Blueprint('pos', __name__)
LOGGER = logging.getLogger("vta.api.pos")


def _compare_tag_outputs(vncorenlp_result, underthesea_result):
    vn_counter = Counter(tuple(item) for item in vncorenlp_result)
    ud_counter = Counter(tuple(item) for item in underthesea_result)
    common = vn_counter & ud_counter
    matched = sum(common.values())
    base = max(len(vncorenlp_result), len(underthesea_result), 1)
    return {
        "vncorenlp_count": len(vncorenlp_result),
        "underthesea_count": len(underthesea_result),
        "matched_pairs": matched,
        "agreement_rate": round(matched / base, 4),
    }

@pos_bp.route('/tag', methods=['POST'])
@limiter.limit("40 per minute")
def tag():
    data = request.get_json(silent=True) or {}
    text, text_error = validate_text_input(data.get('text'))
    if text_error is not None:
        LOGGER.warning(build_log_message("pos", "tag_validation_failed"))
        payload, status = text_error
        return jsonify(payload), status

    model = data.get('model', 'underthesea')

    text = preprocess_text(text, remove_icon=True)
    if not text:
        LOGGER.warning(build_log_message("pos", "tag_empty_text"))
        return jsonify({"error": "No text provided"}), 400
    LOGGER.info(
        build_log_message("pos", "tag_request_received", model=model, text_length=len(text)),
    )
    if model == "underthesea":
        result = tag_text(text, model = "underthesea")
    elif model == "vncorenlp":
        result = tag_text(text, model = "vncorenlp")
    else:
        LOGGER.warning(build_log_message("pos", "tag_invalid_model", model=model))
        return jsonify({"error": "Invalid model specified"}), 400

    LOGGER.info(build_log_message("pos", "tag_request_succeeded", model=model, tag_count=len(result)))
    return jsonify({"result": result})


@pos_bp.route('/compare', methods=['POST'])
@limiter.limit("20 per minute")
def compare_pos_models():
    data = request.get_json(silent=True) or {}
    text, text_error = validate_text_input(data.get('text'))
    if text_error is not None:
        LOGGER.warning(build_log_message("pos", "compare_validation_failed"))
        payload, status = text_error
        return jsonify(payload), status

    text = preprocess_text(text, remove_icon=True)
    if not text:
        LOGGER.warning(build_log_message("pos", "compare_empty_text"))
        return jsonify({"error": "No text provided"}), 400

    LOGGER.info(build_log_message("pos", "compare_request_received", text_length=len(text)))
    vn_result = tag_text(text, model="vncorenlp")
    underthesea_result = tag_text(text, model="underthesea")
    summary = _compare_tag_outputs(vn_result, underthesea_result)

    LOGGER.info(build_log_message("pos", "compare_request_succeeded", vncorenlp_count=summary["vncorenlp_count"], underthesea_count=summary["underthesea_count"]))

    return jsonify(
        {
            "task": "pos",
            "input_text": text,
            "models": {
                "vncorenlp": vn_result,
                "underthesea": underthesea_result,
            },
            "summary": summary,
        }
    )
