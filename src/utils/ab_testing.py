import hashlib


def choose_ab_variant(task, input_text, models, client_id=None, experiment_name=None):
    if not isinstance(models, list) or len(models) != 2:
        raise ValueError("models must contain exactly 2 entries: [old_model, new_model]")

    old_model, new_model = models
    basis = f"{client_id or ''}:{task}:{input_text}:{experiment_name or ''}"
    digest = hashlib.md5(basis.encode("utf-8")).hexdigest()
    bucket = int(digest[:8], 16) % 100

    variant = "A" if bucket < 50 else "B"
    selected_model = old_model if variant == "A" else new_model

    return {
        "experiment": experiment_name or f"{task}_old_vs_new",
        "variant": variant,
        "model_name": selected_model,
        "allocation": {
            "A": old_model,
            "B": new_model,
        },
        "bucket": bucket,
    }