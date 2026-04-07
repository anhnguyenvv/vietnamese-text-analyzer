import logging

from flask import Blueprint, jsonify, request

from database.db import load_system_log
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
