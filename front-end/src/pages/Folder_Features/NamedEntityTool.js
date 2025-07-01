import React, { useState } from "react";
import axios from "axios";
import "./Features.css";
import FileUploader from "./FileUploader";

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

  let currentIdx = 0;
  let result = "";

  entities.forEach(ent => {
    // Tìm vị trí từ tiếp theo trong text, bắt đầu từ currentIdx
    const word = ent.word;
    const searchIdx = text.indexOf(word, currentIdx);
    if (searchIdx === -1) {
      // Không tìm thấy từ, bỏ qua
      return;
    }
    // Thêm phần text trước từ
    result += text.slice(currentIdx, searchIdx);

    // Nếu là entity (label khác O), highlight
    if (ent.label && ent.label !== "O") {
      const labelShort = ent.label.replace(/^B-/, "").replace(/^I-/, "");
      const color = ENTITY_COLORS[labelShort] || "#dfe6e9";
      result += `<span style="background:${color};border-radius:4px;padding:1px 4px;margin:0 1px;display:inline-block;" title="${ent.label}">${word}<sub style="color:#636e72;font-size:10px;">${ent.label}</sub></span>`;
    } else {
      result += word;
    }
    currentIdx = searchIdx + word.length;
  });

  // Thêm phần còn lại của text
  result += text.slice(currentIdx);
  return result;
}

const NamedEntityTool = () => {
  const [textInput, setTextInput] = useState("");
  const [resultHtml, setResultHtml] = useState("");
  const [entities, setEntities] = useState([]);
  const [entityCount, setEntityCount] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState("vncorenlp"); // Mặc định là vncorenlp

  const handleFileSelect = (content) => {
    setTextInput(content);
    setResultHtml("");
    setEntities([]);
    setEntityCount({});
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setResultHtml("");
    setEntities([]);
    setEntityCount({});
    try {
      const res = await axios.post("http://localhost:5000/api/pos-ner/ner", {
        text: textInput,
        model: selectedModel, 
      });
      // Giả sử backend trả về: { result: [{start, end, label, word}, ...] }
      const ents = res.data.result || [];
      console.log("Entities:", ents); // In ra data kết quả ở đây
      setEntities(ents);

      // Đếm số lượt xuất hiện từng entity
      const count = {};
      ents.forEach(e => {
        count[e.label] = (count[e.label] || 0) + 1;
      });
      setEntityCount(count);

      // Hiển thị highlight
      setResultHtml(highlightEntities(textInput, ents));
    } catch (err) {
      setResultHtml("Có lỗi xảy ra: " + (err.response?.data?.error || err.message));
    }
    setLoading(false);
  };

  return (
    <div className="named-entity-tool">
      <strong>Tùy chọn Nhận diện Thực thể:</strong>
      <div className="options">
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
          <label>Kết quả (NER)</label>
          <div
            style={{
              minHeight: 120,
              border: "1px solid #ccc",
              borderRadius: 4,
              padding: 8,
              background: "#fafbfc",
              fontSize: 16,
              whiteSpace: "pre-wrap",
              marginBottom: 12,
            }}
            dangerouslySetInnerHTML={{ __html: resultHtml }}
          />
          {Object.keys(entityCount).length > 0 && (
            <div>
              
              <strong>Thống kê số lượt xuất hiện:</strong>
              <table style={{ width: "100%", marginTop: 4, borderCollapse: "collapse" }}>
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
                        <span style={{
                          background: ENTITY_COLORS[label] || "#dfe6e9",
                          borderRadius: 4,
                          padding: "1px 6px",
                          marginRight: 4,
                          color: "#222"
                        }}>{label}</span>
                      </td>
                      <td>{count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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