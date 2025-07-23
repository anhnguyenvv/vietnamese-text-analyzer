from transformers import AutoModelForSequenceClassification, AutoTokenizer, AutoConfig
from config.settings import Config
import torch
from utils.BERT import Bert_Classifier
_MODEL_REGISTRY = {}

def get_classifier(model_name):
    if model_name not in _MODEL_REGISTRY:
        if model_name == "essay_identification":
            _MODEL_REGISTRY[model_name] = EssayIdentificationClassifier()
        elif model_name in ["vispam-Phobert", "vispam-VisoBert"]:
            _MODEL_REGISTRY[model_name] = VispamClassifier(model_name)
        elif model_name == "topic_classification":
            _MODEL_REGISTRY[model_name] = TopicClassificationClassifier()
        else:
            _MODEL_REGISTRY[model_name] = BaseClassifier(model_name)
    return _MODEL_REGISTRY[model_name]

class BaseClassifier:
    def __init__(self, model_name):
        self.model_name = model_name
        self.num_labels = 2
        self.id2label = {}
        self.label2id = {}
        self._load_model_and_tokenizer(model_name)
        self.max_length = 256 


    def _load_model_and_tokenizer(self, model_name):
        raise NotImplementedError

    def encode_data(self, text):
        raise NotImplementedError

    def classify(self, text, model_name=None):
        if not text:
            raise ValueError("Input text cannot be empty.")
        if model_name and model_name != self.model_name:
            self.model_name = model_name
            self._load_model_and_tokenizer(self.model_name)
        inputs = self.encode_data(text)
        outputs = self.model(
            input_ids=inputs['input_ids'],
            attention_mask=inputs['attention_mask'] if 'attention_mask' in inputs else None
        )
        logits = outputs.logits
        probs = torch.softmax(logits, dim=-1)
        predicted_label = probs[0].argmax(dim=-1).item()
        result = {
            'label': self.id2label.get(predicted_label, str(predicted_label))
        }
        result['label_id'] = self.label2id.get(result['label'], predicted_label)
        for i in range(self.num_labels):
            result[self.id2label[i]] = round(probs[0, i].item(), 4) 
        return result

class EssayIdentificationClassifier(BaseClassifier):
    def __init__(self): 
        super().__init__("essay_identification")

    def _load_model_and_tokenizer(self, model_name):
        self.tokenizer = AutoTokenizer.from_pretrained(Config.MODELS_DIR[model_name], use_fast=False)
        self.model = AutoModelForSequenceClassification.from_pretrained(Config.MODELS_DIR[model_name], num_labels=5)
        config = AutoConfig.from_pretrained(Config.MODELS_DIR[model_name])
        self.id2label = getattr(config, "id2label", {i: str(i) for i in range(5)})
        self.label2id = {v: k for k, v in self.id2label.items()}
        self.num_labels = len(self.id2label)
        self.max_length = 256 

    def encode_data(self, text):
        return self.tokenizer(text, return_tensors='pt', max_length=self.max_length, truncation=True, padding='max_length')

class VispamClassifier(BaseClassifier):
    def __init__(self, model_name):
        super().__init__(model_name)

    def _load_model_and_tokenizer(self, model_name):
        if model_name == "vispam-Phobert":
            self.model = Bert_Classifier(name_model='vinai/phobert-base', num_classes=2).to(Config.DEVICE)
            self.model.load_state_dict(torch.load(Config.MODELS_DIR[model_name], map_location=Config.DEVICE), strict=False)
            self.tokenizer = AutoTokenizer.from_pretrained('vinai/phobert-base')
        elif model_name == "vispam-VisoBert":
            self.model = Bert_Classifier(name_model='uitnlp/visobert', num_classes=2).to(Config.DEVICE)
            self.model.load_state_dict(torch.load(Config.MODELS_DIR[model_name], map_location=Config.DEVICE), strict=False)
            self.tokenizer = AutoTokenizer.from_pretrained('uitnlp/visobert')
        self.id2label = {0: "no-spam", 1: "spam"}
        self.label2id = {v: k for k, v in self.id2label.items()}
        self.num_labels = 2
        self.max_length = 512 

    def encode_data(self, text):

        return self.tokenizer(text,padding="max_length", max_length=self.max_length,
                              return_tensors='pt', truncation=True, add_special_tokens=True)

class TopicClassificationClassifier(BaseClassifier):
    def __init__(self):
        super().__init__("topic_classification")

    def _load_model_and_tokenizer(self, model_name):
        self.model = Bert_Classifier(name_model='vinai/phobert-base', num_classes=10).to(Config.DEVICE)
        self.model.load_state_dict(torch.load(Config.MODELS_DIR[model_name], map_location=Config.DEVICE), strict=False)
        self.tokenizer = AutoTokenizer.from_pretrained('vinai/phobert-base')
        self.id2label = {
            0: 'Kinh doanh',
            1: 'Pháp luật',
            2: 'Sức khỏe',
            3: 'Đời sống',
            4: 'Chính trị - Xã hội',
            5: 'Thế giới',
            6: 'Thể thao',
            7: 'Vi tính',
            8: 'Khoa học',
            9: 'Văn hóa'
        }
        self.label2id = {v: k for k, v in self.id2label.items()}
        self.num_labels = len(self.id2label)
        self.max_length = 512

    def encode_data(self, text):
        
        return self.tokenizer(text, padding="max_length", max_length=self.max_length,
                              return_tensors='pt', truncation=True, return_attention_mask=True)
# tải sẳn trc các model
for model_name in [
    "essay_identification",
    "vispam-Phobert",
    "vispam-VisoBert",
    "topic_classification"
]:
    get_classifier(model_name)

if __name__ == "__main__":
    # classifier = get_classifier("vispam-VisoBert")
    # text = "Bộ Công Thương xóa một tổng cục, giảm nhiều đầu mối"
    # predicted = classifier.classify(text)
    # print("All Labels:", {k: v for k, v in predicted.items() if k != 'label'})
    # print("Model Name:", classifier.model_name)
 
    classifier = get_classifier("essay_identification")
    text = """
     Chắc chắn một điều rằng, những kẻ ấy vĩnh viễn không thể tự khẳng định vị trí của mình trong xã hội, mãi mãi chỉ có thể sống dưới cái bóng của kẻ khác. Tuy nhiên bên cạnh những con người biết khát vọng và hướng đến những điều tốt đẹp thì trong xã hội vẫn còn đâu đó những con người không biết vươn lên, tự mãn với bản thân. Những người như vậy sẽ làm xã hội đi xuống, họ đáng bị phê phán và lên án

    Nước xanh biếc vào buổi sáng, vàng nhạt vào buổi trưa và đỏ thẫm vào buổi chiều tà. Chỉ có những người yêu dòng sông tha thiết mới cảm nhận được cái đẹp của dòng sông. Nhớ những buổi trưa hè trốn ngủ, ra dòng sông chơi. Nhớ những buổi chiều đi mót khoai, sắn, cả một lũ đem ra bờ sông, lấy lá đa đốt lên rồi nướng ăn. Đứa nào đứa lấy chân tay lấm lem,1,Biểu cảm. Tôi yêu dòng sông quê, yêu cả những người bạn, yêu cả những cánh đồng vàng ươm

    Những thác nước sôi réo ào ạt đổ về từ thượng nguồn, cuồn cuộn chảy bọt tung trắng xoá, có sức tàn phá thật đáng sợ! Những tai hoạ do sông Đà gây ra trở thành mối lo thường xuyên của người dân sinh sống hai bên bờ từ bao đời nay. Em rất thích vẻ đẹp của sông Đà vào mùa nước cạn, nước trong vắt có thể nhìn thấy rõ từng đàn cá lội tung tăng, từng hòn đá, hòn cuội dưới đáy sông. Chiều chiều, chúng em thoả thích bơi lội và nô giỡn. Giữa lòng sông, những doi cát dài nối tiếp nhau. Từng đoàn thuyền của dân kéo ra đây lấy cát. Chúng em sục chân thật sâu vào cát rồi lội ngược dòng với một niềm thích thú khó tả
        """
    while True:
        print("Classifying text:", text)
        predicted = classifier.classify(text)
        print("Predicted Label:", predicted['label'])
        print("Label ID:", predicted['label_id'])
        print("All Labels:", {k: v for k, v in predicted.items() if k != 'label'})
        print("Model Name:", classifier.model_name)
        text = input("Enter text to classify: ")
        if not text.strip():
            break


    # classifier = get_classifier("topic_classification")
    # text = "Việt Nam đã đạt được nhiều thành tựu trong lĩnh vực khoa học và công nghệ."
    # print("Classifying text:", text)
    # predicted = classifier.classify(text)
    # print("Predicted Label:", predicted['label'], "Label ID:", predicted['label_id'])
    # print("Label ID:", predicted['label_id'])
    # print("All Labels:", {k: v for k, v in predicted.items() if k != 'label'})
    # print("Model Name:", classifier.model_name)