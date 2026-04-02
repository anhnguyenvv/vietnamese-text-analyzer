import threading
import uuid

from database.db import (
    create_model_preload_job,
    get_model_preload_job,
    get_model_preload_job_by_signature,
    update_model_preload_job,
)
from utils.model_warmup import warmup_models_with_progress


FEATURE_MODEL_MAP = {
    "thong-ke": [],
    "tien-xu-ly": [],
    "gan-nhan": ["vncorenlp"],
    "ner": ["vncorenlp"],
    "cam-xuc": ["sentiment", "vispam-Phobert", "vispam-VisoBert"],
    "phan-loai": ["essay_identification", "topic_classification"],
    "tom-tat": ["summarization"],
    "chuyen-giong-noi": [],
}


def _normalize_model_names(model_names):
    seen = set()
    normalized = []
    for model_name in model_names or []:
        if model_name and model_name not in seen:
            normalized.append(model_name)
            seen.add(model_name)
    return normalized


def get_feature_model_names(feature):
    return _normalize_model_names(FEATURE_MODEL_MAP.get(feature, []))


def _serialize_job(job):
    if not job:
        return None

    models = []
    loaded_models = []
    failed_models = []

    for field_name, target in (("models_json", models), ("loaded_models_json", loaded_models), ("failed_models_json", failed_models)):
        value = job.get(field_name) or "[]"
        try:
            import json

            target.extend(json.loads(value))
        except Exception:
            target.extend([])

    total_models = int(job.get("total_models") or len(models) or 0)
    completed_models = int(job.get("completed_models") or 0)
    progress = 100 if total_models == 0 else round((completed_models / total_models) * 100, 2)

    return {
        "job_id": job.get("id"),
        "feature": job.get("feature"),
        "models": models,
        "loaded_models": loaded_models,
        "failed_models": failed_models,
        "state": job.get("state"),
        "message": job.get("message"),
        "current_model": job.get("current_model"),
        "total_models": total_models,
        "completed_models": completed_models,
        "progress": progress,
        "created_at": job.get("created_at"),
        "updated_at": job.get("updated_at"),
        "finished_at": job.get("finished_at"),
    }


def _update_job(job_id, payload):
    # Filter out fields that are not in the database schema
    valid_fields = {
        "feature", "models_json", "state", "total_models", "completed_models",
        "current_model", "loaded_models_json", "failed_models_json", "message",
        "finished_at"
    }
    
    filtered_payload = {}
    for key, value in payload.items():
        if key == "loaded_models":
            filtered_payload["loaded_models_json"] = value
        elif key == "failed_models":
            filtered_payload["failed_models_json"] = value
        elif key in valid_fields:
            filtered_payload[key] = value
        # Ignore "progress", "total_models" if passed incorrectly, and other invalid fields
    
    if filtered_payload:
        update_model_preload_job(job_id, **filtered_payload)


def start_feature_preload(feature, model_names=None, logger=None, fail_fast=False):
    normalized_models = _normalize_model_names(model_names if model_names is not None else get_feature_model_names(feature))
    if not normalized_models:
        return {
            "job_id": None,
            "feature": feature,
            "models": [],
            "loaded_models": [],
            "failed_models": [],
            "state": "completed",
            "message": "No models are required for this feature.",
            "current_model": None,
            "total_models": 0,
            "completed_models": 0,
            "progress": 100,
        }

    existing_job = get_model_preload_job_by_signature(normalized_models)
    if existing_job:
        existing_state = existing_job.get("state")
        if existing_state in {"queued", "running", "completed"}:
            return _serialize_job(existing_job)

        # Reuse the same row for retry states to avoid UNIQUE constraint conflicts.
        job_id = existing_job.get("id")
        update_model_preload_job(
            job_id,
            feature=feature,
            models_json=normalized_models,
            state="queued",
            total_models=len(normalized_models),
            completed_models=0,
            current_model=None,
            loaded_models_json=[],
            failed_models_json=[],
            message="Preload job queued.",
            finished_at=None,
        )
    else:
        job_id = str(uuid.uuid4())
        created_job = create_model_preload_job(job_id=job_id, feature=feature, model_names=normalized_models)
        if created_job is not None and created_job.get("id") != job_id:
            # Another concurrent request already created this signature.
            return _serialize_job(created_job)

    def progress_callback(payload):
        _update_job(job_id, payload)

    def worker():
        try:
            _update_job(
                job_id,
                {
                    "state": "running",
                    "message": "Đang khởi tạo preload model.",
                    "current_model": normalized_models[0] if normalized_models else None,
                    "completed_models": 0,
                },
            )
            result = warmup_models_with_progress(
                normalized_models,
                logger=logger,
                fail_fast=fail_fast,
                progress_callback=progress_callback,
            )
            final_state = "completed" if not result["failed"] else "completed_with_errors"
            _update_job(
                job_id,
                {
                    "state": final_state,
                    "message": "Preload model hoàn tất." if not result["failed"] else "Preload hoàn tất nhưng có một số model lỗi.",
                    "completed_models": len(result["loaded"]) + len(result["failed"]),
                    "loaded_models_json": result["loaded"],
                    "failed_models_json": result["failed"],
                },
            )
        except Exception as exc:
            _update_job(
                job_id,
                {
                    "state": "failed",
                    "message": str(exc),
                },
            )

    threading.Thread(target=worker, daemon=True).start()
    return _serialize_job(get_model_preload_job(job_id))


def get_preload_job_status(job_id):
    return _serialize_job(get_model_preload_job(job_id))