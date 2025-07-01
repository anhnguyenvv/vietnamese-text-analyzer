from utils.vncore import vncore_model
from underthesea import pos_tag, ner

def pos_tagging(text, model='vncorenlp'):
    """
    Performs POS tagging on the input text.
    """
    if model == 'vncorenlp':        
        pos_tags = vncore_model.pos_tag(text)
        pos_tags = [item for sublist in pos_tags for item in sublist]

    elif model == 'underthesea':
        pos_tags = pos_tag(text)
    return pos_tags

def ner_tagging(text, model='vncorenlp'):
    """
    Performs NER tagging on the input text.
    """
    if model == 'vncorenlp':
        ner_tags = vncore_model.ner(text)
        ner_tags = [{'word': word.replace("_", " "), 'label': tag} for item in ner_tags for word, tag in item]
    elif model == 'underthesea':
        ner_tags = ner(text)
        ner_tags = [{'word': word, 'label': tag} for word, _, _, tag in ner_tags]
    return ner_tags

if __name__ == '__main__':
    # Example usage
    text = '''
1. Quy chế này quy định chung về tổ chức và quản lý đào tạo trình độ đại học 
theo phương thức đào tạo tín chỉ của Trường Đại học Khoa học Tự nhiên,
 Đại học Quốc Gia Thành Phố Hồ Chí Minh (sau đây gọi tắt là Trường) bao gồm: Chương 
trình đào tạo và thời gian học tập; hình thức và phương thức tổ chức đào tạo; lập kế 
hoạch và tổ chức giảng dạy; đánh giá kết quả học tập và cấp bằng tốt nghiệp; những 
quy định khác đối với sinh viên.'''
    print("Original Text:", text)
    
    pos_tags = pos_tagging(text)
    print("POS Tags:", pos_tags) 
    pos_tags = pos_tagging(text, model='underthesea')
    print("POS Tags (Underthesea):", pos_tags) 
    
    ner_tags = ner_tagging(text)
    print("NER Tags:", ner_tags) 
    ner_tags = ner_tagging(text, model='underthesea')
    print("NER Tags (Underthesea):", ner_tags) 