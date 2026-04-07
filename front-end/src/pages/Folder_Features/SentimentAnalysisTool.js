import React, { useState } from "react";
import "./Features.css";
import { API_BASE, TEST_SAMPLE_PATHS }  from "../../config"; 
import FileUploader from "./FileUploader";
import CsvViewer from "./csvViewer"; 
import { Pie } from "react-chartjs-2";
import axios from "axios";
import Papa from "papaparse";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
ChartJS.register(ArcElement, Tooltip, Legend);

const createDownloadUrl = (content, mimeType) => {
  const blob = new Blob([content], { type: mimeType });
  return URL.createObjectURL(blob);
};

const normalizeSentimentPayload = (responseData, fallbackText = "") => {
  if (responseData?.result) {
    return {
      ...responseData,
      label: responseData.label || responseData.result?.label,
    };
  }

  return {
    task: "sentiment",
    model_name: responseData?.model_name,
    input: {
      text: fallbackText,
      token_count: fallbackText ? fallbackText.trim().split(/\s+/).filter(Boolean).length : 0,
    },
    result: responseData || {},
    label: responseData?.label,
    meta: {
      confidence_score: null,
      processing_time_ms: null,
      token_count: fallbackText ? fallbackText.trim().split(/\s+/).filter(Boolean).length : 0,
      warnings: [],
    },
  };
};

const buildStandardExportRow = (payload) => ({
  task: payload?.task || "sentiment",
  input_text: payload?.input?.text || "",
  model_name: payload?.model_name || "",
  prediction_label: payload?.result?.label || payload?.label || "",
  prediction_id: payload?.result?.label_id ?? "",
  confidence_score: payload?.meta?.confidence_score ?? "",
  processing_time_ms: payload?.meta?.processing_time_ms ?? "",
  token_count: payload?.meta?.token_count ?? payload?.input?.token_count ?? "",
  warnings: (payload?.meta?.warnings || []).join(" | "),
  result_json: JSON.stringify(payload?.result || {}, null, 0),
});

const normalizeErrorMessage = (message) => {
  if (message === null || message === undefined) {
    return "";
  }

  const normalized = String(message).trim();
  if (!normalized || normalized === "0") {
    return "Không rõ lỗi";
  }

  return normalized;
};

const buildErrorInfo = (err) => {
  const responseData = err?.response?.data;
  const errorCode = typeof responseData?.error_code === "string" ? responseData.error_code : "";
  const rawPayload = responseData ? JSON.stringify(responseData, null, 0) : "";

  const message = normalizeErrorMessage(
    responseData?.error || responseData?.message || err?.message || rawPayload
  );

  return {
    error_message: message,
    error_code: errorCode,
    raw_payload: rawPayload,
  };
};


const SentimentAnalysisTool = ({ sharedTextInput, setSharedTextInput, sharedFile, setSharedFile }) => {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [csvResultUrl, setCsvResultUrl] = useState(null);
  const [jsonResultUrl, setJsonResultUrl] = useState(null);
  const [csvDownloadName, setCsvDownloadName] = useState("sentiment_result.csv");
  const [jsonDownloadName, setJsonDownloadName] = useState("sentiment_result.json");
  const [selectedModel, setSelectedModel] = useState("sentiment"); // Thêm state chọn model
  const [compareMode, setCompareMode] = useState(false);
  const [compareModelA, setCompareModelA] = useState("vispam-Phobert");
  const [compareModelB, setCompareModelB] = useState("vispam-VisoBert");
  const [compareResult, setCompareResult] = useState(null);
  const [csvData, setCsvData] = useState([]); 
  const [readMode, setReadMode] = useState("paragraph");
  const [sampleUrls, setSampleUrls] = useState(TEST_SAMPLE_PATHS.sentiment);
  const [lineErrors, setLineErrors] = useState([]);

  const handleFileSelect = (content, file, readMode, csvColumn) => {
    setReadMode(readMode);
    setResult(null);
    setCompareResult(null);
    setSharedFile(file || null);
    setCsvResultUrl(null);
    setJsonResultUrl(null);
    setSharedTextInput(content);
    setSharedFile(file || null);
    setCsvDownloadName("sentiment_result.csv");
    setJsonDownloadName("sentiment_result.json");
    setLineErrors([]);
    if (file && file.name.endsWith(".csv")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const fileContent = e.target.result;
          const parsed = Papa.parse(fileContent.trim(), { skipEmptyLines: true });
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
    setCsvDownloadName("sentiment_result.csv");
    setJsonDownloadName("sentiment_result.json");
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
        const res = await axios.post(`${API_BASE}/api/sentiment/compare`, {
          text: lines[0],
          models: [compareModelA, compareModelB],
        });
        setCompareResult(res.data?.comparisons || []);
        setLoading(false);
        return;
      } catch (err) {
        setResult({ error: "Có lỗi xảy ra khi so sánh model: " + (err?.response?.data?.error || err.message) });
        setLoading(false);
        return;
      }
    }

    try {
      const payloads = [];
      const exportRows = [];
      const collectedLineErrors = [];

      for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i];
        try {
          const res = await axios.post(`${API_BASE}/api/sentiment/analyze`, {
            text: line,
            model_name: selectedModel,
          });
          const payload = normalizeSentimentPayload(res.data, line);
          payloads.push(payload);
          exportRows.push({
            line_number: i + 1,
            status: "success",
            error_message: "",
            error_code: "",
            ...buildStandardExportRow(payload),
          });
        } catch (err) {
          const errorInfo = buildErrorInfo(err);
          collectedLineErrors.push({
            line_number: i + 1,
            error_message: errorInfo.error_message,
            error_code: errorInfo.error_code,
          });
          exportRows.push({
            line_number: i + 1,
            status: "error",
            error_message: errorInfo.error_message,
            error_code: errorInfo.error_code,
            task: "sentiment",
            input_text: line,
            model_name: selectedModel,
            prediction_label: "",
            prediction_id: "",
            confidence_score: "",
            processing_time_ms: "",
            token_count: line.trim().split(/\s+/).filter(Boolean).length,
            warnings: "",
            result_json: errorInfo.raw_payload || "{}",
          });
        }
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

      const standardRows = exportRows;
      let csvResult = Papa.unparse(standardRows);

      if (sharedFile)
      {
        
        setCsvDownloadName(`${sharedFile.name.replace(/\.[^/.]+$/, "")}_clean.csv`);
        setJsonDownloadName(`${sharedFile.name.replace(/\.[^/.]+$/, "")}_clean.json`);
          if (sharedFile.name.endsWith(".csv")) {
          const csvWithResults = csvData.map((row, index) => {
            if (index === 0) {
              const resultKeys = standardRows[0] ? Object.keys(standardRows[0]) : [];
              return [...row, ...resultKeys];
            }
            if (index - 1 >= standardRows.length) {
              return row; 
            }
            const result = standardRows[index - 1] ? standardRows[index - 1] : {};
            return [
                ...row,
                ...Object.values(result)
            ];
          });
          csvResult = Papa.unparse(csvWithResults);
        }
      }

      const csvUrl = createDownloadUrl(csvResult, "text/csv;charset=utf-8;");
      const jsonUrl = createDownloadUrl(JSON.stringify(standardRows, null, 2), "application/json;charset=utf-8;");
      setCsvResultUrl(csvUrl);
      setJsonResultUrl(jsonUrl);
      setLoading(false);
      } catch (err) {
        setResult({ error: "Có lỗi xảy ra khi gọi API: " + err.message });
        setLoading(false);
        return;
      }   
  };
    // Thay đổi model sẽ xóa kết quả và dữ liệu liên quan
    const handleModelChange = (e) => {
    setSelectedModel(e.target.value);
    setSampleUrls(
      e.target.value === "sentiment"
        ? TEST_SAMPLE_PATHS.sentiment
        : TEST_SAMPLE_PATHS.spam
    );
    setCompareMode(false);
    setCompareResult(null);
    setResult(null);
    setCsvResultUrl(null);
    setJsonResultUrl(null);
  };

  const pieData = result && !result.error ? {
    labels: selectedModel === "vispam"
      ? ["No-spam", "Spam"]
      : ["Tiêu cực", "Trung tính", "Tích cực"],
    datasets: [
      {
        data:
          selectedModel === "vispam"
            ? [
                result?.result?.["no-spam"] ? result.result["no-spam"] * 100 : 0,
                result?.result?.["spam"] ? result.result["spam"] * 100 : 0,
              ]
            : [
                result?.result?.NEG ? result.result.NEG * 100 : 0,
                result?.result?.NEU ? result.result.NEU * 100 : 0,
                result?.result?.POS ? result.result.POS * 100 : 0,
              ],
        backgroundColor:
          selectedModel === "vispam"
            ? ["#00b894", "#d63031"]
            : ["#ff7675", "#fdcb6e", "#00b894"],
        borderWidth: 1,
      },
    ],
  } : null;


  return (
    <div className="sentiment-analysis-tool">
      <strong>Phân tích cảm xúc</strong>
      <div className="options sentiment-options-row">
        <label className="sentiment-options-label">Chọn mô hình:</label>
        <div className="sentiment-options-inline">
          <label className="sentiment-radio-label">
            <input
              type="radio"
              value="sentiment"
              checked={selectedModel === "sentiment"}
              onChange={handleModelChange}
            />
            Cảm xúc (POS/NEU/NEG)
          </label>
          <label className="sentiment-radio-label">
            <input
              type="radio"
              value="vispam"
              checked={selectedModel === "vispam"}
              onChange={handleModelChange}
            />
            Phát hiện Spam (vispam)
          </label>
        </div>
      </div>
      
      <div className="feature-note sentiment-note">
        {selectedModel === "sentiment"
          ? "Mô hình phân tích cảm xúc: Dự đoán văn bản là Tích cực, Trung tính hoặc Tiêu cực."
          : "Mô hình phát hiện review spam: Dự đoán review trên các trang thương mại điện tử là Spam hoặc Không phải spam."}
      </div>
      <div className="sentiment-compare-row">
        <label className="sentiment-compare-label">
          <input
            type="checkbox"
            checked={compareMode}
            onChange={(e) => {
              setCompareMode(e.target.checked);
              setResult(null);
              setCompareResult(null);
            }}
            disabled={selectedModel !== "vispam"}
          />
          So sánh 2 model (Phobert vs VisoBert)
        </label>
        {compareMode && (
          <>
            <select value={compareModelA} onChange={(e) => setCompareModelA(e.target.value)}>
              <option value="vispam-Phobert">vispam-Phobert</option>
              <option value="vispam-VisoBert">vispam-VisoBert</option>
            </select>
            <span>vs</span>
            <select value={compareModelB} onChange={(e) => setCompareModelB(e.target.value)}>
              <option value="vispam-VisoBert">vispam-VisoBert</option>
              <option value="vispam-Phobert">vispam-Phobert</option>
            </select>
          </>
        )}
      </div>
      
      <FileUploader onFileSelect={handleFileSelect } sampleUrls={sampleUrls} sharedFile={sharedFile} setSharedFile={setSharedFile} />
      <div className="text-area-container">
        <div className="input-area">
            <>
              <label>Văn bản</label>
              <textarea
                rows={10}
                placeholder="Nhập văn bản tại đây..."
                value={sharedTextInput}
                disabled={(readMode === "all" && sharedFile && sharedFile.name.endsWith(".csv"))}
                onChange={(e) => {setSharedTextInput(e.target.value)}}
              />

            </>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="analyze-button" onClick={handleAnalyze} disabled={loading}>
              Phân tích
            </button>
            {loading && (
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 4 }}>
                  Đang xử lý...
                </div>
                <div className="loading-bar-container">
                  <div className="loading-bar" />
                </div>
              </div>
            )}
          </div>


        </div>        
        {!csvResultUrl && (        
        <div className="result-area">
          <label>Kết quả</label>
            <div className="result-box">
              {!result && (
                <div className="feature-result-empty">Kết quả sẽ hiển thị ở đây...</div>
              )}

                {result && !result.error && result.label && (
              <div className="feature-summary">
                <strong>Nhận định:  </strong>
                <span className="feature-summary-value">
                  {selectedModel === "vispam"
                      ? (result.label === "spam" ? "Spam" : "Không phải spam")
                      : result.label === "NEG"
                      ? "Tiêu cực"
                        : result.label === "NEU"
                        ? "Trung tính"
                        : "Tích cực"}
                </span>
                  <div className="feature-summary-meta">
                    <div><strong>Confidence:</strong> {result?.meta?.confidence_score ?? "N/A"}</div>
                    <div><strong>Thời gian xử lý:</strong> {result?.meta?.processing_time_ms ?? "N/A"} ms</div>
                    <div><strong>Số token:</strong> {result?.meta?.token_count ?? "N/A"}</div>
                    <div><strong>Cảnh báo:</strong> {(result?.meta?.warnings || []).length ? result.meta.warnings.join(" | ") : "Không"}</div>
                  </div>
              </div>
            )}

              {compareResult && compareResult.length > 0 && (
                <div className="feature-summary">
                  <strong>So sánh kết quả 2 model</strong>
                  <table className="feature-table">
                    <thead>
                      <tr>
                        <th>Model</th>
                        <th>Label</th>
                        <th>Confidence</th>
                        <th>Time (ms)</th>
                        <th>Token</th>
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
              <div className="feature-summary">
                <table className="feature-table">
                  <thead>
                    <tr>
                      <th>Dòng</th>
                      <th>Thông báo lỗi</th>
                      <th>Mã lỗi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineErrors.map((item, idx) => (
                      <tr key={`${item.line_number}-${idx}`}>
                        <td>{item.line_number}</td>
                        <td>{item.error_message || "Không rõ lỗi"}</td>
                        <td>{item.error_code || "N/A"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {result && result.error && (
              <div className="feature-error-text">{result.error}</div>
            )}

            {pieData && result.label && (
              <Pie
                data={pieData}
                className="custom-pie-chart feature-pie-chart"
                options={{
                  plugins: {
                    legend: {
                      display: true,
                      position: "bottom",
                      labels: {
                        usePointStyle: true,
                        boxWidth: 10,
                        padding: 15,
                      },
                    },
                    tooltip: {
                      callbacks: {
                        label: function (context) {
                          return `${context.label}: ${context.parsed.toFixed(2)}%`;
                        },
                      },
                    },
                  },
                  layout: {
                    padding: {
                      top: 10,
                      bottom: 10,
                    },
                  },
                }}
              />
            )}
            </div>
          </div>
          )}
      </div>
      {csvResultUrl && (
          <div className="result-area">
            <label>Kết quả phân tích</label>
                <CsvViewer csvFile={csvResultUrl} />
          <div className="csv-download-area">
            {/* Hiển thị nút tải file CSV nếu có kết quả */}
            {csvResultUrl && (
              <div className="feature-download-row">
                <a
                  href={csvResultUrl}
                  download={csvDownloadName}
                  className="feature-download-link"
                  title={`Tải file kết quả: ${csvDownloadName}`}
                >
                  <span role="img" aria-label="download">⬇️</span>
                </a>
                <span className="feature-download-name">
                  {csvDownloadName}
                </span>
                {jsonResultUrl && (
                  <a
                    href={jsonResultUrl}
                    download={jsonDownloadName}
                    className="feature-download-link feature-download-link-secondary"
                  >
                    JSON
                  </a>
                )}
              </div>
            )}
          </div>
          </div>
          )}
    </div>
  );
};  

export default SentimentAnalysisTool;