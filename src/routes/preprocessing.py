from flask import Blueprint, request, jsonify
from modules.preprocessing.normalization import normalize_text
from modules.preprocessing.tokenization import tokenize_words
from modules.preprocessing.preprocess import preprocess_text, get_stopwords
preprocessing_bp = Blueprint('preprocessing', __name__)

@preprocessing_bp.route('/normalize', methods=['POST'])
def normalize():
    data = request.get_json()
    text = data.get('text', '')
    if not text:
        return jsonify({"error": "No text provided"}), 400

    normalized_text = normalize_text(text)
    return jsonify({"normalized_text": normalized_text})

@preprocessing_bp.route('/tokenize', methods=['POST'])
def tokenize():
    data = request.get_json()
    text = data.get('text', '')
    if not text:
        return jsonify({"error": "No text provided"}), 400

    tokens = tokenize_words(text)
    return jsonify({"tokens": tokens})
@preprocessing_bp.route('/preprocess', methods=['POST'])
def preprocess():
    data = request.get_json()
    text = data.get('text', '')
    if not text:
        print("No text provided for preprocessing")
        return jsonify({"error": "No text provided"}), 400

    remove_numbers = data.get('remove_numbers', True)
    remove_emoji = data.get('remove_emojis', False)
    remove_stopword = data.get('remove_stopwords', False)
    to_lower = data.get('lowercase', False)
    deduplicate = data.get('remove_duplicates', False)

    preprocessed_text = preprocess_text(
        text,
        remove_numbers=remove_numbers,
        remove_special_chars=False,  # Giữ nguyên để loại bỏ ký tự đặc biệt
        remove_icon=remove_emoji,
        remove_stopword=remove_stopword,
        remove_duplicates=deduplicate
        # Thêm các tham số khác nếu cần
    ).replace("_", " ")

    if to_lower:
        preprocessed_text = preprocessed_text.lower()

    return jsonify({"preprocessed_text": preprocessed_text})