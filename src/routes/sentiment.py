from flask import Blueprint, request, jsonify
from modules.sentiment.sentiment import analyze_sentiment
from database.db import save_history

sentiment_bp = Blueprint('sentiment', __name__)

@sentiment_bp.route('/analyze', methods=['POST'])
def analyze():
    data = request.get_json(silent=True)
    if not data or 'text' not in data:
        return jsonify({"error": "No text provided"}), 400

    text = data['text']
    result = analyze_sentiment(text)
    # Lưu lịch sử vào database
    save_history(
        feature="sentiment",
        input_text=text,
        result=str(result)
    )
    print("Sentiment analysis result:", result)
    return jsonify(result)