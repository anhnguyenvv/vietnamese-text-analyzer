from flask import Blueprint, request, jsonify, send_file
from modules.classification.classification import TextClassifier
from database.db import save_history
import pandas as pd
import io

classification_bp = Blueprint('classification', __name__)
classifier = TextClassifier()

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

    results = []
    for text in df['text'].astype(str):
        predicted_label = classifier.classify(text, model_name=model_name)
        label_name = classifier.id2label.get(predicted_label, str(predicted_label))
        results.append(label_name)
    df['classification'] = results

    # Lưu lịch sử (tuỳ chọn)
    save_history(
        feature="classification_batch",
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
        download_name=f"{file.filename.rsplit('.', 1)[0]}_result.csv"
    )

@classification_bp.route('/classify', methods=['POST'])
def classify():
    data = request.get_json(silent=True)
    if not data or 'text' not in data:
        return jsonify({"error": "No text provided"}), 400

    text = data['text']
    model_name = data.get('model_name', None)
    try:
        predicted_label = classifier.classify(
            text,
            model_name=model_name if model_name else classifier.model_name
        )
        label_name = classifier.id2label.get(predicted_label, str(predicted_label))
        result = {
            "label_id": predicted_label,
            "label_name": label_name,
            "model_name": classifier.model_name
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