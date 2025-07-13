import React, { useState } from "react";
import "./Features.css";
import FileUploader from "./FileUploader";
import axios from "axios";
import API_BASE from "../../config"; // Địa chỉ API backend

const SummarizationTool = () => {
  const [textInput, setTextInput] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFileSelect = (content) => {
    setTextInput(content);
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setResult("");
    try {
      const res = await axios.post(`${API_BASE}/api/summarization/summarize`, {
        text: textInput,
      });
      const data = res.data;
      if (data.summary) {
        setResult(data.summary);
      } else {
        setResult(data.error || "Có lỗi xảy ra!");
      }
    } catch (err) {
      setResult("Có lỗi xảy ra khi gọi API!");
    }
    setLoading(false);
  };

  return (
    <div className="summarization-tool">
      <strong>Tóm tắt văn bản</strong>
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
          <textarea
            rows={10}
            readOnly
            placeholder="Kết quả sẽ hiển thị ở đây..."
            value={result}
          />
        </div>
      </div>
    </div>
  );
};

export default SummarizationTool;