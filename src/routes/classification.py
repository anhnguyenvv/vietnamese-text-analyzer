from flask import Blueprint, request, jsonify, send_file
from modules.classification.classification import get_classifier
from database.db import save_history
import pandas as pd
import io

classification_bp = Blueprint('classification', __name__)

@classification_bp.route('/analyze-file', methods=['POST'])
def analyze_file():
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    file = request.files['file']
    if not file.filename.endswith('.csv'):
        return jsonify({"error": "Chỉ hỗ trợ file .csv"}), 400

    model_name = request.form.get('model_name', 'essay_identification')
    df = pd.read_csv(file)
    if 'text' not in df.columns:
        return jsonify({"error": "File phải có cột 'text'"}), 400
    classification = get_classifier(model_name)
    results = []
    for text in df['text'].astype(str):
        predicted = classification.classify(text, model_name=model_name)
        results.append(predicted['label'])
        save_history(
            feature="classification",
            input_text=text,
            result=str(predicted)
        )
    df['classification'] = results    

    # Trả về file kết quả
    output = io.StringIO()
    df.to_csv(output, index=False, encoding='utf-8-sig')
    output.seek(0)
    return send_file(
        io.BytesIO(output.getvalue().encode('utf-8-sig')),
        mimetype='text/csv',
        as_attachment=True,
        download_name=f"{file.filename.rsplit('.', 1)[0]}_result.csv"
    )

@classification_bp.route('/classify', methods=['POST'])
def classify():
    data = request.get_json(silent=True)
    if not data or 'text' not in data:
        return jsonify({"error": "No text provided"}), 400

    text = data['text']
    model_name = data.get('model_name', "essay_identification")
    classification = get_classifier(model_name)
    try:
        predicted = classification.classify(
            text,
            model_name=model_name if model_name else classification.model_name
        )
        result = {
            "label_name": predicted['label'],
            "all_labels": {k: v for k, v in predicted.items() if k != 'label'},  # Remove 'label' key from all_labels
            "model_name": classification.model_name
        }
        # Lưu lịch sử vào database
        save_history(
            feature="classification",
            input_text=text,
            result=str(result)
        )
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500