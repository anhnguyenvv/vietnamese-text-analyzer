import React, { useState } from "react";
import "./Features.css";
import FileUploader from "./FileUploader";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
ChartJS.register(ArcElement, Tooltip, Legend);

const ClassificationTool = () => {
  const [textInput, setTextInput] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState("essay_identification");
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
           model_name: selectedModel,
           num_labels: 1  // Số lượng nhãn phân loại, có thể thay đổi tùy theo mô hình
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
        <select>
            <option value="essay_identification">Phân loại kiểu văn bản (nghị luận, biểu cảm,...)</option>
            <option value="vispam">Phân loại review spam</option>
            <option value="topic_classification">Phân loại chủ đề</option>
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
          <button className="analyze-button" onClick={handleAnalyze} disabled={loading}>
            {loading ? "Đang phân tích..." : "Phân tích"}
          </button>
        </div>

        <div className="result-area">
          <label>Kết quả</label>
          {result && result.error && (
            <div style={{ color: "red" }}>{result.error}</div>
          )}

        {result && !result.error && (
          <div style={{ marginTop: 16 }}>
            <strong>Nhận định: </strong>
            <span style={{ color: "#0984e3", fontWeight: 600 }}>{result.label_name}</span>
            <br />
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default ClassificationTool;