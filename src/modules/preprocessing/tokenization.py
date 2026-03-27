import re
from utils.vncore import get_vncore_model
from underthesea import sent_tokenize

def tokenize_words(text):
    """
    Tokenizes the input text into words.
    """
    annotator = get_vncore_model()
    # Normalize whitespace and remove special characters
    #text = re.sub(r'[^\w\s]', '', text)    
    sentences = annotator.tokenize(text)
    tokens = [word.replace("_", " ") for sent in sentences for word in sent]  
    return tokens

def tokenize_sentences(text):
    """
    Tokenizes the input text into sentences.
    """
    sentences = sent_tokenize(text)
    return sentences

if __name__ == '__main__':
    # Example usage
    text = "Hôm nay là một ngày đẹp trời! Tôi đi học và gặp bạn bè."
    print("Original Text:", text)
    words = tokenize_words(text)
    sentences = tokenize_sentences(text)
    print("Words:", words)
    print("Sentences:", sentences)  # Output: ['Hôm nay là một ngày đẹp trời.', 'Tôi đi học và gặp bạn bè.']
