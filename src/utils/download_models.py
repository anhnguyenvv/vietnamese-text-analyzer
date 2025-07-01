from transformers import AutoModel, AutoModelForSequenceClassification, AutoModelForSeq2SeqLM, AutoTokenizer, pipeline, AutoModelForTokenClassification
import os
from config.settings import BASE_DIR
import os
import requests

MODELS = [
    # (model_name, pipeline_task, model_class)
    #("VietAI/vit5-base-vietnews-summarization", "summarization", AutoModelForSeq2SeqLM),
    #("5CD-AI/Vietnamese-Sentiment-visobert", "text-classification", AutoModelForSequenceClassification),
    #("PaulTran/vietnamese_essay_identify", "text-classification", AutoModelForSequenceClassification),
]

MODEL_DIR = os.path.join(BASE_DIR, "model")

os.makedirs(MODEL_DIR, exist_ok=True)


for model_name, task, model_class in MODELS:
    print(f"Downloading {model_name} for task {task} ...")
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
    print(f"Saved to {local_dir}")

print("All models downloaded and saved to ./model/")