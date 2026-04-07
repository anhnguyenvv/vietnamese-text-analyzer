import logging

from flask import Blueprint, jsonify, request

from database.db import load_system_log, load_system_log_by_request_id
from utils.logging_utils import build_log_message


logs_bp = Blueprint("logs", __name__)
LOGGER = logging.getLogger("vta.api.logs")


@logs_bp.route("/system", methods=["GET"])
def get_system_logs():
    limit_raw = request.args.get("limit", "100")
    try:
        limit = int(limit_raw)
    except ValueError:
        LOGGER.warning(build_log_message("logs", "invalid_limit", limit=limit_raw))
        return jsonify({"error": "limit must be an integer"}), 400

    if limit <= 0 or limit > 1000:
        LOGGER.warning(build_log_message("logs", "limit_out_of_range", limit=limit))
        return jsonify({"error": "limit must be between 1 and 1000"}), 400

    LOGGER.info(build_log_message("logs", "system_logs_request_received", limit=limit))
    payload = load_system_log(limit=limit)
    LOGGER.info(build_log_message("logs", "system_logs_request_succeeded", row_count=len(payload)))
    return jsonify(payload)


@logs_bp.route("/request/<request_id>", methods=["GET"])
def get_request_logs(request_id):
    limit_raw = request.args.get("limit", "100")
    try:
        limit = int(limit_raw)
    except ValueError:
        LOGGER.warning(build_log_message("logs", "invalid_limit", limit=limit_raw, request_id=request_id))
        return jsonify({"error": "limit must be an integer"}), 400

    if limit <= 0 or limit > 1000:
        LOGGER.warning(build_log_message("logs", "limit_out_of_range", limit=limit, request_id=request_id))
        return jsonify({"error": "limit must be between 1 and 1000"}), 400

    if not request_id or not str(request_id).strip():
        LOGGER.warning(build_log_message("logs", "missing_request_id"))
        return jsonify({"error": "request_id is required"}), 400

    LOGGER.info(
        build_log_message("logs", "request_logs_request_received", request_id=request_id, limit=limit)
    )
    payload = load_system_log_by_request_id(request_id=request_id, limit=limit)
    LOGGER.info(
        build_log_message(
            "logs",
            "request_logs_request_succeeded",
            request_id=request_id,
            row_count=len(payload),
        )
    )
    return jsonify(payload)
