from pathlib import Path
import os
import torch
BASE_DIR = Path(__file__).resolve().parent.parent

class Config:
    DEBUG = os.getenv('DEBUG', 'False') == 'True'
    SECRET_KEY = os.getenv('SECRET_KEY', '')
    
    # Database configuration
    DATABASE_URI = os.getenv('DATABASE_URI', 'sqlite:///db.sqlite3')
    BATCH_SIZE = int(os.getenv('BATCH_SIZE', 4))
    DEVICE = 'cuda' if torch.cuda.is_available() else 'cpu'
    # NLP model settings
    VNCORENLP_DIR = os.getenv('VNCORENLP_DIR', os.path.join(BASE_DIR, "model/vncorenlp/VnCoreNLP-1.2.jar"))
    MODELS_DIR = {
        'vispam': os.getenv('VISPAM_MODEL', os.path.join(BASE_DIR, "model/vispam/PhoBERT_vispamReview.pth")),
        'topic_classification': os.getenv('TOPIC_CLASSIFICATION_MODEL', os.path.join(BASE_DIR, "model/clf/PhoBERT_topic_classification.pth")),
        'sentiment': os.getenv('SENTIMENT_MODEL', "5CD-AI/Vietnamese-Sentiment-visobert"),
        'essay_identification': os.getenv('ESSAY_ID_MODEL', "PaulTran/vietnamese_essay_identify"),       
        'summarization': os.getenv('SUMMARIZATION_MODEL', "VietAI/vit5-base-vietnews-summarization"),
        'spellcheck': os.getenv('SPELLCHECK_MODEL', "bmd1905/vietnamese-correction"),
    }
    NUM_LABELS = {
        'essay_identification': int(os.getenv('ESSAY_ID_NUM_LABELS', 5)),

    }