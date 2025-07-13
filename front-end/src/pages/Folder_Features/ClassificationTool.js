import React, { useState } from "react";
import "./Features.css";
import FileUploader from "./FileUploader";
import Papa from "papaparse";
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from "chart.js";
import { Bar } from "react-chartjs-2";
ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);


const ClassificationTool = () => {
  const [textInput, setTextInput] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedClassification, setSelectedClassification] = useState("essay_identification");
  
  const [csvResultUrl, setCsvResultUrl] = useState(null);
  const [csvResultPreview, setCsvResultPreview] = useState([]);
  const [csvDownloadName, setCsvDownloadName] = useState("classification_result.csv");
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFileSelect = (content, file) => {
    setTextInput(content);
    setSelectedFile(file || null);
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setResult(null);
    setCsvResultUrl(null);
    try {
      const res = await fetch("http://localhost:5000/api/classification/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
           text: textInput,
           model_name: selectedClassification,
           num_labels: 2  // Số lượng nhãn phân loại, có thể thay đổi tùy theo mô hình
        }),
      });
      const data = await res.json();

      setResult(data);
    } catch (err) {
      setResult({ error: "Có lỗi xảy ra khi gọi API: " + err.message });
    }
    setLoading(false);
  };

  const handleAnalyzeFile = async () => {
    if (!selectedFile || !selectedFile.name.endsWith(".csv")) {
      alert("Vui lòng chọn file CSV hợp lệ!");
      return;
    }
    setLoading(true);
    setResult(null);
    setCsvResultUrl(null);
    setCsvResultPreview([]);
    setCsvDownloadName("classification_result.csv");
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("model_name", selectedClassification);
      const res = await fetch("http://localhost:5000/api/classification/analyze-file", {
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

        // Đọc trước file kết quả để xem trước
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

  const getBarChartData = (result) => {
    if (!result || !result.all_labels) return null;
    const labels = Object.keys(result.all_labels);
    const data = Object.values(result.all_labels).map((v) => Math.round(v * 1000) / 10); // phần trăm
    return {
      labels,
      datasets: [
        {
          label: "Xác suất (%)",
          data,
          backgroundColor: "#0984e3",
        },
      ],
    };
  };

  return (
    <div className="classification-tool">
      <strong>Tùy chọn phân loại:</strong>      
        <div className="options">
          <label>
            <input
              type="radio"
              name="classification"
              value="essay_identification"
              checked={selectedClassification === "essay_identification"}
              onChange={() => setSelectedClassification("essay_identification")}
            />{" "}
            Phân loại kiểu văn bản
          </label>

          <label style={{ marginLeft: 16 }}>
            <input
              type="radio"
              name="classification"
              value="topic_classification"
              checked={selectedClassification === "topic_classification"}
              onChange={() => setSelectedClassification("topic_classification")}
            />{" "}
            Phân loại chủ đề
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

            {result && result.error && (
              <div style={{ color: "red" }}>{result.error}</div>
            )}

            {result && !result.error && result.label_name &&(
              <div style={{ marginTop: 16 }}>
                <strong>Nhận định: </strong>
                <span style={{ color: "#0984e3", fontWeight: 600 }}>
                  {result.label_name}
                </span>
              </div>
            )}
            {result && !result.error && result.all_labels && (
            <div style={{ maxWidth: 420, margin: "24px auto 0" }}>
              <Bar
                data={getBarChartData(result)}
                options={{
                  responsive: true,
                  plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: ctx => `${ctx.parsed.y}%` } }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      max: 100,
                      title: { display: true, text: "Xác suất (%)" }
                    },
                    x: {
                      title: { display: true, text: "Nhãn" }
                    }
                  }
                }}
              />
              <div style={{ textAlign: "center", marginTop: 8, fontSize: 13, color: "#636e72" }}>
                Biểu đồ xác suất các nhãn dự đoán
              </div>
            </div>
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
  );
};

export default ClassificationTool;