from modules.classification.classification import get_classifier
from modules.sentiment.sentiment import _get_sentiment_resources
from modules.summarization.summarization import _get_summarization_resources
from utils.vncore import get_vncore_model
from utils.logging_utils import build_log_message


def warmup_models(model_names, logger=None, fail_fast=False):
    loaded = []
    failed = []

    for model_name in model_names:
        try:
            if model_name == "sentiment":
                _get_sentiment_resources()
            elif model_name == "summarization":
                _get_summarization_resources()
            elif model_name == "vncorenlp":
                get_vncore_model()
            else:
                get_classifier(model_name)

            loaded.append(model_name)
            if logger is not None:
                logger.info(build_log_message("model_warmup", "preloaded", model=model_name))
        except Exception as exc:
            failed.append({"model": model_name, "error": str(exc)})
            if logger is not None:
                logger.error(build_log_message("model_warmup", "preload_failed", model=model_name, error=str(exc)))
            if fail_fast:
                raise

    return {
        "loaded": loaded,
        "failed": failed,
    }


def warmup_models_with_progress(model_names, logger=None, fail_fast=False, progress_callback=None):
    loaded = []
    failed = []
    total = len(model_names)

    for index, model_name in enumerate(model_names, start=1):
        if progress_callback is not None:
            progress_callback(
                {
                    "state": "running",
                    "current_model": model_name,
                    "completed_models": index - 1,
                    "total_models": total,
                    "progress": round(((index - 1) / total) * 100, 2) if total else 100,
                    "message": f"Đang tải {model_name}",
                }
            )

        try:
            if model_name == "sentiment":
                _get_sentiment_resources()
            elif model_name == "summarization":
                _get_summarization_resources()
            elif model_name == "vncorenlp":
                get_vncore_model()
            else:
                get_classifier(model_name)

            loaded.append(model_name)
            if logger is not None:
                logger.info(build_log_message("model_warmup", "preloaded", model=model_name))
        except Exception as exc:
            failed.append({"model": model_name, "error": str(exc)})
            if logger is not None:
                logger.error(build_log_message("model_warmup", "preload_failed", model=model_name, error=str(exc)))
            if fail_fast:
                raise

        if progress_callback is not None:
            progress_callback(
                {
                    "state": "running",
                    "current_model": model_name,
                    "completed_models": index,
                    "total_models": total,
                    "progress": round((index / total) * 100, 2) if total else 100,
                    "loaded_models": loaded,
                    "failed_models": failed,
                    "message": f"Đã tải xong {model_name}",
                }
            )

    return {
        "loaded": loaded,
        "failed": failed,
    }