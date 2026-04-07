from transformers import AutoModel, AutoModelForSequenceClassification, AutoModelForSeq2SeqLM, AutoTokenizer, pipeline, AutoModelForTokenClassification
import os
from config.settings import BASE_DIR
import os
import requests
import logging

from utils.logging_utils import build_log_message

MODELS = [
    # (model_name, pipeline_task, model_class)
    #("VietAI/vit5-base-vietnews-summarization", "summarization", AutoModelForSeq2SeqLM),
    #("5CD-AI/Vietnamese-Sentiment-visobert", "text-classification", AutoModelForSequenceClassification),
    #("PaulTran/vietnamese_essay_identify", "text-classification", AutoModelForSequenceClassification),
]

MODEL_DIR = os.path.join(BASE_DIR, "model")

os.makedirs(MODEL_DIR, exist_ok=True)

LOGGER = logging.getLogger("vta.api.download_models")


for model_name, task, model_class in MODELS:
    LOGGER.info(build_log_message("download_models", "download_started", task=task, model_name=model_name))
    local_dir = os.path.join(MODEL_DIR, model_name.replace("/", "_"))
    os.makedirs(local_dir, exist_ok=True)
    # Tải tokenizer
    try:
        tokenizer = AutoTokenizer.from_pretrained(model_name)
    except Exception:
        tokenizer = AutoTokenizer.from_pretrained(model_name, use_fast=False)
    tokenizer.save_pretrained(local_dir)
    # Tải model
    model = model_class.from_pretrained(model_name, )
    model.save_pretrained(local_dir)
    LOGGER.info(build_log_message("download_models", "download_completed", task=task, model_name=model_name, save_dir=local_dir))

LOGGER.info(build_log_message("download_models", "all_models_downloaded", save_dir="./model/"))