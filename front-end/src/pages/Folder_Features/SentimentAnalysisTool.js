// ...existing imports...
import React, { useState } from "react";
import "./Features.css";
import FileUploader from "./FileUploader";
import { Pie } from "react-chartjs-2";
import Papa from "papaparse";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
ChartJS.register(ArcElement, Tooltip, Legend);

const SentimentAnalysisTool = () => {
  const [textInput, setTextInput] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [csvResultUrl, setCsvResultUrl] = useState(null);
  const [csvResultPreview, setCsvResultPreview] = useState([]);
  const [csvDownloadName, setCsvDownloadName] = useState("sentiment_result.csv");
  const [selectedModel, setSelectedModel] = useState("sentiment"); // Thêm state chọn model

  
  const handleFileSelect = (content, file) => {
    setTextInput(content);
    setSelectedFile(file || null);

  };


  const handleAnalyze = async () => {
    setLoading(true);
    setResult(null);
    setCsvResultUrl(null);
    try {
      const res = await fetch("http://localhost:5000/api/sentiment/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textInput, model_name: selectedModel }), // Gửi model_name
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setResult({ error: "Có lỗi xảy ra khi gọi API: " + err.message });
    }
    setLoading(false);
  };

  // Xử lý file CSV
  const handleAnalyzeFile = async () => {
    if (!selectedFile || !selectedFile.name.endsWith(".csv")) {
      alert("Vui lòng chọn file CSV hợp lệ!");
      return;
    }
    setLoading(true);
    setResult(null);
    setCsvResultUrl(null);
    setCsvResultPreview([]);
    setCsvDownloadName("sentiment_result.csv");
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      const res = await fetch("http://localhost:5000/api/sentiment/analyze-file", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        setCsvResultUrl(url);

        // Đặt tên file kết quả dựa trên file gốc
        const baseName = selectedFile.name.replace(/\.csv$/i, "");
        setCsvDownloadName(`${baseName}_result.csv`);

        // Đọc trướce kết quả để xem trước
        const text = await blob.text();
        const parsed = Papa.parse(text.trim(), { skipEmptyLines: true });
        const previewRows = parsed.data; 
        setCsvResultPreview(previewRows);

        setResult({ message: "Phân tích file CSV thành công. Bạn có thể xem trước và tải kết quả bên dưới." });
      } else {
        const data = await res.json();
        setResult({ error: data.error || "Có lỗi xảy ra khi xử lý file." });
      }
    } catch (err) {
      setResult({ error: "Có lỗi xảy ra khi gọi API: " + err.message });
    }
    setLoading(false);
  };
  // Chuẩn bị dữ liệu cho Pie Chart
  const pieData = result && !result.error ? {
    labels: selectedModel === "vispam"
      ? ["No-spam", "Spam"]
      : ["Tiêu cực", "Trung tính", "Tích cực"],
    datasets: [
      {
        data:
          selectedModel === "vispam"
            ? [
                result["no-spam"] ? result["no-spam"] * 100 : 0,
                result["spam"] ? result["spam"] * 100 : 0,
              ]
            : [
                result.NEG ? result.NEG * 100 : 0,
                result.NEU ? result.NEU * 100 : 0,
                result.POS ? result.POS * 100 : 0,
              ],
        backgroundColor:
          selectedModel === "vispam"
            ? ["#00b894", "#d63031"]
            : ["#ff7675", "#fdcb6e", "#00b894"],
        borderWidth: 1,
      },
    ],
  } : null;

  return (
    <div className="sentiment-analysis-tool">
      <strong>Phân tích cảm xúc</strong>
      <div className="options" style={{ marginBottom: 12 }}>
        <label style={{ marginRight: 8 }}>Chọn mô hình:</label>
        <select
          value={selectedModel}
          onChange={e => setSelectedModel(e.target.value)}
          style={{ padding: "4px 8px", borderRadius: 4 }}
        >
          <option value="sentiment">Cảm xúc (POS/NEU/NEG)</option>
          <option value="vispam">Phát hiện Spam (vispam)</option>
        </select>
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
            <button
              className="analyze-button"
              onClick={() => {
                if (selectedFile && selectedFile.name.endsWith(".csv")) {
                  handleAnalyzeFile();
                } else {
                  handleAnalyze();
                }
              }}
              disabled={loading}
            >
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
            <button
              className="analyze-button"
              onClick={() => {
                if (selectedFile && selectedFile.name.endsWith(".csv")) {
                  handleAnalyzeFile();
                } else {
                  handleAnalyze();
                }
              }}
              disabled={loading}
            >
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

            {result && !result.error && result.label && (
              <div style={{ marginTop: 16 }}>
                <strong>Nhận định:  </strong>
                <span style={{ color: "#0984e3", fontWeight: 600 }}>
                  {selectedModel === "vispam"
                    ? (result.label === "spam" ? "Spam" : "Không phải spam")
                    : result.label === "NEG"
                      ? "Tiêu cực"
                      : result.label === "NEU"
                        ? "Trung tính"
                        : "Tích cực"}
                </span>
              </div>
            )}

            {result && result.error && (
              <div style={{ color: "red" }}>{result.error}</div>
            )}

            {pieData && result.label && (
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
            
            {csvResultUrl && (
                <div style={{ marginTop: 16 }}>
                  <strong>Xem trước file kết quả:</strong>
                  <div
                    style={{
                      background: "#fafafa",
                      border: "1px solid #eee",
                      borderRadius: 4,
                      padding: 8,
                      fontFamily: "monospace",
                      fontSize: 13,
                      maxHeight: 220,
                      overflow: "auto",
                      marginBottom: 8,
                    }}
                  >
                    {/* Hiển thị bảng preview */}
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <tbody>
                        {csvResultPreview.map((row, idx) => (
                          <tr key={idx} style={{ background: idx === 0 ? "#e0e0e0" : "inherit" }}>
                            {row.map((cell, cidx) => (
                              <td
                                key={cidx}
                                style={{
                                  border: "1px solid #ddd",
                                  padding: "4px 8px",
                                  fontWeight: idx === 0 ? "bold" : "normal",
                                  whiteSpace: "pre-wrap",
                                }}
                              >
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                </div>
              )}
          </div>
          <div className="csv-download-area">
            {/* Hiển thị nút tải file CSV nếu có kết quả */}
            {csvResultUrl && (
              <div>
                <a
                  href={csvResultUrl}
                  download={csvDownloadName}
                  className="analyze-button"
                  title={`Tải file kết quả: ${csvDownloadName}`}
                  style={{
                    background: "#e0e0e0", // màu xám nhạt
                    color: "#444",
                    textDecoration: "none",
                    padding: "6px 10px",
                    borderRadius: "50%",
                    fontWeight: 500,
                    fontSize: 18,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 2px 8px rgba(0,185,148,0.08)",
                    transition: "background 0.2s",
                    width: 36,
                    height: 36,
                  }}
                >
                  <span role="img" aria-label="download">⬇️</span>
                </a>
                <span style={{ fontSize: 14, fontWeight: 500 }}>
                  {csvDownloadName}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
      
    </div>

  </div>
  );
};  
