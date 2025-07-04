import React, { useState } from "react";
import "./Features.css";
import FileUploader from "./FileUploader";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
ChartJS.register(ArcElement, Tooltip, Legend);

const SentimentAnalysisTool = () => {
  const [textInput, setTextInput] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFileSelect = (content) => {
    setTextInput(content);
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("http://localhost:5000/api/sentiment/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textInput }),
      });
      const data = await res.json();

      setResult(data);
    } catch (err) {
      setResult({ error: "Có lỗi xảy ra khi gọi API: " + err.message });
    }
    setLoading(false);
  };

  // Chuẩn bị dữ liệu cho Pie Chart
  const pieData = result && !result.error ? {
    labels: ["Tiêu cực", "Trung tính", "Tích cực"],
    datasets: [
      {
        data: [
          result.NEG ? result.NEG * 100 : 0,
          result.NEU ? result.NEU * 100 : 0,
          result.POS ? result.POS * 100 : 0,
        ],
        backgroundColor: ["#ff7675", "#fdcb6e", "#00b894"],
        borderWidth: 1,
      },
    ],
  } : null;

  return (
    <div className="sentiment-analysis-tool">
      <strong>Tùy chọn Phân tích Cảm xúc:</strong>
      <div className="options">
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
          <div className="result-box">
            
            {!result && (
            <div style={{ color: "#888" }}>Kết quả sẽ hiển thị ở đây...</div>
            )}
            
            {result && result.error && (
              <div style={{ color: "red" }}>{result.error}</div>
            )}

            {pieData && (
              <Pie
                data={pieData}
                className="custom-pie-chart"
                options={{
                  plugins: {
                    legend: {
                      display: true,
                      position: "bottom",
                      labels: {
                        usePointStyle: true,
                        boxWidth: 10,
                        padding: 15,
                      },
                    },
                    tooltip: {
                      callbacks: {
                        label: function (context) {
                          return `${context.label}: ${context.parsed.toFixed(2)}%`;
                        },
                      },
                    },
                  },
                  layout: {
                    padding: {
                      top: 10,
                      bottom: 10,
                    },
                  },
                }}
                style={{ maxWidth: 500, margin: "16px auto" }}
              />
            )}

            {result && !result.error && (
              <div style={{ marginTop: 16 }}>
                <strong>Nhận định: </strong>
                <span style={{ color: "#0984e3", fontWeight: 600 }}>
                  {result.label}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SentimentAnalysisTool;