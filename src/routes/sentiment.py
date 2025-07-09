from modules.sentiment.sentiment import analyze_sentiment
from database.db import save_history
from flask import Blueprint, request, jsonify, send_file
import pandas as pd
import io
from modules.classification.classification import get_classifier


sentiment_bp = Blueprint('sentiment', __name__)

@sentiment_bp.route('/analyze', methods=['POST'])
def analyze():
    data = request.get_json(silent=True)
    if not data or 'text' not in data:
        return jsonify({"error": "No text provided"}), 400

    text = data['text']
    model_name = data.get('model_name', "sentiment")
    result = None
    if model_name == 'sentiment':
        result = analyze_sentiment(text)
    elif model_name == 'vispam':
        model = get_classifier(model_name='vispam-VisoBert')
        result = model.classify(text)
    save_history(
        feature="sentiment",
        input_text=text,
        result=str(result)
    )
    print("Sentiment analysis result:", result)
    return jsonify(result)

@sentiment_bp.route('/analyze-file', methods=['POST'])
def analyze_file():
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    file = request.files['file']
    if not file.filename.endswith('.csv'):
        return jsonify({"error": "Chỉ hỗ trợ file .csv"}), 400

    df = pd.read_csv(file)
    if 'text' not in df.columns:
        return jsonify({"error": "File phải có cột 'text'"}), 400

    results = []
    for text in df['text'].astype(str):
        res = analyze_sentiment(text)
        results.append(res['label'])
    df['sentiment'] = results

    # Lưu lịch sử (tuỳ chọn)
    save_history(
        feature="sentiment_batch",
        input_text=f"File: {file.filename}",
        result=f"{len(df)} rows"
    )

    # Trả về file kết quả
    output = io.StringIO()
    df.to_csv(output, index=False, encoding='utf-8-sig')
    output.seek(0)
    return send_file(
        io.BytesIO(output.getvalue().encode('utf-8-sig')),
        mimetype='text/csv',
        as_attachment=True,
        download_name='sentiment_result.csv'
    )