import React, { useState } from "react";
import axios from "axios";
import "./Features.css";

import FileUploader from "./FileUploader";
import {API_BASE, TEST_SAMPLE_PATHS}from "../../config"; // Địa chỉ API backend

// Định nghĩa màu cho từng loại entity
const ENTITY_COLORS = {
  PER: "#ff7979",
  LOC: "#70a1ff",
  ORG: "#7bed9f",
  MISC: "#f6e58d",
  DATE: "#e17055",
  TIME: "#00b894",
  // Thêm các loại entity khác nếu cần
};

function highlightEntities(text, entities) {
  if (!entities || entities.length === 0) return text;
  let result = "";
  entities.forEach(ent => {
    const word = ent[0];
    if (ent[1] && ent[1] !== "O") {
      const labelShort = ent[1].replace(/^B-/, "").replace(/^I-/, "");
      const color = ENTITY_COLORS[labelShort] || "#dfe6e9";
      result += `<span style="background:${color};border-radius:4px;padding:1px 4px;margin:0 1px;display:inline-block;" title="${ent[1]}">${word}<sub style="color:#636e72;font-size:10px;">${ent[1]}</sub></span>`;
    } else {
      result += " " + word;
    }
  });
  return result;
}

const NamedEntityTool = ({ sharedTextInput, setSharedTextInput, sharedFile, setSharedFile }) => {
  const [resultHtml, setResultHtml] = useState("");
  const [entityCount, setEntityCount] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState("vncorenlp");
  const [allResults, setAllResults] = useState([]);
  const [selectedLineIdx, setSelectedLineIdx] = useState(0);
  const [jsonResultUrl, setJsonResultUrl] = useState(null);
  const [jsonDownloadName, setJsonDownloadName] = useState("ner_result.json");
  const [fileName, setFileName] = useState("");
  const [sampleUrls] = useState(TEST_SAMPLE_PATHS.ner);
  const handleFileSelect = (content, file) => {
    setSharedTextInput(content);
    setResultHtml("");
    setEntityCount({});
    setAllResults([]);
    setFileName(file.name);
    setSelectedLineIdx(0);
    setJsonResultUrl(null);
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setResultHtml("");
    setEntityCount({});
    setAllResults([]);
    setSelectedLineIdx(0);
    setJsonResultUrl(null);

    // Tách từng dòng (bỏ dòng trống)
    const lines = sharedTextInput
      .split(/\r?\n\s*\r?\n/)
      .map(line => line.trim())
      .filter(line => line);

    if (lines.length === 0) {
      setResultHtml("Vui lòng nhập văn bản hoặc chọn file để phân tích.");
      setLoading(false);
      return;
    }
    const promises = lines.map(line => 
       axios.post(`${API_BASE}/api/ner/ner`, {
        text: line,
        model: selectedModel,
      }).then(res => {
        if (res.data.result) {
          return {
            input: line,
            result: res.data.result,
          };
        } else if (res.data.error) {
          return {
            input: line,
            error: res.data.error || "Không rõ",
          };
        }
        return {
          input: line,
          error: "Không có kết quả nhận diện thực thể.",
        };
      })
    );
    try {
      const results = await Promise.all(promises);
    // const results = [];
    // for (const line of lines) {
    //   try {
    //     const res = await axios.post(`${API_BASE}/api/ner/ner`, {
    //       text: line,
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
    setAllResults(results);

    // Hiển thị kết quả đầu tiên
    if (Array.isArray(results[0]?.result)) {
      setResultHtml(highlightEntities(results[0].input, results[0].result));
      // Thống kê entity cho dòng đầu
      const mergedEntities = [];
      let currentEntity = null;
      const ents = results[0].result;
      for (let i = 0; i < ents.length; i++) {
        const [word, label] = ents[i];
        if (label && label !== "O") {
          const type = label.replace(/^B-/, "").replace(/^I-/, "");
          if (label.startsWith("B-")) {
            if (currentEntity) mergedEntities.push(currentEntity);
            currentEntity = { words: [word], label: type };
          } else if (label.startsWith("I-") && currentEntity && currentEntity.label === type) {
            currentEntity.words.push(word);
          } else {
            if (currentEntity) mergedEntities.push(currentEntity);
            currentEntity = { words: [word], label: type };
          }
        } else {
          if (currentEntity) mergedEntities.push(currentEntity);
          currentEntity = null;
        }
      }
      if (currentEntity) mergedEntities.push(currentEntity);

      const entityWordCount = {};
      mergedEntities.forEach(ent => {
        const entityText = ent.words.join(" ");
        const key = `${entityText} (${ent.label})`;
        entityWordCount[key] = (entityWordCount[key] || 0) + 1;
      });
      setEntityCount(entityWordCount);
    } else if (results[0]?.error) {
      setResultHtml("Có lỗi xảy ra: " + results[0].error);
    } else {
      setResultHtml("Không có kết quả nhận diện thực thể.");
    }

    // Lưu file JSON
    const jsonStr = JSON.stringify(results, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    setJsonResultUrl(url);
    setJsonDownloadName(fileName ? `${fileName}_ner_result.json` : "ner_result.json");

    setLoading(false);
    setSelectedLineIdx(0); // Reset selected line index
    } catch (err) {
      setResultHtml(`<span style="color:red">Có lỗi xảy ra khi gọi API: ${err.message}</span>`);
      setLoading(false);
      setSelectedLineIdx(0); // Reset selected line index
    }
  };

  // Khi chọn dòng khác
  const handleSelectLine = idx => {
    setSelectedLineIdx(idx);
    const item = allResults[idx];
    if (Array.isArray(item?.result)) {
      setResultHtml(highlightEntities(item.input, item.result));
      // Thống kê entity cho dòng này
      const mergedEntities = [];
      let currentEntity = null;
      const ents = item.result;
      for (let i = 0; i < ents.length; i++) {
        const [word, label] = ents[i];
        if (label && label !== "O") {
          const type = label.replace(/^B-/, "").replace(/^I-/, "");
          if (label.startsWith("B-")) {
            if (currentEntity) mergedEntities.push(currentEntity);
            currentEntity = { words: [word], label: type };
          } else if (label.startsWith("I-") && currentEntity && currentEntity.label === type) {
            currentEntity.words.push(word);
          } else {
            if (currentEntity) mergedEntities.push(currentEntity);
            currentEntity = { words: [word], label: type };
          }
        } else {
          if (currentEntity) mergedEntities.push(currentEntity);
          currentEntity = null;
        }
      }
      if (currentEntity) mergedEntities.push(currentEntity);

      const entityWordCount = {};
      mergedEntities.forEach(ent => {
        const entityText = ent.words.join(" ");
        const key = `${entityText} (${ent.label})`;
        entityWordCount[key] = (entityWordCount[key] || 0) + 1;
      });
      setEntityCount(entityWordCount);
    } else if (item?.error) {
      setResultHtml("Có lỗi xảy ra: " + item.error);
      setEntityCount({});
    } else {
      setResultHtml("Không có kết quả nhận diện thực thể.");
      setEntityCount({});
    }
  };

  return (
    <div className="named-entity-tool">
      <strong>Tùy chọn nhận diện thực thể:</strong>
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
          <label>Kết quả (NER)</label>
          <div className="result-box">
            <div dangerouslySetInnerHTML={{ __html: resultHtml }} />

            {Object.keys(entityCount).length > 0 && (
              <div>
                <strong>Thống kê số lượt xuất hiện:</strong>
                <table
                  style={{
                    width: "100%",
                    marginTop: 4,
                    borderCollapse: "collapse",
                  }}
                >
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>Entity</th>
                      <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>Số lượt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(entityCount).map(([label, count]) => (
                      <tr key={label}>
                        <td>
                          <span
                            style={{
                              background: ENTITY_COLORS[label] || "#dfe6e9",
                              borderRadius: 4,
                              padding: "1px 6px",
                              marginRight: 4,
                              color: "#222",
                            }}
                          >
                            {label}
                          </span>
                        </td>
                        <td>{count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
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
      <div style={{
        background: "#f1f2f6",
        border: "1px solid #dfe4ea",
        borderRadius: 4,
        padding: 8,
        margin: "12px 0"
      }}>
        <strong>Chú thích nhãn NER:</strong>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 15 }}>
          <li><b>B-PER</b>: Bắt đầu tên người (Begin-Person)</li>
          <li><b>I-PER</b>: Bên trong tên người (Inside-Person)</li>
          <li><b>B-LOC</b>: Bắt đầu tên địa danh (Begin-Location)</li>
          <li><b>I-LOC</b>: Bên trong tên địa danh (Inside-Location)</li>
          <li><b>B-ORG</b>: Bắt đầu tên tổ chức (Begin-Organization)</li>
          <li><b>I-ORG</b>: Bên trong tên tổ chức (Inside-Organization)</li>
          <li><b>B-MISC</b>: Bắt đầu thực thể khác (Begin-Miscellaneous)</li>
          <li><b>I-MISC</b>: Bên trong thực thể khác (Inside-Miscellaneous)</li>
          {/* Thêm các nhãn khác nếu cần */}
        </ul>
      </div>
    </div>
  );
};

export default NamedEntityTool;