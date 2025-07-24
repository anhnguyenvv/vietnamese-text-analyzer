import React, { useState } from "react";
import { API_BASE, TEST_SAMPLE_PATHS}  from "../../config"; 
import "./Features.css";
import FileUploader from "./FileUploader";
import axios from "axios";
import Papa from "papaparse";
import CsvViewer from "./csvViewer";

const PreprocessingTool = ({ sharedTextInput, setSharedTextInput, sharedFile, setSharedFile }) => {
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [removeStopwords, setRemoveStopwords] = useState(true);
  const [removeEmojis, setRemoveEmojis] = useState(false);
  const [removeDuplicates, setRemoveDuplicates] = useState(false);
  const [lowercase, setLowercase] = useState(true);
  const [removeNumbers, setRemoveNumbers] = useState(true);
  const [csvResultUrl, setCsvResultUrl] = useState(null);
  const [csvDownloadName, setCsvDownloadName] = useState("text_cleaned.csv");
  const [csvData, setCsvData] = useState([]);
  const [readMode, setReadMode] = useState("paragraph");
  const [sampleUrls] = useState(TEST_SAMPLE_PATHS.preprocess);

  const handleFileSelect = (content, file, readMode, csvColumn) => {
    setSharedTextInput(content);
    setSharedFile(file || null);
    setReadMode(readMode);
    setResult(null);
    setCsvResultUrl(null);
    setCsvDownloadName("sentiment_result.csv");
    if (file && file.name.endsWith(".csv")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const fileContent = e.target.result;
          const parsed = Papa.parse(fileContent.trim(), { skipEmptyLines: true });
          const filteredData = parsed.data.filter(row => row && row[csvColumn].trim() !== "");
          setCsvData(filteredData);
        };
        reader.readAsText(file);
        
      } else {
        setCsvData([]);
      }
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setResult("");
    setCsvResultUrl(null);
    setCsvDownloadName("preprocess_result.csv");
    const lines = sharedTextInput.split(/\r?\n\s*\r?\n/)
                      .map(line => line.trim()).filter(line => line);
    if (lines.length === 0) {
      setResult({ error: "Vui lòng nhập văn bản hoặc chọn file để phân tích." });
      setLoading(false);
      return;
    } 
    const promises = lines.map(line =>
    axios.post(`${API_BASE}/api/preprocessing/preprocess`, {
          text: line,
          remove_stopwords: removeStopwords,
          remove_emojis: removeEmojis,
          remove_duplicates: removeDuplicates,
          lowercase: lowercase,
          remove_numbers: removeNumbers
        })
    .then(res => {
      if (res.data && res.data.preprocessed_text) {
        return {
          text: line,
          cleaned_text: res.data.preprocessed_text || "",
        };
      } else {
        throw new Error(res.data.error || "Không rõ");
      }
    })
  );
  try {
    const results = await Promise.all(promises); 
    if (results.length === 1) {
      setResult(results[0]);
      setLoading(false);
      return;
    } 
    let csvResult = Papa.unparse(results);
    if (sharedFile)
    {
      setCsvDownloadName(`${sharedFile.name.replace(/\.[^/.]+$/, "")}_clean.csv`);
        if (sharedFile.name.endsWith(".csv")) {
        const csvWithResults = csvData.map((row, index) => {
          if (index === 0) {
            const resultKeys = results[0] ? Object.keys(results[0]).filter(key => key !== "text") : [];
            return [...row, ...resultKeys];
          }
          if (index - 1 >= results.length) {
            return row; 
          }
          const result = results[index - 1] ? results[index - 1] : {};
          delete result.text; 
          return [
              ...row,
              ...Object.values(result)
          ];
        });
        csvResult = Papa.unparse(csvWithResults);
      }
    }
    const blob = new Blob([csvResult], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    setCsvResultUrl(url);
    setLoading(false);
  } catch (err) {
    setResult({ error: "Có lỗi xảy ra khi gọi API: " + err.message });
    setLoading(false);
  }
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
        
      </div>
      <FileUploader onFileSelect={handleFileSelect} sampleUrls={sampleUrls} />

      <div className="text-area-container">
        <div className="input-area">
          {!(readMode === "all" && sharedFile && sharedFile.name.endsWith(".csv")) && (
            <>
              <label>Văn bản</label>
              <textarea
                rows={10}
                placeholder="Nhập văn bản tại đây..."
                value={sharedTextInput}
                onChange={(e) => setSharedTextInput(e.target.value)}
              />
            </>
          )}
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
          {!csvResultUrl && (
            <div className="result-box">
            {!result && (
              <div style={{ color: "#888" }}>Kết quả sẽ hiển thị ở đây...</div>
            )}
            {result && result.error && (
              <div style={{ color: "red" }}>{result.error}</div>
            )}
            {result && !result.error && ( 
                <div>
                   {result.cleaned_text}
                </div>              
            )}
          </div>
          )}
          {csvResultUrl && (
            <CsvViewer csvFile={csvResultUrl} statistics={false} />
          )}
          {result && !result.error && (
            <>
              <button
                onClick={() => navigator.clipboard.writeText(result.cleaned_text)}
                style={{
                  marginTop: 8,
                  padding: "6px 12px",
                  background: "#0984e3",
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                }}
              >
                Sao chép
              </button>
                {/* Thêm các nút khác nếu cần */}
              <div
                style={{
                  marginTop: 12,
                  background: "#f1f2f6",
                  borderRadius: 4,
                  padding: "10px 14px",
                  color: "#444",
                  fontSize: 15,
                  fontStyle: "italic",
                  borderLeft: "4px solid #0984e3",
                }}
              >
                Gợi ý: Bạn có thể sử dụng văn bản đã làm sạch này để tiếp tục phân tích cảm xúc, phân loại, gán nhãn, tóm tắt hoặc các xử lý khác trong hệ thống!
              </div>
            </>
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
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreprocessingTool;