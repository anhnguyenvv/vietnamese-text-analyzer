from flask import Blueprint, request, jsonify
from pydantic import ValidationError

from schemas.feedback import (
    FeedbackSubmitRequest,
    FeedbackSubmitResponse,
    InferenceFeedbackRequest,
    InferenceFeedbackResponse,
)
from services.feedback_service import FeedbackService

feedback_bp = Blueprint('feedback', __name__)
feedback_service = FeedbackService()

@feedback_bp.route('/submit', methods=['POST'])
def submit_feedback():
    try:
        payload = FeedbackSubmitRequest.model_validate(request.get_json(silent=True) or {})
        result = feedback_service.submit_feedback(email=payload.email or '', message=payload.message)
        response = FeedbackSubmitResponse.model_validate(result)
        return jsonify(response.model_dump())
    except ValidationError as exc:
        return jsonify({"error": "Invalid request payload", "details": exc.errors()}), 400
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception:
        return jsonify({"error": "Internal server error"}), 500

@feedback_bp.route('/list', methods=['GET'])
def list_feedback():
    limit_raw = request.args.get('limit', '50')
    try:
        limit = int(limit_raw)
    except ValueError:
        return jsonify({"error": "limit must be an integer"}), 400

    if limit <= 0:
        return jsonify({"error": "limit must be greater than 0"}), 400

    feedbacks = feedback_service.list_feedback(limit=limit)
    return jsonify(feedbacks)


@feedback_bp.route('/inference', methods=['POST'])
def submit_inference_feedback():
    try:
        payload = InferenceFeedbackRequest.model_validate(request.get_json(silent=True) or {})
        result = feedback_service.submit_inference_feedback(
            inference_id=payload.inference_id,
            task=payload.task,
            model_name=payload.model_name,
            input_text=payload.input_text,
            predicted_label=payload.predicted_label,
            is_correct=payload.is_correct,
            correct_label=payload.correct_label,
            comment=payload.comment,
            metadata=payload.metadata,
        )
        response = InferenceFeedbackResponse.model_validate(result)
        return jsonify(response.model_dump())
    except ValidationError as exc:
        return jsonify({"error": "Invalid request payload", "details": exc.errors()}), 400
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception:
        return jsonify({"error": "Internal server error"}), 500


@feedback_bp.route('/inference/list', methods=['GET'])
def list_inference_feedback():
    limit_raw = request.args.get('limit', '100')
    try:
        limit = int(limit_raw)
    except ValueError:
        return jsonify({"error": "limit must be an integer"}), 400

    if limit <= 0:
        return jsonify({"error": "limit must be greater than 0"}), 400

    return jsonify(feedback_service.list_inference_feedback(limit=limit))