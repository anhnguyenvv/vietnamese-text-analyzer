import React, { useState } from "react";
import "./Features.css";
import FileUploader from "./FileUploader";

const PreprocessingTool = () => {
  const [textInput, setTextInput] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [removeStopwords, setRemoveStopwords] = useState(true);
  const [removeEmojis, setRemoveEmojis] = useState(false);
  const [removeNumbers, setRemoveNumbers] = useState(true);
  const [removeDuplicates, setRemoveDuplicates] = useState(false);
  const [lowercase, setLowercase] = useState(true);
  const handleFileSelect = (content) => {
    setTextInput(content);
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setResult("");
    try {
      const res = await fetch("http://localhost:5000/api/preprocessing/preprocess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textInput 
          , remove_stopwords: removeStopwords,
          remove_emojis: removeEmojis,
          remove_duplicates: removeDuplicates,
          lowercase: lowercase,
          remove_numbers: removeNumbers
        }),
      });
      const data = await res.json();
      if (data.preprocessed_text) {
        setResult(data.preprocessed_text);
      } else {
        setResult(data.error || "Có lỗi xảy ra!");
      }
    } catch (err) {
      setResult("Có lỗi xảy ra khi gọi API!");
    }
    setLoading(false);
  };

  return (
    <div className="preprocessing-tool">
      <strong>Tùy chọn Tiền xử lý:</strong>
      <div className="options">
        <label>
          <input
            type="checkbox"
            checked={removeStopwords}
            onChange={(e) => setRemoveStopwords(e.target.checked)}
          />
          Loại bỏ stopwords
        </label>
        <label>
          <input
            type="checkbox"
            checked={removeEmojis}
            onChange={(e) => setRemoveEmojis(e.target.checked)}
          />
          Loại bỏ emojis
        </label>
        <label>
          <input
            type="checkbox"
            checked={removeNumbers}
            onChange={(e) => setRemoveNumbers(e.target.checked)}
          />
          Loại bỏ số
        </label>
        <label>
          <input
            type="checkbox"
            checked={removeDuplicates}
            onChange={(e) => setRemoveDuplicates(e.target.checked)}
          />
          Loại bỏ trùng lặp
        </label>
        <label>
          <input
            type="checkbox"
            checked={lowercase}
            onChange={(e) => setLowercase(e.target.checked)}
          />
          Chuyển sang chữ thường
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

export default PreprocessingTool;