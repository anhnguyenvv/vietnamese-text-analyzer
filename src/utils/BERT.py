
from torch import nn
from transformers import AutoModel
from types import SimpleNamespace
class Bert_Classifier(nn.Module):

    def __init__(self, name_model='vinai/phobert-base', freeze_bert=False, num_classes=2, drop=0.3):
        super(Bert_Classifier, self).__init__()

        self.num_classes = num_classes

        self.bert = AutoModel.from_pretrained(name_model)
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
  