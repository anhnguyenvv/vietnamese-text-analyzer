import React, { useState } from "react";
import axios from "axios";
import "./Features.css";
import { API_BASE, TEST_SAMPLE_PATHS }  from "../../config"; // Địa chỉ API backend
import FileUploader from "./FileUploader";
import { Bar } from "react-chartjs-2";
import { Chart, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from "chart.js";

const WORD_CLOUD_COLORS = ["#1976d2", "#00a86b", "#8e44ad", "#e67e22", "#16a085", "#d35400", "#2c3e50"];

const StatisticsTool = ({ sharedTextInput, setSharedTextInput, sharedFile, setSharedFile }) => {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [removeStopwords, setRemoveStopwords] = useState(true);
  const [sampleUrls] = useState(TEST_SAMPLE_PATHS.stats);
  
  const handleFileSelect = (content) => {
    setSharedTextInput(content);
    setResult(null);
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setResult(null);
    if (!sharedTextInput.trim()) {
      setResult({ error: "Vui lòng nhập văn bản hoặc tải tệp lên!" });
      setLoading(false);
      return;
    }
    try {
      const res = await axios.post(`${API_BASE}/api/statistics/statistics`, {
        text: sharedTextInput,
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

  const getWordCloudItems = (wordFreq, maxWords = 120) => {
    if (!wordFreq) return [];

    const sorted = Object.entries(wordFreq)
      .filter(([word, count]) => word && Number(count) > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxWords);

    if (sorted.length === 0) {
      return [];
    }

    const counts = sorted.map(([, count]) => Number(count));
    const maxCount = Math.max(...counts);
    const minCount = Math.min(...counts);
    const spread = Math.max(maxCount - minCount, 1);

    const cloudItems = sorted.map(([word, count], index) => {
      const normalized = (Number(count) - minCount) / spread;
      const fontSize = 14 + Math.round(normalized * 30);
      return {
        word,
        count: Number(count),
        fontSize,
        color: WORD_CLOUD_COLORS[index % WORD_CLOUD_COLORS.length],
        rotate: index % 5 === 0 ? -12 : index % 5 === 3 ? 10 : 0,
      };
    });

    for (let i = cloudItems.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [cloudItems[i], cloudItems[j]] = [cloudItems[j], cloudItems[i]];
    }

    return cloudItems;
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

      <FileUploader onFileSelect={handleFileSelect} sampleUrls={sampleUrls} sharedFile={sharedFile} setSharedFile={setSharedFile} />

      <div className="text-area-container">
        <div className="input-area">
          <label>Văn bản</label>
          <textarea
            rows={10}
            placeholder="Nhập văn bản tại đây..."
            value={sharedTextInput}
            onChange={(e) => setSharedTextInput(e.target.value)}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="analyze-button" onClick={handleAnalyze} disabled={loading}>
              Phân tích
            </button>

             {loading && (
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: 14, color: "#888", marginBottom: 4 }}>
                  Đang xử lý...
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
                const cloudItems = getWordCloudItems(result.stats.word_freq, 120);
                return (
                  <div
                    style={{
                      margin: "16px auto",
                      maxWidth: 980,
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 16,
                      alignItems: "stretch",
                    }}
                  >
                    <div
                      style={{
                        flex: "1 1 420px",
                        minWidth: 320,
                        border: "1px solid var(--border-color)",
                        borderRadius: 10,
                        background: "var(--bg-surface)",
                        padding: 12,
                      }}
                    >
                      <div style={{ marginBottom: 10 }}>
                        <strong>Biểu đồ các từ xuất hiện nhiều nhất:</strong>
                      </div>
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
                        style={{ background: "var(--bg-surface)", borderRadius: 8, border: "1px solid var(--border-color)", padding: 8 }}
                      />
                    </div>

                    <div
                      style={{
                        flex: "1 1 420px",
                        minWidth: 320,
                        border: "1px solid var(--border-color)",
                        borderRadius: 10,
                        background: "var(--bg-surface)",
                        padding: 12,
                      }}
                    >
                      <div style={{ marginBottom: 10 }}>
                        <strong>Word Cloud:</strong>
                      </div>
                      <div
                        style={{
                          minHeight: 300,
                          display: "flex",
                          flexWrap: "wrap",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "10px 14px",
                          padding: 14,
                          borderRadius: 10,
                          border: "1px solid var(--border-color)",
                          background: "var(--bg-surface)",
                        }}
                      >
                        {cloudItems.map((item) => (
                          <span
                            key={item.word}
                            title={`${item.word}: ${item.count}`}
                            style={{
                              fontSize: `${item.fontSize}px`,
                              color: item.color,
                              fontWeight: 700,
                              lineHeight: 1,
                              transform: `rotate(${item.rotate}deg)`,
                              display: "inline-block",
                              userSelect: "none",
                            }}
                          >
                            {item.word}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
        )}

    </div>
  );
};

Chart.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export default StatisticsTool;