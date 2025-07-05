from transformers import AutoModelForSequenceClassification, AutoTokenizer, AutoConfig
from config.settings import Config
import pandas as pd
import torch
from modules.preprocessing import normalize_text
import numpy as np

print("Loading sentiment analysis model..." + Config.MODELS_DIR['sentiment'])

LABEL_MAP = AutoConfig.from_pretrained(Config.MODELS_DIR['sentiment']).id2label

# Load model và tokenizer
model = AutoModelForSequenceClassification.from_pretrained(Config.MODELS_DIR['sentiment']).to(Config.DEVICE)
tokenizer = AutoTokenizer.from_pretrained(Config.MODELS_DIR['sentiment'], use_fast=False)


def analyze_sentiment(text, max_length=256):
    if not text:
        return {"NEG": 0.0, "NEU": 0.0, "POS": 0.0, "label": "NaN"}

    input_ids = torch.tensor([tokenizer.encode(text, max_length=max_length, truncation=True)]).to(Config.DEVICE)

    with torch.no_grad():
        out = model(input_ids)
        scores = out.logits.softmax(dim=-1).cpu().numpy()[0]

    # Print labels and scores
    ranking = np.argsort(scores)
    ranking = ranking[::-1]
    result = {}
    for i in range(scores.shape[0]):
        l = LABEL_MAP[ranking[i]]
        s = scores[ranking[i]]
        result[l] = round(float(s), 4)
    max_idx = int(ranking[0])
    result['label'] = LABEL_MAP[max_idx]
    return result   

def analyze_sentiment_file(uploaded_file, text_column='text'):
    """
    Nhận file CSV hoặc TXT, trả về DataFrame kết quả phân tích cảm xúc.
    """
    # Đọc dữ liệu
    if uploaded_file.name.endswith('.csv'):
        df = pd.read_csv(uploaded_file)
        texts = df[text_column].astype(str).tolist()
    elif uploaded_file.name.endswith('.txt'):
        texts = [line.strip() for line in uploaded_file if line.strip()]
    else:
        raise ValueError("Chỉ hỗ trợ file .csv hoặc .txt")

    # Phân tích cảm xúc từng dòng
    results = []
    for text in texts:
        res = analyze_sentiment(text)
        results.append({
            "text": text,
            "label": res["label"],
            "score": res["score"]
        })
    return pd.DataFrame(results)
  
    
# Ví dụ sử dụng
if __name__ == "__main__":
    text = "Cũng giống mấy khoá Youtube học cũng được"
    print(analyze_sentiment(text))

    input("Press Enter to exit...")  # Giữ cửa sổ mở để xem kết quả