from transformers import AutoModelForSequenceClassification, AutoTokenizer, AutoConfig
from config.settings import Config
from modules.preprocessing import normalize_text
import torch
from torch import nn
from transformers import AutoModel, BertModel
from types import SimpleNamespace
class PhoBert_Classifier(nn.Module):

    def __init__(self, freeze_bert=False, num_classes=2, drop=0.3):
        super(PhoBert_Classifier, self).__init__()

        self.num_classes = num_classes

        self.bert = AutoModel.from_pretrained('vinai/phobert-base')
        if freeze_bert:
            for param in self.bert.parameters():
                param.requires_grad = False
        
        self.drop = nn.Dropout(drop)
        self.fc = nn.Linear(self.bert.config.hidden_size, self.num_classes)
        # nn.init.normal_(self.fc.weight, std=0.02)
        # nn.init.normal_(self.fc.bias, 0)
        
    def forward(self, input_ids, attention_mask):
        last_hidden_state, output = self.bert(
            input_ids=input_ids,
            attention_mask=attention_mask,
            return_dict=False
        )
        x = self.drop(output)
        x = self.fc(x)
        return SimpleNamespace(logits=x)
    
    
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
        if model_name == "vispam":
            self.model = PhoBert_Classifier(num_classes=2).to(Config.DEVICE)
            self.model.load_state_dict(torch.load(Config.MODELS_DIR[model_name], map_location=Config.DEVICE))
            self.tokenizer = AutoTokenizer.from_pretrained('vinai/phobert-base')
            self.id2label = {0: "no-spam", 1: "spam"}
        if model_name == "topic_classification":
            self.model = PhoBert_Classifier(num_classes=10).to(Config.DEVICE)
            self.model.load_state_dict(torch.load(Config.MODELS_DIR[model_name], map_location=Config.DEVICE))
            self.tokenizer = AutoTokenizer.from_pretrained('vinai/phobert-base')
            self.id2label = {0: 'Kinh doanh',
                        1: 'Phap luat',
                        2: 'Suc khoe',
                        3: 'Doi song',
                        4: 'Chinh tri Xa hoi',
                        5: 'The gioi',
                        6: 'The thao',
                        7: 'Vi tinh',
                        8: 'Khoa hoc',
                        9: 'Van hoa'}
        self.num_labels = len(self.id2label)

    def encode_data(self, text):
        if self.model_name == "essay_identification":
            # For essay identification, we assume the input is a dictionary with 'text' key
            return self.tokenizer(text, return_tensors='pt', max_length=512, truncation=True, padding=True)
        if self.model_name == "vispam":
            # For vispam, we assume the input is a single string
            return self.tokenizer(text, padding="max_length", max_length=100,
                                  return_tensors='pt', truncation=True, add_special_tokens=True)
        return self.tokenizer(text, padding="max_length", max_length=2,
                              return_tensors='pt', truncation=True, add_special_tokens=True)

    def classify(self, text, model_name= "essay_identification", num_labels= None, max_length=512):
        """
        Classify the input text and return the predicted label.
        """
        if not text:
            raise ValueError("Input text cannot be empty.")
        if model_name and model_name != self.model_name:
            self.model_name = model_name
            self._load_model_and_tokenizer(self.model_name)

        inputs = self.encode_data(text)
        outputs = self.model(input_ids=inputs['input_ids'], attention_mask=inputs['attention_mask'] if 'attention_mask' in inputs else None)
        logits = outputs.logits
        predicted_label = logits.argmax(dim=-1).item()
        return predicted_label
    
if __name__ == "__main__":
    classifier = TextClassifier()
    text = "Bộ Công Thương xóa một tổng cục, giảm nhiều đầu mối"
    predicted_label = classifier.classify(text)
    print("Predicted Label:", classifier.id2label.get(predicted_label, predicted_label))
    print("Model Name:", classifier.model_name)
    text = "Shop giao hàng khá nhanh. Chất liệu cũng được dày dặn che sáng tốt, gia công hơi ẩu vạt dài vạt ngắn"
    predicted_label = classifier.classify(text, model_name="vispam")
    print("Predicted Label for vispam:", classifier.id2label.get(predicted_label, predicted_label))