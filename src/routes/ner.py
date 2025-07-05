from flask import Blueprint, request, jsonify
from modules.pos_ner.pos_ner import ner_tagging as ner_text
ner_bp = Blueprint('ner_ner', __name__)

@ner_bp.route('/ner', methods=['POST'])
def ner():
    data = request.get_json()
    text = data.get('text', '')
    model = data.get('model', 'vncorenlp')
    if not text:
        return jsonify({"error": "No text provided"}), 400

    if model == "underthesea":
        result = ner_text(text, model = "underthesea")
    elif model == "vncorenlp":
        result = ner_text(text, model = "vncorenlp")
    else:
        return jsonify({"error": "Invalid model specified"}), 400

    return jsonify({"result": result})