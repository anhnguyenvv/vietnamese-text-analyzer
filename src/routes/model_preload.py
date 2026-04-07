import logging

from flask import Blueprint, jsonify, request
from utils.logging_utils import build_log_message


model_preload_bp = Blueprint("model_preload", __name__)
LOGGER = logging.getLogger("vta.api.model_preload")


@model_preload_bp.route("/start", methods=["POST"])
def start_preload():
    from utils.preload_manager import start_feature_preload

    data = request.get_json(silent=True) or {}
    feature = data.get("feature") or ""
    model_names = data.get("model_names")
    if model_names is not None and not isinstance(model_names, list):
        LOGGER.warning(build_log_message("model_preload", "invalid_model_names"))
        return jsonify({"error": "model_names must be a list when provided"}), 400

    LOGGER.info(build_log_message("model_preload", "start_request_received", feature=feature, model_names=model_names))
    payload = start_feature_preload(feature=feature, model_names=model_names)
    LOGGER.info(
        build_log_message("model_preload", "start_request_succeeded", feature=feature, job_id=payload.get("job_id")),
    )
    return jsonify(payload), 202 if payload.get("job_id") else 200


@model_preload_bp.route("/<job_id>", methods=["GET"])
def preload_status(job_id):
    from utils.preload_manager import get_preload_job_status

    LOGGER.info(build_log_message("model_preload", "status_request_received", job_id=job_id))
    payload = get_preload_job_status(job_id)
    if payload is None:
        LOGGER.warning(build_log_message("model_preload", "job_not_found", job_id=job_id))
        return jsonify({"error": "preload job not found"}), 404
    LOGGER.info(build_log_message("model_preload", "status_request_succeeded", job_id=job_id))
    return jsonify(payload)