from flask import Blueprint, jsonify, request

from database.db import get_online_metrics_summary


metrics_bp = Blueprint("metrics", __name__)


@metrics_bp.route("/online", methods=["GET"])
def online_metrics():
    limit_raw = request.args.get("limit", "1000")
    try:
        limit = int(limit_raw)
    except ValueError:
        return jsonify({"error": "limit must be an integer"}), 400

    if limit <= 0:
        return jsonify({"error": "limit must be greater than 0"}), 400

    payload = get_online_metrics_summary(limit=limit)
    return jsonify(payload)