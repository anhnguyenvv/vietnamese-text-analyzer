from transformers import AutoModelForSequenceClassification, AutoTokenizer, AutoConfig
from config.settings import Config
import pandas as pd
import torch
from modules.preprocessing import normalize_text
import numpy as np

_SENTIMENT_MODEL = None
_SENTIMENT_TOKENIZER = None
_SENTIMENT_LABEL_MAP = None


def _get_sentiment_resources():
    global _SENTIMENT_MODEL, _SENTIMENT_TOKENIZER, _SENTIMENT_LABEL_MAP
    if _SENTIMENT_MODEL is None or _SENTIMENT_TOKENIZER is None or _SENTIMENT_LABEL_MAP is None:
        print("Loading sentiment analysis model..." + Config.MODELS_DIR['sentiment'])
        _SENTIMENT_LABEL_MAP = AutoConfig.from_pretrained(Config.MODELS_DIR['sentiment']).id2label
        _SENTIMENT_MODEL = AutoModelForSequenceClassification.from_pretrained(Config.MODELS_DIR['sentiment']).to(Config.DEVICE)
        _SENTIMENT_TOKENIZER = AutoTokenizer.from_pretrained(Config.MODELS_DIR['sentiment'], use_fast=False)
    return _SENTIMENT_MODEL, _SENTIMENT_TOKENIZER, _SENTIMENT_LABEL_MAP


def analyze_sentiment(text, max_length=256):
    if not text:
        return {"NEG": 0.0, "NEU": 0.0, "POS": 0.0, "label": "NaN"}

    model, tokenizer, label_map = _get_sentiment_resources()
    text = normalize_text(text)
    input_ids = torch.tensor([tokenizer.encode(text, max_length=max_length, truncation=True)]).to(Config.DEVICE)

    with torch.no_grad():
        out = model(input_ids)
        scores = out.logits.softmax(dim=-1).cpu().numpy()[0]

    # Print labels and scores
    ranking = np.argsort(scores)
    ranking = ranking[::-1]
    result = {}
    for i in range(scores.shape[0]):
        l = label_map[ranking[i]]
        s = scores[ranking[i]]
        result[l] = round(float(s), 4)
    max_idx = int(ranking[0])
    result['label'] = label_map[max_idx]
    result["label_id"] = max_idx

    return result   
 
# Ví dụ sử dụng
if __name__ == "__main__":
    text = "Cũng giống mấy khoá Youtube học cũng được"
    print(analyze_sentiment(text))

    input("Press Enter to exit...")  # Giữ cửa sổ mở để xem kết quả