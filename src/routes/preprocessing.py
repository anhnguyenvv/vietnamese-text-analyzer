from flask import Blueprint, request, jsonify
from modules.preprocessing.normalization import normalize_text
from modules.preprocessing.tokenization import tokenize_words
from modules.preprocessing.preprocess import preprocess_text, get_stopwords
from extensions import limiter
from utils.input_validation import validate_text_input
preprocessing_bp = Blueprint('preprocessing', __name__)

@preprocessing_bp.route('/normalize', methods=['POST'])
@limiter.limit("60 per minute")
def normalize():
    data = request.get_json(silent=True) or {}
    text, text_error = validate_text_input(data.get('text'))
    if text_error is not None:
        payload, status = text_error
        return jsonify(payload), status

    normalized_text = normalize_text(text)
    return jsonify({"normalized_text": normalized_text})

@preprocessing_bp.route('/tokenize', methods=['POST'])
@limiter.limit("60 per minute")
def tokenize():
    data = request.get_json(silent=True) or {}
    text, text_error = validate_text_input(data.get('text'))
    if text_error is not None:
        payload, status = text_error
        return jsonify(payload), status

    tokens = tokenize_words(text)
    return jsonify({"tokens": tokens})

@preprocessing_bp.route('/preprocess', methods=['POST'])
@limiter.limit("60 per minute")
def preprocess():
    data = request.get_json(silent=True) or {}
    text, text_error = validate_text_input(data.get('text'))
    if text_error is not None:
        payload, status = text_error
        return jsonify(payload), status

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
        remove_duplicates=deduplicate,
        lowercase=to_lower
    )
    return jsonify({"preprocessed_text": preprocessed_text})