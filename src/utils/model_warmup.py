from modules.classification.classification import get_classifier
from modules.sentiment.sentiment import _get_sentiment_resources
from modules.summarization.summarization import _get_summarization_resources
from utils.vncore import get_vncore_model


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
                logger.info(f"model_preloaded:{model_name}")
        except Exception as exc:
            failed.append({"model": model_name, "error": str(exc)})
            if logger is not None:
                logger.error(f"model_preload_failed:{model_name} error={exc}")
            if fail_fast:
                raise

    return {
        "loaded": loaded,
        "failed": failed,
    }