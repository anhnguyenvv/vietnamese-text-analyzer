from flask import Blueprint, jsonify, request


model_preload_bp = Blueprint("model_preload", __name__)


@model_preload_bp.route("/start", methods=["POST"])
def start_preload():
    from utils.preload_manager import start_feature_preload

    data = request.get_json(silent=True) or {}
    feature = data.get("feature") or ""
    model_names = data.get("model_names")
    if model_names is not None and not isinstance(model_names, list):
        return jsonify({"error": "model_names must be a list when provided"}), 400

    payload = start_feature_preload(feature=feature, model_names=model_names)
    return jsonify(payload), 202 if payload.get("job_id") else 200


@model_preload_bp.route("/<job_id>", methods=["GET"])
def preload_status(job_id):
    from utils.preload_manager import get_preload_job_status

    payload = get_preload_job_status(job_id)
    if payload is None:
        return jsonify({"error": "preload job not found"}), 404
    return jsonify(payload)