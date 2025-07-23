from flask import Blueprint, request, jsonify
from modules.summarization.summarization import summarize_text
from database.db import save_history
summarization_bp = Blueprint('summarization', __name__)

@summarization_bp.route('/summarize', methods=['POST'])
def summarize():
    data = request.get_json()
    text = data.get('text', '')
    length = data.get('length', "medium")
    if not text:
        return jsonify({"error": "No text provided"}), 400
    summary = summarize_text(text, length=length)
    if not summary:
        return jsonify({"error": "Failed to summarize text"}), 500
    save_history(
        feature="summarization",
        input_text=text,
        result=str(summary)
    )
    
    return jsonify({"summary": summary})