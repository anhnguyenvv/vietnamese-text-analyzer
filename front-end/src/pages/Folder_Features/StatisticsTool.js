import React, { useState } from "react";
import axios from "axios";
import "./Features.css";
import FileUploader from "./FileUploader";

// Bảng chuyển đổi nhãn POS sang tiếng Việt
const POS_LABELS = {
  N: "Danh từ",
  V: "Động từ",
  A: "Tính từ",
  ADV: "Trạng từ",
  P: "Đại từ",
  L: "Định từ",
  M: "Số từ",
  R: "Giới từ",
  E: "Thán từ",
  C: "Liên từ",
  T: "Trợ từ",
  I: "Cảm thán",
  Y: "Từ viết tắt",
  // Thêm các nhãn khác nếu cần
};

const StatisticsTool = () => {
  const [textInput, setTextInput] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [removeStopwords, setRemoveStopwords] = useState(true);

  const handleFileSelect = (content) => {
    setTextInput(content);
    setResult(null);
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await axios.post("http://localhost:5000/api/statistics/statistics", {
        text: textInput,
        remove_stopwords: removeStopwords
      });
      setResult(res.data);
    } catch (err) {
      setResult({ error: "Có lỗi xảy ra: " + (err.response?.data?.error || err.message) });
    }
    setLoading(false);
  };

  // Helper để render thống kê đẹp hơn
  const renderStats = (stats) => {
    if (!stats) return null;
    const {
      num_sentences,
      num_words,
      num_chars,
      avg_sentence_len,
      avg_word_len,
      vocab_size,
      num_stopwords,
      pos_counts,
      num_digits,
      num_special_chars,
      num_emojis
    } = stats;

    return (
      <div style={{
        background: "#fff",
        border: "1px solid #e0e0e0",
        borderRadius: 8,
        padding: 20,
        margin: "0 auto",
        maxWidth: 500,
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
      }}>
        <div><strong>Số câu:</strong> {num_sentences}</div>
        <div><strong>Số từ:</strong> {num_words}</div>
        <div><strong>Số ký tự:</strong> {num_chars}</div>
        <div><strong>Số chữ số:</strong> {num_digits}</div>
        <div><strong>Số ký tự đặc biệt:</strong> {num_special_chars}</div>
        <div><strong>Số emoji:</strong> {num_emojis}</div>
        <div><strong>Độ dài TB câu:</strong> {avg_sentence_len}</div>
        <div><strong>Độ dài TB từ:</strong> {avg_word_len}</div>
        <div><strong>Kích thước từ vựng:</strong> {vocab_size}</div>
        <div><strong>Số stopword:</strong> {num_stopwords}</div>
        <div><strong>Tỉ lệ stopword:</strong> {((100 * num_stopwords) / num_words).toFixed(2)}%</div>
        {pos_counts && (
          <div style={{ marginTop: 8 }}>
            <strong>Thống kê từ loại:</strong>
            <ul>
              {Object.entries(pos_counts).map(([tag, count], idx) => (
                <li key={idx}>
                  <strong>{POS_LABELS[tag] || tag}</strong>: {count}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="statistics-tool">
      <strong>Tùy chọn Thống kê:</strong>
      <div className="options">
        <label>
          <input
            type="checkbox"
            checked={removeStopwords}
            onChange={(e) => setRemoveStopwords(e.target.checked)}
          />
          Loại bỏ từ dừng
        </label>
      </div>

      <FileUploader onFileSelect={handleFileSelect} />

      <div className="text-area-container">
        <div className="input-area">
          <label>Văn bản</label>
          <textarea
            rows={10}
            placeholder="Nhập văn bản tại đây..."
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
          />
          <button className="analyze-button" onClick={handleAnalyze} disabled={loading}>
            {loading ? "Đang phân tích..." : "Phân tích"}
          </button>
        </div>

        <div className="result-area"
          style={{
            minHeight: 220, // hoặc cùng height với textarea
            height: "100%",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
          }}>
          <label>Kết quả</label>
          {result && result.error && (
            <div style={{ color: "red" }}>{result.error}</div>
          )}
          {result && !result.error && (
            <div>
              {renderStats(result.stats)}
              {result.plot && (
                <div style={{ margin: "16px auto", maxWidth: 500, background: "#fff", borderRadius: 8, padding: 10 }}>
                  <strong>Biểu đồ tần suất từ:</strong>
                  <br />
                  <img
                    src={`data:image/png;base64,${result.plot}`}
                    alt="Plot"
                    style={{ maxWidth: "100%", margin: "10px 0" }}
                  />
                </div>
              )}
              {result.wordcloud && (
                <div style={{ margin: "16px auto", maxWidth: 500, background: "#fff", borderRadius: 8, padding: 10 }}>
                  <strong>Word Cloud:</strong>
                  <br />
                  <img
                    src={`data:image/png;base64,${result.wordcloud}`}
                    alt="Word Cloud"
                    style={{ maxWidth: "100%", margin: "10px 0" }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatisticsTool;