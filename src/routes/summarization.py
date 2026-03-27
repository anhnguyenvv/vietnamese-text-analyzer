from flask import Blueprint, request, jsonify
from modules.summarization.summarization import summarize_text
from database.db import save_history
from extensions import limiter
from utils.input_validation import validate_text_input
summarization_bp = Blueprint('summarization', __name__)

@summarization_bp.route('/summarize', methods=['POST'])
@limiter.limit("20 per minute")
def summarize():
    data = request.get_json(silent=True) or {}
    text, text_error = validate_text_input(data.get('text'))
    if text_error is not None:
        payload, status = text_error
        return jsonify(payload), status

    length = data.get('length', "medium")

    summary = summarize_text(text, length=length)
    if not summary:
        return jsonify({"error": "Failed to summarize text"}), 500
    save_history(
        feature="summarization",
        input_text=text,
        result=str(summary)
    )
    
    return jsonify({"summary": summary})