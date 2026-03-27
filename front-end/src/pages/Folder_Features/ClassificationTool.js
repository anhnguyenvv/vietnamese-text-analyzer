import React, { useState } from "react";
import "./Features.css";
import FileUploader from "./FileUploader";
import CsvViewer from "./csvViewer"; // Import CsvViewer component
import Papa from "papaparse";
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from "chart.js";
import axios from "axios";
import {API_BASE, TEST_SAMPLE_PATHS}from "../../config"; // Địa chỉ API backend
ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const createDownloadUrl = (content, mimeType) => {
  const blob = new Blob([content], { type: mimeType });
  return URL.createObjectURL(blob);
};

const normalizeClassificationPayload = (responseData, fallbackText = "") => {
  const payload = responseData?.result ? responseData : {
    task: "classification",
    model_name: responseData?.model_name,
    input: {
      text: fallbackText,
      token_count: fallbackText ? fallbackText.trim().split(/\s+/).filter(Boolean).length : 0,
    },
    result: {
      label: responseData?.label_name,
      label_id: responseData?.label_id,
    },
    meta: {
      confidence_score: null,
      processing_time_ms: null,
      token_count: fallbackText ? fallbackText.trim().split(/\s+/).filter(Boolean).length : 0,
      warnings: [],
    },
  };

  if (!payload.label_name) {
    payload.label_name = payload.result?.label;
  }
  if (!payload.label_id) {
    payload.label_id = payload.result?.label_id;
  }

  return payload;
};

const buildStandardExportRow = (payload) => ({
  task: payload?.task || "classification",
  input_text: payload?.input?.text || "",
  model_name: payload?.model_name || "",
  prediction_label: payload?.result?.label || payload?.label_name || "",
  prediction_id: payload?.result?.label_id ?? payload?.label_id ?? "",
  confidence_score: payload?.meta?.confidence_score ?? "",
  processing_time_ms: payload?.meta?.processing_time_ms ?? "",
  token_count: payload?.meta?.token_count ?? payload?.input?.token_count ?? "",
  warnings: (payload?.meta?.warnings || []).join(" | "),
  result_json: JSON.stringify(payload?.result || {}, null, 0),
});

const ClassificationTool = ({ sharedTextInput, setSharedTextInput, sharedFile, setSharedFile }) => {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedClassification, setSelectedClassification] = useState("essay_identification");
  const [compareMode, setCompareMode] = useState(false);
  const [compareModelA, setCompareModelA] = useState("essay_identification");
  const [compareModelB, setCompareModelB] = useState("topic_classification");
  const [compareResult, setCompareResult] = useState(null);
  const [csvResultUrl, setCsvResultUrl] = useState(null);
  const [jsonResultUrl, setJsonResultUrl] = useState(null);
  const [csvDownloadName, setCsvDownloadName] = useState("classification_result.csv");
  const [jsonDownloadName, setJsonDownloadName] = useState("classification_result.json");
  const [csvData, setCsvData] = useState([]);
  const [readMode, setReadMode] = useState("paragraph");
  const [sampleUrls, setSampleUrls] = useState(TEST_SAMPLE_PATHS.essay_identification);
  const [batchProgress, setBatchProgress] = useState({ done: 0, total: 0 });
  const [lineErrors, setLineErrors] = useState([]);

  const handleFileSelect = (content, file, readMode, csvColumn) => {
    setSharedTextInput(content);
    setSharedFile(file || null);
    setReadMode(readMode);
    setResult(null);
    setCompareResult(null);
    setCsvResultUrl(null);
    setJsonResultUrl(null);
    setCsvDownloadName("classification_result.csv");
    setJsonDownloadName("classification_result.json");
    setBatchProgress({ done: 0, total: 0 });
    setLineErrors([]);
    if (file && file.name.endsWith(".csv")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const parsed = Papa.parse(e.target.result.trim(), { skipEmptyLines: true });
          setCsvData(parsed.data);
        };
        reader.readAsText(file);
        
      } else {
        setCsvData([]);
      }
  };
  const handleAnalyze = async () => {
    setLoading(true);
    setResult(null);
    setCompareResult(null);
    setCsvResultUrl(null);
    setJsonResultUrl(null);
    setCsvDownloadName("classification_result.csv");
    setJsonDownloadName("classification_result.json");
    setBatchProgress({ done: 0, total: 0 });
    setLineErrors([]);

    const lines = sharedTextInput.split(/\r?\n\s*\r?\n/).map(line => line.trim()).filter(line => line);
    if (lines.length === 0) {
      setResult({ error: "Vui lòng nhập văn bản hoặc chọn file để phân tích." });
      setLoading(false);
      return;
    }

    if (compareMode) {
      if (lines.length !== 1) {
        setResult({ error: "Chế độ so sánh chỉ hỗ trợ 1 đoạn văn bản mỗi lần." });
        setLoading(false);
        return;
      }

      try {
        const compareRes = await axios.post(`${API_BASE}/api/classification/compare`, {
          text: lines[0],
          models: [compareModelA, compareModelB],
        });
        setCompareResult(compareRes.data?.comparisons || []);
        setLoading(false);
        return;
      } catch (err) {
        setResult({ error: err?.response?.data?.error || err.message || "Có lỗi xảy ra!" });
        setLoading(false);
        return;
      }
    }

  try {
    const total = lines.length;
    setBatchProgress({ done: 0, total });
    const payloads = [];
    const exportRows = [];
    const collectedLineErrors = [];

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      try {
        const res = await axios.post(`${API_BASE}/api/classification/classify`, {
          text: line,
          model_name: selectedClassification,
        });
        const payload = normalizeClassificationPayload(res.data, line);
        payloads.push(payload);
        const successRow = {
          line_number: i + 1,
          status: "success",
          error_message: "",
          ...buildStandardExportRow(payload),
        };
        exportRows.push(successRow);
      } catch (err) {
        const errorMessage = err?.response?.data?.error || err.message || "Không rõ lỗi";
        collectedLineErrors.push({ line_number: i + 1, error_message: errorMessage });
        exportRows.push({
          line_number: i + 1,
          status: "error",
          error_message: errorMessage,
          task: "classification",
          input_text: line,
          model_name: selectedClassification,
          prediction_label: "",
          prediction_id: "",
          confidence_score: "",
          processing_time_ms: "",
          token_count: line.trim().split(/\s+/).filter(Boolean).length,
          warnings: "",
          result_json: "{}",
        });
      }
      setBatchProgress({ done: i + 1, total });
    }

    setLineErrors(collectedLineErrors);

    if (lines.length === 1) {
      if (payloads[0]) {
        setResult(payloads[0]);
      } else {
        setResult({ error: collectedLineErrors[0]?.error_message || "Dòng xử lý thất bại." });
      }
      setLoading(false);
      return;
    }

    setResult(null);
    let csvResult = Papa.unparse(exportRows);

    if (sharedFile)
    {
      setCsvDownloadName(`${sharedFile.name.replace(/\.[^/.]+$/, "")}_classify.csv`);
      setJsonDownloadName(`${sharedFile.name.replace(/\.[^/.]+$/, "")}_classify.json`);
        if (sharedFile.name.endsWith(".csv")) {
        const csvWithResults = csvData.map((row, index) => {
          if (index === 0) {
            const resultKeys = exportRows[0] ? Object.keys(exportRows[0]) : [];
            return [...row, ...resultKeys];
          }
          if (index - 1 >= exportRows.length) {
            return row; 
          }
          const res = exportRows[index - 1] ? exportRows[index - 1] : {};
          return [
              ...row,
              ...Object.values(res)
          ];
        });
        csvResult = Papa.unparse(csvWithResults);
      }
    }

    const csvUrl = createDownloadUrl(csvResult, "text/csv;charset=utf-8;");
    const jsonUrl = createDownloadUrl(JSON.stringify(exportRows, null, 2), "application/json;charset=utf-8;");
    setCsvResultUrl(csvUrl);
    setJsonResultUrl(jsonUrl);
    setLoading(false);
  } catch (err) {
    setResult({ error: err.message || "Có lỗi xảy ra!" });
    setLoading(false);
  }
  };

  return (
    <div className="classification-tool">
      <strong>Tùy chọn phân loại:</strong>
      <div className="options">
        <label>
          <input
            type="radio"
            name="classification"
            value="essay_identification"
            checked={selectedClassification === "essay_identification"}
            onChange={() => {
              setSelectedClassification("essay_identification");
              setSampleUrls(TEST_SAMPLE_PATHS.essay_identification);
            }}

          />{" "}
          Phân loại thể loại văn bản
        </label>
        <label style={{ marginLeft: 16 }}>
          <input
            type="radio"
            name="classification"
            value="topic_classification"
            checked={selectedClassification === "topic_classification"}
            onChange={() => {
              setSelectedClassification("topic_classification");
              setSampleUrls(TEST_SAMPLE_PATHS.classification);
            }}
          />{" "}
          Phân loại chủ đề
        </label>
      </div>
      <div style={{ color: "#d69e2e", fontStyle: "italic", marginBottom: 8 , fontSize: 14 }}>
        {selectedClassification === "essay_identification"
          ? "Mô hình phân loại thể loại văn bản: Dự đoán thể loại văn bản với các nhãn như: Nghị luận, Biểu cảm, Miêu tả, Thuyết minh, Tự sự."
          : "Mô hình phân loại chủ đề: Dự đoán văn bản thuộc về chủ đề nào với 10 chủ đề khác nhau."}
      </div>
      <div style={{ marginBottom: 8, display: "flex", gap: 16, alignItems: "center" }}>
        <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={compareMode}
            onChange={(e) => {
              setCompareMode(e.target.checked);
              setResult(null);
              setCompareResult(null);
            }}
          />
          So sánh 2 model
        </label>
        {compareMode && (
          <>
            <select value={compareModelA} onChange={(e) => setCompareModelA(e.target.value)}>
              <option value="essay_identification">essay_identification</option>
              <option value="topic_classification">topic_classification</option>
            </select>
            <span>vs</span>
            <select value={compareModelB} onChange={(e) => setCompareModelB(e.target.value)}>
              <option value="topic_classification">topic_classification</option>
              <option value="essay_identification">essay_identification</option>
            </select>
          </>
        )}
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
                disabled={(readMode === "all" && sharedFile && sharedFile.name.endsWith(".csv"))}
                onChange={(e) => setSharedTextInput(e.target.value)}
              />
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              className="analyze-button"
              onClick={handleAnalyze}
              disabled={loading}
            >
              Phân tích
            </button>
            {loading && (
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: 14, color: "#888", marginBottom: 4 }}>
                  Đang phân tích... {batchProgress.total > 0 ? `${batchProgress.done}/${batchProgress.total}` : ""}
                </div>
                <div className="loading-bar-container">
                  <div
                    className="loading-bar"
                    style={{
                      transform: "none",
                      animation: "none",
                      width: `${batchProgress.total > 0 ? (batchProgress.done / batchProgress.total) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="result-area">
          <label>Kết quả</label>
          {!csvResultUrl && (
          <div className="result-box">
            {!result&& (
              <div style={{ color: "#888" }}>Kết quả sẽ hiển thị ở đây...</div>
            )}
            {result && result.error && (
              <div style={{ color: "red" }}>{result.error}</div>
            )}
            {result && !result.error && result.label_name && (
              <div style={{ marginTop: 16 }}>
                <strong>Nhận định: </strong>
                <span style={{ color: "#0984e3", fontWeight: 600 }}>
                   {selectedClassification === "topic_classification" ? "Chủ đề" : "Thể loại"} {result.label_name}
                </span>
                <div style={{ marginTop: 10, fontSize: 13, color: "#444" }}>
                  <div><strong>Confidence:</strong> {result?.meta?.confidence_score ?? "N/A"}</div>
                  <div><strong>Thời gian xử lý:</strong> {result?.meta?.processing_time_ms ?? "N/A"} ms</div>
                  <div><strong>Số token:</strong> {result?.meta?.token_count ?? "N/A"}</div>
                  <div><strong>Cảnh báo:</strong> {(result?.meta?.warnings || []).length ? result.meta.warnings.join(" | ") : "Không"}</div>
                </div>
              </div>
            )}
            {compareResult && compareResult.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <strong>So sánh kết quả 2 model</strong>
                <table style={{ width: "100%", marginTop: 8, borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ borderBottom: "1px solid #ddd", textAlign: "left" }}>Model</th>
                      <th style={{ borderBottom: "1px solid #ddd", textAlign: "left" }}>Label</th>
                      <th style={{ borderBottom: "1px solid #ddd", textAlign: "left" }}>Confidence</th>
                      <th style={{ borderBottom: "1px solid #ddd", textAlign: "left" }}>Time (ms)</th>
                      <th style={{ borderBottom: "1px solid #ddd", textAlign: "left" }}>Token</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compareResult.map((item, idx) => (
                      <tr key={`${item.model_name}-${idx}`}>
                        <td>{item.model_name}</td>
                        <td>{item?.result?.label || "N/A"}</td>
                        <td>{item?.meta?.confidence_score ?? "N/A"}</td>
                        <td>{item?.meta?.processing_time_ms ?? "N/A"}</td>
                        <td>{item?.meta?.token_count ?? "N/A"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {lineErrors.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <strong>Lỗi theo dòng</strong>
                <table style={{ width: "100%", marginTop: 8, borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ borderBottom: "1px solid #ddd", textAlign: "left" }}>Dòng</th>
                      <th style={{ borderBottom: "1px solid #ddd", textAlign: "left" }}>Thông báo lỗi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineErrors.map((item, idx) => (
                      <tr key={`${item.line_number}-${idx}`}>
                        <td>{item.line_number}</td>
                        <td>{item.error_message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
           
          </div>
          )}
          {csvResultUrl && (
              <CsvViewer csvFile={csvResultUrl} />
          )}
          <div className="csv-download-area">
            {csvResultUrl && (
              <div>
                <a
                  href={csvResultUrl}
                  download={csvDownloadName}
                  className="analyze-button"
                  title={`Tải file kết quả: ${csvDownloadName}`}
                  style={{
                    background: "#e0e0e0",
                    color: "#444",
                    textDecoration: "none",
                    padding: "6px 10px",
                    borderRadius: "50%",
                    fontWeight: 500,
                    fontSize: 18,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 2px 8px rgba(0,185,148,0.08)",
                    transition: "background 0.2s",
                    width: 36,
                    height: 36,
                  }}
                >
                  <span role="img" aria-label="download">⬇️</span>
                </a>
                <span style={{ fontSize: 14, fontWeight: 500 }}>
                  {csvDownloadName}
                </span>
                {jsonResultUrl && (
                  <a
                    href={jsonResultUrl}
                    download={jsonDownloadName}
                    className="analyze-button"
                    style={{
                      marginLeft: 8,
                      background: "#dfe8ff",
                      color: "#234",
                      textDecoration: "none",
                      fontSize: 12,
                      width: "auto",
                      padding: "8px 10px",
                    }}
                  >
                    JSON
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClassificationTool;
