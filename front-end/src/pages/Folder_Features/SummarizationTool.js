import React, { useState } from "react";
import "./Features.css";
import FileUploader from "./FileUploader";
import axios from "axios";
import { API_BASE, TEST_SAMPLE_PATHS }  from "../../config"; // Địa chỉ API backend
const SummarizationTool = ({ sharedTextInput, setSharedTextInput, sharedFile, setSharedFile }) => {
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [length, setLength] = useState("medium"); // Thêm state cho độ dài tóm tắt
  const [sampleUrls] = useState(TEST_SAMPLE_PATHS.summary);

  const handleFileSelect = (content) => {
    setSharedTextInput(content);
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setResult("");
    if (!sharedTextInput.trim()) {
      setResult("Vui lòng nhập văn bản hoặc tải tệp lên!");
      setLoading(false);
      return;
    }
    try {
      const res = await axios.post(`${API_BASE}/api/summarization/summarize`, {
        text: sharedTextInput,
        length: length, // Truyền độ dài vào API
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
      <FileUploader
        onFileSelect={handleFileSelect}
        sampleUrls={sampleUrls}
        sharedFile ={sharedFile}
        setSharedFile={setSharedFile}
      />

      <div className="text-area-container">
        <div className="input-area">
          <label>Văn bản</label>
          <textarea
            rows={10}
            placeholder="Nhập văn bản tại đây..."
            value={sharedTextInput}
            onChange={(e) => setSharedTextInput(e.target.value)}
          />
          <div style={{ margin: "8px 0" }}>
            <label>
              Độ dài của tóm tắt:&nbsp;
              <select value={length} onChange={e => setLength(e.target.value)}>
                <option value="short">Ngắn (3-4 câu)</option>
                <option value="medium">Vừa (5-6 câu)</option>
                <option value="long">Dài (8-9 câu)</option>
              </select>
            </label>
          </div>
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
          {result && !result.error && (
            <button
              onClick={() => navigator.clipboard.writeText(result)}
              style={{
                marginTop: 8,
                padding: "6px 12px",
                background: "#0984e3",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              Sao chép
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SummarizationTool;