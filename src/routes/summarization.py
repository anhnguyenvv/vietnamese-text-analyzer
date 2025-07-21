from flask import Blueprint, request, jsonify
from modules.summarization.summarization import summarize_text
from database.db import save_history
from modules.preprocessing.preprocess import preprocess_text
summarization_bp = Blueprint('summarization', __name__)

@summarization_bp.route('/summarize', methods=['POST'])
def summarize():
    data = request.get_json()
    text = data.get('text', '')

    if not text:
        return jsonify({"error": "No text provided"}), 400
    text = preprocess_text(text, remove_stopwords=True, remove_special_chars=True)
    summary = summarize_text(text)
    if not summary:
        return jsonify({"error": "Failed to summarize text"}), 500
    save_history(
        feature="summarization",
        input_text=text,
        result=str(summary)
    )
    print("Summarization result:", summary)
    
    return jsonify({"summary": summary})