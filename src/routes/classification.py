from flask import Blueprint, request, jsonify
from modules.classification.classification import TextClassifier
from database.db import save_history

classification_bp = Blueprint('classification', __name__)
classifier = TextClassifier()

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