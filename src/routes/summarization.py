from flask import Blueprint, request, jsonify
from modules.summarization.summarization import summarize_text

summarization_bp = Blueprint('summarization', __name__)

@summarization_bp.route('/summarize', methods=['POST'])
def summarize():
    data = request.get_json()
    text = data.get('text', '')

    if not text:
        return jsonify({"error": "No text provided"}), 400

    summary = summarize_text(text)
    if not summary:
        return jsonify({"error": "Failed to summarize text"}), 500
    return jsonify({"summary": summary})