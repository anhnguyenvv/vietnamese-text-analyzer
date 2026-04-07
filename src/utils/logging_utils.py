import json


def build_log_message(component: str, event: str, **fields) -> str:
    parts = [f"vta component={component}", f"event={event}"]
    for key in sorted(fields):
        value = fields[key]
        if value is None:
            continue
        parts.append(f"{key}={json.dumps(value, ensure_ascii=False)}")
    return " ".join(parts)
