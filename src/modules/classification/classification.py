from transformers import AutoModelForSequenceClassification, AutoTokenizer, AutoConfig
from config.settings import Config
from modules.preprocessing import normalize_text
import torch
from modules.preprocessing import tokenize_words, normalize_text
from utils.BERT import Bert_Classifier
_MODEL_REGISTRY = {}

def get_classifier(model_name):
    if model_name not in _MODEL_REGISTRY:
        _MODEL_REGISTRY[model_name] = TextClassifier(model_name)
    return _MODEL_REGISTRY[model_name]

class TextClassifier:
    def __init__(self, model_name="essay_identification"):
        self.model_name = model_name or Config.MODEL_NAME
        self.num_labels = 2    
        self._load_model_and_tokenizer(self.model_name)

    def _load_model_and_tokenizer(self, model_name):
        config = None
        if model_name == "essay_identification":
            self.tokenizer = AutoTokenizer.from_pretrained(Config.MODELS_DIR[model_name], use_fast=False)
            self.model = AutoModelForSequenceClassification.from_pretrained(Config.MODELS_DIR[model_name], num_labels=5)
            config = AutoConfig.from_pretrained(Config.MODELS_DIR[model_name])
            self.id2label = getattr(config, "id2label", {i: str(i) for i in range(self.num_labels)})
        if model_name == "vispam-Phobert":
            self.model = Bert_Classifier(name_model='vinai/phobert-base', num_classes=2).to(Config.DEVICE)
            self.model.load_state_dict(torch.load(Config.MODELS_DIR[model_name], map_location=Config.DEVICE), strict=False)
            self.tokenizer = AutoTokenizer.from_pretrained('vinai/phobert-base')
            self.id2label = {0: "no-spam", 1: "spam"}
        if model_name == "vispam-VisoBert":
            self.model = Bert_Classifier(name_model='uitnlp/visobert', num_classes=2).to(Config.DEVICE)
            self.model.load_state_dict(torch.load(Config.MODELS_DIR[model_name], map_location=Config.DEVICE), strict=False)
            self.tokenizer = AutoTokenizer.from_pretrained('uitnlp/visobert')
            self.id2label = {0: "no-spam", 1: "spam"}
        if model_name == "topic_classification":
            self.model = Bert_Classifier(name_model='vinai/phobert-base', num_classes=10).to(Config.DEVICE)
            self.model.load_state_dict(torch.load(Config.MODELS_DIR[model_name], map_location=Config.DEVICE), strict=False)
            self.tokenizer = AutoTokenizer.from_pretrained('vinai/phobert-base')
            self.id2label = {0: 'Kinh doanh',
                        1: 'Pháp luật',
                        2: 'Sức khỏe',
                        3: 'Đời sống',
                        4: 'Chính trị - Xã hội',
                        5: 'Thế giới',
                        6: 'Thể thao',
                        7: 'Vi tính',
                        8: 'Khoa học',
                        9: 'Văn hóa_giáo dục'}
        self.num_labels = len(self.id2label)

    def encode_data(self, text):
        if self.model_name == "essay_identification":
            # For essay identification, we assume the input is a dictionary with 'text' key
            return self.tokenizer(text, return_tensors='pt', max_length=512, truncation=True, padding=True)
        
        if self.model_name == "vispam":
            # For vispam, we assume the input is a single string
            return self.tokenizer(text, padding="max_length", max_length=100,
                                  return_tensors='pt', truncation=True, add_special_tokens=True)
        
        return self.tokenizer(text, padding="max_length", max_length=256,
                              return_tensors='pt', truncation=True, return_attention_mask=True)

    
    def classify(self, text, model_name= "essay_identification"):
        """
        Classify the input text and return the predicted label.
        """
        if not text:
            raise ValueError("Input text cannot be empty.")
        if model_name and model_name != self.model_name:
            self.model_name = model_name
            self._load_model_and_tokenizer(self.model_name)
        text = tokenize_words(normalize_text(text))
        inputs = self.encode_data(text)
        outputs = self.model(input_ids=inputs['input_ids'], attention_mask=inputs['attention_mask'] if 'attention_mask' in inputs else None)
        logits = outputs.logits
        #predicted_label = logits.argmax(dim=-1).item()
        
        probs = torch.softmax(logits, dim=-1)
        predicted_label = probs.argmax(dim=-1).item()
        confidence = probs[0, predicted_label].item()
        return {
            "predicted_label": predicted_label,
            "confidence": confidence
        }

for model_name in ["essay_identification", "vispam", "topic_classification"]:
    get_classifier(model_name)
       
if __name__ == "__main__":
    classifier = TextClassifier('vispam-VisoBert')
    text = "Bộ Công Thương xóa một tổng cục, giảm nhiều đầu mối"
    predicted = classifier.classify(text, model_name="vispam-VisoBert")
    print("Predicted Label:", predicted['label_name'])
    print("Confidence:", predicted['confidence'])
   # print("All Labels:", predicted['all_labels'])
    print("Model Name:", classifier.model_name)
