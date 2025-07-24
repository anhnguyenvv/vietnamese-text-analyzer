import "./Features.css";
import FileUploader from "./FileUploader";
import { API_BASE, TEST_SAMPLE_PATHS }  from "../../config"; // Địa chỉ API backend
import axios from "axios";
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

const PosTaggingTool = ({ sharedTextInput, setSharedTextInput, sharedFile, setSharedFile }) => {
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState("vncorenlp");
  const [rawResult, setRawResult] = useState([]);
  const [popupInfo, setPopupInfo] = useState(null);
  const resultBoxRef = useRef();
  const [fileName, setFileName] = useState("");
  const [allResults, setAllResults] = useState([]);
  const [selectedLineIdx, setSelectedLineIdx] = useState(0);
  const [sampleUrls] = useState(TEST_SAMPLE_PATHS.pos);

  const handleFileSelect = (content, file) => {
    setSharedTextInput(content);
    setSharedFile(file);
    if (file) {
      setFileName(file.name || "");
    }
    setResult("");
    setRawResult([]); 
    setPopupInfo(null);
    setAllResults([]);
    setSelectedLineIdx(0);
    setJsonResultUrl(null);
  };
  /*const handleAnalyze = async () => {
    setLoading(true);
    setResult("");
    setPopupInfo(null);

    try {
      const res = await axios.post(`${API_BASE}/api/pos/tag`, {
        text: sharedTextInput,
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
*/
  const [jsonResultUrl, setJsonResultUrl] = useState(null);
  const [jsonDownloadName, setJsonDownloadName] = useState("pos_result.json");

  const handleAnalyze = async () => {
    setLoading(true);
    setResult("");
    setPopupInfo(null);
    setJsonResultUrl(null);

    // Tách từng dòng (bỏ dòng trống)
    const lines = sharedTextInput
      .split(/\r?\n\s*\r?\n/)
      .map(line => line.trim())
      .filter(line => line);

    if (lines.length === 0) {
      setResult(`<span style="color:red">Vui lòng nhập văn bản hoặc chọn file để phân tích.</span>`);
      setLoading(false);
      return;
    }
    const promises = lines.map(line =>
      axios.post(`${API_BASE}/api/pos/tag`, {
        text: line,
        model: selectedModel,
      }).then(res => {
        if (res.data.result) {
          return {
            input: line,
            result: res.data.result,
          };
        } else {
          throw new Error(res.data.error + line|| "Không rõ");
        }
      })
    );
    //       model: selectedModel,
    //     });
    //     results.push({
    //       input: line,
    //       result: res.data.result,
    //     });
    //   } catch (err) {
    //     results.push({
    //       input: line,
    //       error: err.message,
    //     });
    //   }
    // }
    try {
      const results = await Promise.all(promises);
      setAllResults(results);
    // Hiển thị kết quả đầu tiên
    if (Array.isArray(results[0]?.result)) {
      setRawResult(results[0].result);
      setResult(highlightPOS(results[0].result, null));
    } else if (results[0]?.error) {
      setResult(`<span style="color:red">${results[0].error}</span>`);
    } else {
      setResult(`<span>${JSON.stringify(results[0])}</span>`);
    }

    // Lưu file JSON
    const jsonStr = JSON.stringify(results, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    setJsonResultUrl(url);
    setJsonDownloadName(fileName ? `${fileName}_pos_result.json` : "pos_result.json");

    setLoading(false);
    } catch (err) {
      setResult(`<span style="color:red">Có lỗi xảy ra khi gọi API: ${err.message}</span>`);
      setLoading(false);
    }
    setSelectedLineIdx(0); // Reset selected line index
  };

  const handleSelectLine = idx => {
    setSelectedLineIdx(idx);
    const item = allResults[idx];
    if (Array.isArray(item?.result)) {
      setRawResult(item.result);
      setResult(highlightPOS(item.result, null));
    } else if (item?.error) {
      setResult(`<span style="color:red">${item.error}</span>`);
    } else {
      setResult(`<span>${JSON.stringify(item)}</span>`);
    }
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

      <FileUploader 
       onFileSelect={handleFileSelect}
       sampleUrls={sampleUrls} 
        sharedFile={sharedFile}
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
              {allResults.length > 1 && (
            <div style={{ margin: "12px 0" }}>
              <b>Chọn dòng để xem kết quả:</b>
              <select
                value={selectedLineIdx}
                onChange={(e) => handleSelectLine(Number(e.target.value))}
                style={{ marginLeft: 8, padding: "4px 8px", borderRadius: 4, border: "1px solid #ccc" }}
              >
                {allResults.map((item, idx) => (
                  <option key={idx} value={idx}>
                    {item.input.length > 60 ? item.input.slice(0, 60) + "..." : item.input}
                  </option>
                ))}
              </select>
            </div>
          )}
          <label>Kết quả</label>
           
          <div className="result-box" ref={resultBoxRef} style={{ position: "relative" }}>
            {result ? (
              <div dangerouslySetInnerHTML={{ __html: result }} />
            ) : (
              <div style={{ color: "#888" }}>Kết quả sẽ hiển thị ở đây...</div>
            )}
            
            
          </div>
          {popupInfo && (
              <div
                className="pos-popup"
                style={{
                  position: "absolute",
                  left: popupInfo.left,// - resultBoxRef.current.getBoundingClientRect().left,
                  top: popupInfo.top,// - resultBoxRef.current.getBoundingClientRect().top,
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
          {jsonResultUrl && (
              <div style={{ marginTop: 12 }}>
                <a
                  href={jsonResultUrl}
                  download={jsonDownloadName}
                  className="analyze-button"
                  style={{ background: "#f0f0f0", color: "#444", textDecoration: "none", padding: "6px 10px", borderRadius: 6 }}
                >
                  <span role="img" aria-label="download">⬇️</span>
                 
                  Tải file kết quả JSON
                </a>
              </div>
            )}
        </div>
      </div>
    </div>

  );
};

export default PosTaggingTool;
