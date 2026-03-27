import json
import re
import time
import uuid


def start_timer():
    return time.perf_counter()


def count_tokens(text):
    if not text:
        return 0
    return len(re.findall(r"\S+", text))


def build_warnings(text):
    warnings = []
    char_count = len(text or "")
    token_count = count_tokens(text)

    if char_count > 5000:
        warnings.append("Input text is long and may increase latency.")
    if token_count > 512:
        warnings.append("Input token count is high and may be truncated by model max_length.")
    if text and text.strip() != text:
        warnings.append("Input has leading/trailing spaces.")

    return warnings


def extract_confidence(result):
    if not isinstance(result, dict):
        return None

    label = result.get("label") or result.get("label_name")
    if label is not None and label in result:
        value = result.get(label)
        if isinstance(value, (float, int)):
            return round(float(value), 4)

    numeric_scores = [
        float(v)
        for k, v in result.items()
        if isinstance(v, (float, int)) and k not in {"label_id"}
    ]
    if numeric_scores:
        return round(max(numeric_scores), 4)
    return None


def build_task_response(task, model_name, text, result, started_at):
    token_count = count_tokens(text)
    confidence_score = extract_confidence(result)
    elapsed_ms = round((time.perf_counter() - started_at) * 1000, 2)
    warnings = build_warnings(text)

    return {
        "inference_id": str(uuid.uuid4()),
        "task": task,
        "model_name": model_name,
        "input": {
            "text": text,
            "char_count": len(text or ""),
            "token_count": token_count,
        },
        "result": result,
        "meta": {
            "confidence_score": confidence_score,
            "processing_time_ms": elapsed_ms,
            "token_count": token_count,
            "warnings": warnings,
        },
    }


def to_export_row(inference_payload):
    result = inference_payload.get("result", {}) if isinstance(inference_payload, dict) else {}
    meta = inference_payload.get("meta", {}) if isinstance(inference_payload, dict) else {}
    input_obj = inference_payload.get("input", {}) if isinstance(inference_payload, dict) else {}

    prediction_label = result.get("label") or result.get("label_name")

    return {
        "task": inference_payload.get("task"),
        "input_text": input_obj.get("text"),
        "model_name": inference_payload.get("model_name"),
        "prediction_label": prediction_label,
        "prediction_id": result.get("label_id"),
        "confidence_score": meta.get("confidence_score"),
        "processing_time_ms": meta.get("processing_time_ms"),
        "token_count": meta.get("token_count"),
        "warnings": " | ".join(meta.get("warnings", [])),
        "result_json": json.dumps(result, ensure_ascii=False),
    }