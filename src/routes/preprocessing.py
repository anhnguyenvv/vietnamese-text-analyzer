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

    # Lấy các biến option từ frontend, mặc định nếu không có sẽ lấy giá trị hợp lý
    remove_special = data.get('remove_special_chars', True)
    remove_emoji = data.get('remove_emojis', False)
    remove_stopword = data.get('remove_stopwords', False)
    to_lower = data.get('lowercase', False)
    deduplicate = data.get('remove_duplicates', False)

    # Tiền xử lý văn bản theo các option
    # Bạn cần cập nhật hàm preprocess_text để nhận các tham số này nếu chưa có
    preprocessed_text = preprocess_text(
        text,
        remove_special_chars=remove_special,
        remove_icon=remove_emoji,
        remove_stopwords=remove_stopword,
        remove_duplicates=deduplicate
        # Thêm các tham số khác nếu cần
    )

    # Xử lý chuyển về chữ thường/hoa nếu được chọn
    if to_lower:
        preprocessed_text = preprocessed_text.lower()
    # Nếu cần tách từ, bạn có thể xử lý thêm ở đây

    return jsonify({"preprocessed_text": preprocessed_text})