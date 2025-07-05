import React, { useState } from "react";
import "./Features.css";
import FileUploader from "./FileUploader";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
ChartJS.register(ArcElement, Tooltip, Legend);

const ClassificationTool = () => {
  const [textInput, setTextInput] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedClassification, setSelectedClassification] = useState("essay_identification");
  const handleFileSelect = (content) => {
    setTextInput(content);
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setResult(null);
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

 

  return (
    <div className="classification-tool">
      <strong>Tùy chọn Phân loại:</strong>      
        <div className="options">
          <label>
            <input
              type="radio"
              name="classification"
              value="essay_identification"
              checked={selectedClassification === "essay_identification"}
              onChange={() => setSelectedClassification("essay_identification")}
            />{" "}
            Phân loại kiểu văn bản (nghị luận, biểu cảm,...)
          </label>
          <label style={{ marginLeft: 16 }}>
            <input
              type="radio"
              name="classification"
              value="vispam"
              checked={selectedClassification === "vispam"}
              onChange={() => setSelectedClassification("vispam")}
            />{" "}
            Phân loại review spam
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

            {result && !result.error && (
              <div style={{ marginTop: 16 }}>
                <strong>Nhận định: </strong>
                <span style={{ color: "#0984e3", fontWeight: 600 }}>
                  {result.label_name}
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