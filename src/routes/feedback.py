from flask import Blueprint, request, jsonify
from database.db import save_feedback, load_feedback

feedback_bp = Blueprint('feedback', __name__)

@feedback_bp.route('/submit', methods=['POST'])
def submit_feedback():
    data = request.get_json(silent=True)
    email = data.get('email', '')
    message = data.get('message', '')
    if not message:
        return jsonify({"error": "Message is required"}), 400
    save_feedback(email, message)
    return jsonify({"success": True, "message": "Cảm ơn bạn đã gửi phản hồi!"})

@feedback_bp.route('/list', methods=['GET'])
def list_feedback():
    feedbacks = load_feedback()
    return jsonify(feedbacks)