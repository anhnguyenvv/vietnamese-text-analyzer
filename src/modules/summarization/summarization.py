from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
from config.settings import Config

tokenizer = AutoTokenizer.from_pretrained(Config.MODELS_DIR['summarization'])
model = AutoModelForSeq2SeqLM.from_pretrained(Config.MODELS_DIR['summarization'])

def summarize_text(text: str, max_length=256, min_length=30) -> str:
    """
    Tóm tắt văn bản tiếng Việt.
    """
    text = "summarization " + ": " + text + " </s>"
    enc = tokenizer(text, return_tensors="pt", max_length=1024, truncation=True)
    outputs = model.generate(
        **enc,
        max_length=max_length,
        min_length=min_length,
        num_beams=4
    )
    res = ""
    for output in outputs:
        line = tokenizer.decode(output, skip_special_tokens=True, clean_up_tokenization_spaces=True)
        if line:
            res += line + " "
    return res
# Ví dụ sử dụng
if __name__ == "__main__":
    text = "Summary có nghĩa là bản tóm tắt. Hiểu một cách đơn giản summary paragraph là ghi lại những ý chính của một đoạn văn, bài báo, hay thậm chí là những gì bạn nghe được bằng ngôn ngữ của chính bạn"
    print(summarize_text(text, max_length=500))
    while True:
        text = input("Nhập văn bản cần tóm tắt (hoặc 'exit' để thoát): ")
        if text.lower() == 'exit' or text.lower() == 'quit' or not text:
            print("Thoát chương trình.")
            break
        max_length = int(input("Nhập độ dài tối đa của tóm tắt (mặc định 500): ") or 500)
        sum = summarize_text(text, max_length=max_length)
        print("Tóm tắt: ", sum)
        print("Độ dài: ", len(sum))
