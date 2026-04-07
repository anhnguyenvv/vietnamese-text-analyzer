import logging

from flask import Blueprint, request, jsonify
from modules.preprocessing.normalization import normalize_text
from modules.preprocessing.tokenization import tokenize_words
from modules.preprocessing.preprocess import preprocess_text, get_stopwords
from extensions import limiter
from utils.input_validation import validate_text_input
from utils.logging_utils import build_log_message
preprocessing_bp = Blueprint('preprocessing', __name__)
LOGGER = logging.getLogger("vta.api.preprocessing")

@preprocessing_bp.route('/normalize', methods=['POST'])
@limiter.limit("60 per minute")
def normalize():
    data = request.get_json(silent=True) or {}
    text, text_error = validate_text_input(data.get('text'))
    if text_error is not None:
        LOGGER.warning(build_log_message("preprocessing", "normalize_validation_failed"))
        payload, status = text_error
        return jsonify(payload), status

    LOGGER.info(build_log_message("preprocessing", "normalize_request_received", path=request.path))
    normalized_text = normalize_text(text)
    LOGGER.info(build_log_message("preprocessing", "normalize_request_succeeded"))
    return jsonify({"normalized_text": normalized_text})

@preprocessing_bp.route('/tokenize', methods=['POST'])
@limiter.limit("60 per minute")
def tokenize():
    data = request.get_json(silent=True) or {}
    text, text_error = validate_text_input(data.get('text'))
    if text_error is not None:
        LOGGER.warning(build_log_message("preprocessing", "tokenize_validation_failed"))
        payload, status = text_error
        return jsonify(payload), status

    LOGGER.info(build_log_message("preprocessing", "tokenize_request_received", path=request.path))
    tokens = tokenize_words(text)
    LOGGER.info(build_log_message("preprocessing", "tokenize_request_succeeded", token_count=len(tokens)))
    return jsonify({"tokens": tokens})

@preprocessing_bp.route('/preprocess', methods=['POST'])
@limiter.limit("60 per minute")
def preprocess():
    data = request.get_json(silent=True) or {}
    text, text_error = validate_text_input(data.get('text'))
    if text_error is not None:
        LOGGER.warning(build_log_message("preprocessing", "preprocess_validation_failed"))
        payload, status = text_error
        return jsonify(payload), status

    remove_numbers = data.get('remove_numbers', True)
    remove_emoji = data.get('remove_emojis', False)
    remove_stopword = data.get('remove_stopwords', False)
    to_lower = data.get('lowercase', False)
    deduplicate = data.get('remove_duplicates', False)

    LOGGER.info(
        build_log_message(
            "preprocessing",
            "preprocess_request_received",
            remove_numbers=remove_numbers,
            remove_emojis=remove_emoji,
            remove_stopwords=remove_stopword,
            lowercase=to_lower,
            remove_duplicates=deduplicate,
        )
    )
    preprocessed_text = preprocess_text(
        text,
        remove_numbers=remove_numbers,
        remove_special_chars=False,  # Giữ nguyên để loại bỏ ký tự đặc biệt
        remove_icon=remove_emoji,
        remove_stopword=remove_stopword,
        remove_duplicates=deduplicate,
        lowercase=to_lower
    )
    LOGGER.info(build_log_message("preprocessing", "preprocess_request_succeeded"))
    return jsonify({"preprocessed_text": preprocessed_text})