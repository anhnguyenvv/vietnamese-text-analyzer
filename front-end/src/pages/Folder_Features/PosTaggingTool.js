import React, { useState } from "react";
import "./Features.css";
import FileUploader from "./FileUploader";
import axios from "axios";
// Bảng chuyển đổi nhãn POS sang tiếng Việt
const POS_LABELS = {
  Np: "Danh từ riêng (Proper noun)",
  Nc: "Danh từ chỉ loại (Classifier noun)",
  Nu: "Danh từ chỉ đơn vị (Unit noun)",
  N: "Danh từ (Noun)",
  Ny: "Danh từ viết tắt (Abbreviated noun)",
  Nb: "Danh từ vay mượn (Borrowed noun)",
  V: "Động từ (Verb)",
  Vb: "Động từ vay mượn (Borrowed verb)",
  A: "Tính từ (Adjective)",
  P: "Đại từ (Pronoun)",
  R: "Trạng từ (Adverb)",
  L: "Định từ (Determiner)",
  M: "Số từ (Numeral/Quantity)",
  E: "Giới từ (Preposition)",
  C: "Liên từ phụ thuộc (Subordinating conjunction)",
  Cc: "Liên từ đẳng lập (Coordinating conjunction)",
  I: "Thán từ (Interjection/Exclamation)",
  T: "Trợ từ, từ tình thái (Particle/Auxiliary, modal words)",
  Y: "Từ viết tắt (Abbreviation)",
  Z: "Hình vị phụ thuộc (Bound morpheme)",
  X: "Không xác định/Khác (Un-definition/Other)",
  CH: "Dấu câu, ký hiệu (Punctuation and symbols)",
};

const POS_COLORS = {
  // Màu sắc cho các nhãn POS
  // Danh từ
  Np: "#74b9ff",
  Nc: "#74b9ff",
  Nu: "#74b9ff",
  N: "#74b9ff",
  Ny: "#74b9ff",
  Nb: "#74b9ff",
  // Động từ
  V: "#fdcb6e",
  Vb: "#fdcb6e",
  // Tính từ
  A: "#55efc4",
  Ab: "#55efc4",
  // Đại từ
  P: "#fab1a0",
  // Số từ
  M: "#00b894",
  // 
  L: "#636e72",
  R: "#636e72",
  E: "#636e72",
  C: "#636e72",
  Cc: "#636e72",
  T: "#636e72",
  I: "#636e72",
  Y: "#636e72",
  Z: "#636e72",
  // Không xác định
  X: "#aaa",
  CH: "#aaa",
};

function highlightPOS(result) {
  if (!Array.isArray(result)) return "";
  // result: [{word: "Nhật", tag: "N"}, ...]
  return result
    .map(([word, tag]) =>  {
      const color = POS_COLORS[tag] || "#dfe6e9";
      const label = POS_LABELS[tag] || tag;
      return `
        <span style="display:inline-block; text-align:center; margin:0 2px; position:relative;">
          <span style="
            display:inline-block;
            background:${color};
            color:#222;
            border:1.2px solid #636e72;
            border-radius:6px 6px 0 0;
            padding:0 4px;
            font-size:10px;
            font-weight:600;
            position:relative;
            top:0;
            z-index:2;
            box-shadow:0 1px 2px #dfe6e9;
          " title="${label}">
            ${tag}
          </span>
          <span style="
            display:block;
            border-top:1.2px solid #636e72;
            width:14px;
            height:0;
            margin:0 auto -1px auto;
            position:relative;
            top:-1px;
            z-index:1;
          "></span>
          <span style="
            display:inline-block;
            background:${color};
            color:#222;
            border-radius:0 0 6px 6px;
            padding:1px 4px;
            font-size:13px;
            min-width:14px;
            border:1.2px solid #636e72;
            border-top:none;
            box-shadow:0 1px 2px #dfe6e9;
          ">
            ${word}
          </span>
        </span>
      `;
    })
    .join(" ");
}
const PosTaggingTool = () => {
  const [textInput, setTextInput] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState("vncorenlp"); // Mặc định là vncorenlp

  const handleFileSelect = (content) => {
    setTextInput(content);
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setResult("");
    try {
      const res = await axios.post("http://localhost:5000/api/pos/tag", {
        text: textInput,
        model: selectedModel,
      });
      const data = res.data;
      if (Array.isArray(data.result)) {
        setResult(highlightPOS(data.result));
      } else if (typeof data.result === "string") {
        setResult(`<span>${data.result}</span>`);     
      } else {
        setResult(`<span style="color:red">${data.error || "Có lỗi xảy ra!"}</span>`);
      }
    } catch (err) {
      setResult(`<span style="color:red">Có lỗi xảy ra khi gọi API: ${err.message}</span>`);
    }
    setLoading(false);
  };

  return (
    <div className="pos-tagging-tool">
      <strong>Tùy chọn gán nhãn từ loại:</strong>
      <div className="options">
        <label style={{ marginLeft: 16 }}>
          <input
            type="radio"
            name="model"
            value="vncorenlp"
            checked={selectedModel === "vncorenlp"}
            onChange={() => setSelectedModel("vncorenlp")}
          />{" "}
          VnCoreNLP
        </label>
        <label>
          <input
            type="radio"
            name="model"
            value="underthesea"
            checked={selectedModel === "underthesea"}
            onChange={() => setSelectedModel("underthesea")}
          />{" "}
          Underthesea
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
            {result ? (
              <div dangerouslySetInnerHTML={{ __html: result }} />
            ) : (
              <div style={{ color: "#888" }}>Kết quả sẽ hiển thị ở đây...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PosTaggingTool;