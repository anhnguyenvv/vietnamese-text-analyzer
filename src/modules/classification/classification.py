from transformers import AutoModelForSequenceClassification, AutoTokenizer, AutoConfig
from config.settings import Config
from modules.preprocessing import normalize_text
class TextClassifier:
    def __init__(self, model_name="essay_identification", num_labels=5):
        self.model_name = model_name or Config.MODEL_NAME
        self.num_labels = num_labels    
        self._load_model_and_tokenizer(self.model_name, self.num_labels)

    def _load_model_and_tokenizer(self, model_name, num_labels):
        if model_name == "essay_identification":
            self.tokenizer = AutoTokenizer.from_pretrained(Config.MODELS_DIR[model_name], use_fast=False)
            self.model = AutoModelForSequenceClassification.from_pretrained(Config.MODELS_DIR[model_name], num_labels=num_labels)
        if model_name == "":
            pass
        config = AutoConfig.from_pretrained(Config.MODELS_DIR[model_name])
        # Lấy ánh xạ id2label nếu có, nếu không thì trả về số thứ tự
        self.id2label = getattr(config, "id2label", {i: str(i) for i in range(self.num_labels)})

    def classify(self, text, model_name= "", num_labels= None, max_length=512):
        """
        Classify the input text and return the predicted label.
        """
        if not text:
            raise ValueError("Input text cannot be empty.")
        if model_name and model_name != self.model_name:
            self.model_name = model_name
            self.num_labels = num_labels or self.num_labels
            self._load_model_and_tokenizer(self.model_name, self.num_labels)

        inputs = self.tokenizer(text, return_tensors='pt', max_length=max_length, truncation=True, padding=True)
        outputs = self.model(**inputs)
        logits = outputs.logits
        predicted_label = logits.argmax(dim=-1).item()
        return predicted_label
    
if __name__ == "__main__":
    classifier = TextClassifier()
    text = "Bộ Công Thương xóa một tổng cục, giảm nhiều đầu mối"
    predicted_label = classifier.classify(text)
    print("Predicted Label:", classifier.id2label.get(predicted_label, predicted_label))