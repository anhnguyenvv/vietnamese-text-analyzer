import React, { useState } from "react";
import "./Features.css";
import FileUploader from "./FileUploader";
import axios from "axios";

const PreprocessingTool = () => {
  const [textInput, setTextInput] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [removeStopwords, setRemoveStopwords] = useState(true);
  const [removeEmojis, setRemoveEmojis] = useState(false);
  const [tokens, setTokens] = useState([]);
  const [showTokens, setShowTokens] = useState(false);
  const [tokenize, setTokenize] = useState(false);  const [removeNumbers, setRemoveNumbers] = useState(true);
  const [removeDuplicates, setRemoveDuplicates] = useState(false);
  const [lowercase, setLowercase] = useState(true);
  const handleFileSelect = (content) => {
    setTextInput(content);
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setResult("");
    try {
      const res = await axios.post("http://localhost:5000/api/preprocessing/preprocess", {
        text: textInput,
        remove_stopwords: removeStopwords,
        remove_emojis: removeEmojis,
        remove_duplicates: removeDuplicates,
        lowercase: lowercase,
        remove_numbers: removeNumbers
      });
      const data = res.data;
      if (data.preprocessed_text) {
        setResult(data.preprocessed_text);
      } else {
        setResult(data.error || "Có lỗi xảy ra!");
      }
    } catch (err) {
      setResult("Có lỗi xảy ra khi gọi API!");
    }
    setShowTokens(tokenize);
    if (tokenize) {
      setTokens([]);
      try {
        const res = await axios.post("http://localhost:5000/api/preprocessing/tokenize", {
          text: result
        });
        const data = res.data;
        if (data.tokens) {
          setTokens(data.tokens);
        } else {
          setTokens(["Có lỗi xảy ra!"]);
        }
      } catch (err) {
        setTokens(["Có lỗi xảy ra khi gọi API!"]);
      }
    }
    setLoading(false);
  };

  return (
    <div className="preprocessing-tool">
      <strong>Tùy chọn tiền xử lý:</strong>
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
        <label>
        <input
          type="checkbox"
          checked={tokenize}
          onChange={(e) => setTokenize(e.target.checked)}
        />
        Tách từ
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
              Xử lý
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
          <textarea
            rows={10}
            readOnly
            placeholder="Kết quả sẽ hiển thị ở đây..."
            value={result}
          />
          {tokenize && showTokens && (
            <div className="token-list" style={{ marginTop: 12 }}>
              <strong>Danh sách từ sau khi tách:</strong>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  marginTop: 6,
                  background: "#fafafa",
                  border: "1px solid #eee",
                  borderRadius: 4,
                  padding: 8,
                  fontFamily: "monospace",
                  fontSize: 14,
                  maxHeight: 120,
                  overflow: "auto"
                }}
              >
                {tokens.length > 0
                  ? tokens.map((token, idx) => (
                      <span
                        key={idx}
                        style={{
                          background: "#dfe6e9",
                          borderRadius: 12,
                          padding: "2px 10px",
                          margin: "2px 2px",
                          fontSize: 15,
                          display: "inline-block",
                          color: "#222",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
                        }}
                      >
                        {token}
                      </span>
                    ))
                  : "Không có kết quả"}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PreprocessingTool;