import logging

from flask import Blueprint, jsonify, request

from database.db import get_online_metrics_summary
from utils.logging_utils import build_log_message


metrics_bp = Blueprint("metrics", __name__)
LOGGER = logging.getLogger("vta.api.metrics")


@metrics_bp.route("/online", methods=["GET"])
def online_metrics():
    limit_raw = request.args.get("limit", "1000")
    try:
        limit = int(limit_raw)
    except ValueError:
        LOGGER.warning(build_log_message("metrics", "online_invalid_limit", limit=limit_raw))
        return jsonify({"error": "limit must be an integer"}), 400

    if limit <= 0:
        LOGGER.warning(build_log_message("metrics", "online_limit_out_of_range", limit=limit))
        return jsonify({"error": "limit must be greater than 0"}), 400

    LOGGER.info(build_log_message("metrics", "online_request_received", limit=limit))
    payload = get_online_metrics_summary(limit=limit)
    LOGGER.info(build_log_message("metrics", "online_request_succeeded"))
    return jsonify(payload)