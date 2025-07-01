import React, { useState } from "react";
import "./Features.css";
import FileUploader from "./FileUploader";

const PreprocessingTool = () => {
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
      const res = await fetch("http://localhost:5000/api/preprocessing/preprocess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textInput }),
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
        <label><input type="checkbox" defaultChecked /> Loại bỏ kí tự đặc biệt</label>
        <label><input type="checkbox" /> Loại bỏ biểu tượng cảm xúc</label>
        <label><input type="checkbox" /> Loại bỏ stopword</label>
        <label><input type="checkbox" /> Tách từ</label>
        <label><input type="checkbox" /> Chuyển về chữ thường</label>
        <label><input type="checkbox" /> Xóa từ giống nhau </label>
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