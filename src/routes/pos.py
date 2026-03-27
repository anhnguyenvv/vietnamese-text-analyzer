from flask import Blueprint, request, jsonify
from modules.pos_ner.pos_ner import pos_tagging as tag_text
from modules.preprocessing import preprocess_text
from extensions import limiter
from utils.input_validation import validate_text_input
from collections import Counter


pos_bp = Blueprint('pos', __name__)


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
        payload, status = text_error
        return jsonify(payload), status

    model = data.get('model', 'underthesea')

    text = preprocess_text(text, remove_icon=True)
    if not text:
        return jsonify({"error": "No text provided"}), 400
    print(f"Received text for POS tagging: {text[:50]}...")  # Log first 50 characters for debugging
    if model == "underthesea":
        result = tag_text(text, model = "underthesea")
    elif model == "vncorenlp":
        result = tag_text(text, model = "vncorenlp")
    else:
        return jsonify({"error": "Invalid model specified"}), 400

    return jsonify({"result": result})


@pos_bp.route('/compare', methods=['POST'])
@limiter.limit("20 per minute")
def compare_pos_models():
    data = request.get_json(silent=True) or {}
    text, text_error = validate_text_input(data.get('text'))
    if text_error is not None:
        payload, status = text_error
        return jsonify(payload), status

    text = preprocess_text(text, remove_icon=True)
    if not text:
        return jsonify({"error": "No text provided"}), 400

    vn_result = tag_text(text, model="vncorenlp")
    underthesea_result = tag_text(text, model="underthesea")
    summary = _compare_tag_outputs(vn_result, underthesea_result)

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
