import "./Features.css";
import FileUploader from "./FileUploader";
import axios from "axios";
import API_BASE from "../../config"; // Địa chỉ API backend
import React, { useState, useRef, useEffect } from "react";


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

function highlightPOS(result, selectedIdx = null) {
  if (!Array.isArray(result)) return "";
  return result
    .map(([word, tag], idx) => {
      const color = POS_COLORS[tag] || "#dfe6e9";
      const label = POS_LABELS[tag] || tag;
      const opacity = idx === selectedIdx ? 0.4 : 1;
      return `
        <span class="pos-word-chip" data-idx="${idx}" style="display:inline-block; text-align:center; margin:0 2px; position:relative; cursor:pointer; opacity:${opacity};">
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
  const [selectedModel, setSelectedModel] = useState("vncorenlp");
  const [rawResult, setRawResult] = useState([]);
  const [popupInfo, setPopupInfo] = useState(null);
  const resultBoxRef = useRef();
  const handleFileSelect = (content) => {
    setTextInput(content);
  };
  const handleAnalyze = async () => {
    setLoading(true);
    setResult("");
    setPopupInfo(null);
    try {
      const res = await axios.post(`${API_BASE}/api/pos/tag`, {
        text: textInput,
        model: selectedModel,
      });
      const data = res.data;
      if (Array.isArray(data.result)) {
        setRawResult(data.result);
        setResult(highlightPOS(data.result, null));
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

  // Bắt sự kiện click vào từ đã highlight
  useEffect(() => {
    const handler = (e) => {
      const chip = e.target.closest(".pos-word-chip");
      if (chip && rawResult.length) {
        const idx = Number(chip.getAttribute("data-idx"));
        if (!isNaN(idx)) {
          const [word, tag] = rawResult[idx];
          const rect = chip.getBoundingClientRect();
          setPopupInfo({
            word,
            tag,
            label: POS_LABELS[tag] || tag,
            left: rect.left + window.scrollX,
            top: rect.bottom + window.scrollY,
          });
          setResult(highlightPOS(rawResult, idx)); // cập nhật lại để làm mờ từ
        }
      } else {
        setPopupInfo(null);
        setResult(highlightPOS(rawResult, null));
      }
    };
    const box = resultBoxRef.current;
    if (box) box.addEventListener("click", handler);
    return () => {
      if (box) box.removeEventListener("click", handler);
    };
  }, [result, rawResult]);

  // Đóng popup khi click ngoài
  useEffect(() => {
    const closePopup = (e) => {
      if (popupInfo && !e.target.closest(".pos-word-chip") && !e.target.closest(".pos-popup")) {
        setPopupInfo(null);
      }
    };
    document.addEventListener("mousedown", closePopup);
    return () => document.removeEventListener("mousedown", closePopup);
  }, [popupInfo]);

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
          <div className="result-box" ref={resultBoxRef} style={{ position: "relative" }}>
            {result ? (
              <div dangerouslySetInnerHTML={{ __html: result }} />
            ) : (
              <div style={{ color: "#888" }}>Kết quả sẽ hiển thị ở đây...</div>
            )}
            {popupInfo && (
              <div
                className="pos-popup"
                style={{
                  position: "absolute",
                  left: popupInfo.left - resultBoxRef.current.getBoundingClientRect().left,
                  top: popupInfo.top - resultBoxRef.current.getBoundingClientRect().top-80,
                  background: "#fff",
                  border: "1px solid #636e72",
                  borderRadius: 8,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.13)",
                  padding: "10px 18px",
                  zIndex: 100,
                  minWidth: 180,
                  fontSize: 12,
                  color: "#222",
                  pointerEvents: "auto"
                }}
              >
                {/* <b>Nghĩa:</b> {popupInfo.word} <br /> */}
                <b>POS:</b> {popupInfo.tag} <br />
                <b>Loại từ:</b> {popupInfo.label}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PosTaggingTool;

/* 
function highlightPOS(result) {
  if (!Array.isArray(result)) return "";
  // result: [{word: "Nhật", tag: "N"}, ...]
  return result
    .map(([word, tag]) => {
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
      const res = await axios.post(`${API_BASE}/api/pos/tag`, {
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
 */