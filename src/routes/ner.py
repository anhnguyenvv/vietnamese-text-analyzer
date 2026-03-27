from flask import Blueprint, request, jsonify
from modules.pos_ner.pos_ner import ner_tagging as ner_text
from modules.preprocessing import preprocess_text
from extensions import limiter
from utils.input_validation import validate_text_input
from collections import Counter


ner_bp = Blueprint('ner_ner', __name__)


def _compare_ner_outputs(vncorenlp_result, underthesea_result):
    vn_counter = Counter(tuple(item) for item in vncorenlp_result)
    ud_counter = Counter(tuple(item) for item in underthesea_result)
    common = vn_counter & ud_counter
    matched = sum(common.values())
    base = max(len(vncorenlp_result), len(underthesea_result), 1)

    vn_entities = sum(1 for _, tag in vncorenlp_result if tag != "O")
    ud_entities = sum(1 for _, tag in underthesea_result if tag != "O")
    return {
        "vncorenlp_count": len(vncorenlp_result),
        "underthesea_count": len(underthesea_result),
        "vncorenlp_entities": vn_entities,
        "underthesea_entities": ud_entities,
        "matched_pairs": matched,
        "agreement_rate": round(matched / base, 4),
    }
 
@ner_bp.route('/ner', methods=['POST'])
@limiter.limit("40 per minute")
def ner():
    data = request.get_json(silent=True) or {}
    text, text_error = validate_text_input(data.get('text'))
    if text_error is not None:
        payload, status = text_error
        return jsonify(payload), status

    model = data.get('model', 'vncorenlp')

    text = preprocess_text(text, remove_icon=True)
    print(f"Received text for NER tagging: {text[:50]}...")
    if not text:
        return jsonify({"error": "No text provided"}), 400
    if model == "underthesea":
        result = ner_text(text, model = "underthesea")
    elif model == "vncorenlp":
        result = ner_text(text, model = "vncorenlp")
    else:
        return jsonify({"error": "Invalid model specified"}), 400

    return jsonify({"result": result})


@ner_bp.route('/compare', methods=['POST'])
@limiter.limit("20 per minute")
def compare_ner_models():
    data = request.get_json(silent=True) or {}
    text, text_error = validate_text_input(data.get('text'))
    if text_error is not None:
        payload, status = text_error
        return jsonify(payload), status

    text = preprocess_text(text, remove_icon=True)
    if not text:
        return jsonify({"error": "No text provided"}), 400

    vn_result = ner_text(text, model="vncorenlp")
    underthesea_result = ner_text(text, model="underthesea")
    summary = _compare_ner_outputs(vn_result, underthesea_result)

    return jsonify(
        {
            "task": "ner",
            "input_text": text,
            "models": {
                "vncorenlp": vn_result,
                "underthesea": underthesea_result,
            },
            "summary": summary,
        }
    )