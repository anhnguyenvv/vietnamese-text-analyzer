import React, { useState } from "react";
import axios from "axios";
import "./Features.css";
import { API_BASE, TEST_SAMPLE_PATHS }  from "../../config"; // Địa chỉ API backend
import FileUploader from "./FileUploader";
import { Bar } from "react-chartjs-2";
import { Chart, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from "chart.js";
Chart.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const StatisticsTool = ({ sharedTextInput, setSharedTextInput, sharedFile, setSharedFile }) => {
  const [textInput, setTextInput] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [removeStopwords, setRemoveStopwords] = useState(true);
  const [sampleUrls] = useState(TEST_SAMPLE_PATHS.stats);
  
  const handleFileSelect = (content) => {
    setTextInput(content);
    setResult(null);
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setResult(null);
    if (!textInput.trim()) {
      setResult({ error: "Vui lòng nhập văn bản hoặc tải tệp lên!" });
      setLoading(false);
      return;
    }
    try {
      const res = await axios.post(`${API_BASE}/api/statistics/statistics`, {
        text: textInput,
        remove_stopwords: removeStopwords
      });
      setResult(res.data);
    } catch (err) {
      setResult({ error: "Có lỗi xảy ra: " + (err.response?.data?.error || err.message) });
    }
    setLoading(false);
  };

  const renderStats = (stats) => {
    if (!stats) return null;
    const {
      num_sentences,
      num_words,
      num_chars,
      avg_sentence_len,
      vocab_size,
      num_stopwords,
      num_digits,
      num_special_chars,
      num_emojis
    } = stats;
  
    return (
      <>
        <div><strong>Số câu:</strong> {num_sentences}</div>
        <div><strong>Số từ:</strong> {num_words}</div>
        <div><strong>Số ký tự:</strong> {num_chars}</div>
        <div><strong>Số chữ số:</strong> {num_digits}</div>
        <div><strong>Số ký tự đặc biệt:</strong> {num_special_chars}</div>
        <div><strong>Số emoji:</strong> {num_emojis}</div>
        <div><strong>Độ dài TB câu:</strong> {avg_sentence_len}</div>
        <div><strong>Kích thước từ vựng:</strong> {vocab_size}</div>
        <div><strong>Số stopword:</strong> {num_stopwords}</div>
        <div><strong>Tỉ lệ stopword:</strong> {((100 * num_stopwords) / num_words).toFixed(2)}%</div>
        
      </>
    );
  };
  const getTopWords = (word_freq, n = 10) => {
    if (!word_freq) return { labels: [], data: [] };
    const sorted = Object.entries(word_freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n);
    return {
      labels: sorted.map(([word]) => word),
      data: sorted.map(([, count]) => count)
    };
  };
  return (
    <div className="statistics-tool">
      <strong>Tùy chọn thống kê:</strong>
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

      <FileUploader onFileSelect={handleFileSelect} sampleUrls={sampleUrls} />

      <div className="text-area-container">
        <div className="input-area">
          <label>Văn bản</label>
          <textarea
            rows={10}
            placeholder="Nhập văn bản tại đây..."
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="analyze-button" onClick={handleAnalyze} disabled={loading}>
              Phân tích
            </button>

             {loading && (
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: 14, color: "#888", marginBottom: 4 }}>
                  Đang phân tích...
                </div>
                <div className="loading-bar-container">
                  <div className="loading-bar" />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="result-area">
          <label>Kết quả</label>

          {/* KHUNG TRẮNG GÓI PHẦN THỐNG KÊ */}
          <div className="result-box">
            {result && result.error && (
              <div style={{ color: "red" }}>{result.error}</div>
            )}

            {result && !result.error && result.stats && renderStats(result.stats)}

            {!result && (
              <div style={{ color: "#888" }}>Kết quả sẽ hiển thị ở đây...</div>
            )}
          </div>

         
        </div>
      </div>
          {result && !result.error && (
            <div className="result-visualizations">
              {result.stats.word_freq && (() => {
                const { labels, data } = getTopWords(result.stats.word_freq, 10);
                return (
                  <div style={{ margin: "16px auto", maxWidth: 500 }}>
                    <strong>Biểu đồ các từ xuất hiện nhiều nhất:</strong>
                    <Bar
                      data={{
                        labels,
                        datasets: [
                          {
                            label: "Số lần xuất hiện",
                            data,
                            backgroundColor: "#1976d2",
                          },
                        ],
                      }}
                      options={{
                        indexAxis: "y",
                        plugins: {
                          legend: { display: false },
                          tooltip: { enabled: true },
                        },
                        scales: {
                          x: { beginAtZero: true, ticks: { precision: 0 } },
                        },
                        backgroundColor: "#fff",
                      }}
                      style={{ background: "#fff", borderRadius: 8 }}
                    />
                  </div>
                );
              })()}

              {result.wordcloud && (
                <div style={{ margin: "16px auto", maxWidth: 500 }}>
                  <strong>Word Cloud:</strong>
                  <br />
                  <img
                    src={`data:image/png;base64,${result.wordcloud}`}
                    alt="Word Cloud"
                    style={{ maxWidth: "100%", margin: "10px 0", borderRadius: 8 }}
                  />
                </div>
              )}
            </div>
        )}

    </div>
  );
};

export default StatisticsTool;