import logging

from flask import Blueprint, request, jsonify
from pydantic import ValidationError

from schemas.feedback import (
    FeedbackSubmitRequest,
    FeedbackSubmitResponse,
    InferenceFeedbackRequest,
    InferenceFeedbackResponse,
)
from services.feedback_service import FeedbackService
from utils.logging_utils import build_log_message

feedback_bp = Blueprint('feedback', __name__)
feedback_service = FeedbackService()
LOGGER = logging.getLogger("vta.api.feedback")

@feedback_bp.route('/submit', methods=['POST'])
def submit_feedback():
    try:
        LOGGER.info(build_log_message("feedback", "submit_request_received"))
        payload = FeedbackSubmitRequest.model_validate(request.get_json(silent=True) or {})
        result = feedback_service.submit_feedback(email=payload.email or '', message=payload.message)
        response = FeedbackSubmitResponse.model_validate(result)
        LOGGER.info(build_log_message("feedback", "submit_request_succeeded"))
        return jsonify(response.model_dump())
    except ValidationError as exc:
        LOGGER.warning(build_log_message("feedback", "submit_validation_failed"))
        return jsonify({"error": "Invalid request payload", "details": exc.errors()}), 400
    except ValueError as exc:
        LOGGER.warning(build_log_message("feedback", "submit_value_error"))
        return jsonify({"error": str(exc)}), 400
    except Exception:
        LOGGER.exception(build_log_message("feedback", "submit_failed"))
        return jsonify({"error": "Internal server error"}), 500

@feedback_bp.route('/list', methods=['GET'])
def list_feedback():
    limit_raw = request.args.get('limit', '50')
    try:
        limit = int(limit_raw)
    except ValueError:
        LOGGER.warning(build_log_message("feedback", "list_invalid_limit", limit=limit_raw))
        return jsonify({"error": "limit must be an integer"}), 400

    if limit <= 0:
        LOGGER.warning(build_log_message("feedback", "list_limit_out_of_range", limit=limit))
        return jsonify({"error": "limit must be greater than 0"}), 400

    LOGGER.info(build_log_message("feedback", "list_request_received", limit=limit))
    feedbacks = feedback_service.list_feedback(limit=limit)
    return jsonify(feedbacks)


@feedback_bp.route('/inference', methods=['POST'])
def submit_inference_feedback():
    try:
        LOGGER.info(build_log_message("feedback", "inference_submit_request_received"))
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
        LOGGER.info(build_log_message("feedback", "inference_submit_request_succeeded"))
        return jsonify(response.model_dump())
    except ValidationError as exc:
        LOGGER.warning(build_log_message("feedback", "inference_submit_validation_failed"))
        return jsonify({"error": "Invalid request payload", "details": exc.errors()}), 400
    except ValueError as exc:
        LOGGER.warning(build_log_message("feedback", "inference_submit_value_error"))
        return jsonify({"error": str(exc)}), 400
    except Exception:
        LOGGER.exception(build_log_message("feedback", "inference_submit_failed"))
        return jsonify({"error": "Internal server error"}), 500


@feedback_bp.route('/inference/list', methods=['GET'])
def list_inference_feedback():
    limit_raw = request.args.get('limit', '100')
    try:
        limit = int(limit_raw)
    except ValueError:
        LOGGER.warning(build_log_message("feedback", "inference_list_invalid_limit", limit=limit_raw))
        return jsonify({"error": "limit must be an integer"}), 400

    if limit <= 0:
        LOGGER.warning(build_log_message("feedback", "inference_list_limit_out_of_range", limit=limit))
        return jsonify({"error": "limit must be greater than 0"}), 400

    LOGGER.info(build_log_message("feedback", "inference_list_request_received", limit=limit))
    return jsonify(feedback_service.list_inference_feedback(limit=limit))