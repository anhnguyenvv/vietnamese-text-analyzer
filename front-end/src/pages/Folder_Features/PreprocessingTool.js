import React, { useState } from "react";
import { API_BASE, TEST_SAMPLE_URLS }  from "../../config"; // Địa chỉ API backend
import "./Features.css";
import FileUploader from "./FileUploader";
import axios from "axios";
import Papa from "papaparse";

const PreprocessingTool = () => {
  const [textInput, setTextInput] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [removeStopwords, setRemoveStopwords] = useState(true);
  const [removeEmojis, setRemoveEmojis] = useState(false);
  const [removeDuplicates, setRemoveDuplicates] = useState(false);
  const [lowercase, setLowercase] = useState(true);
  const [removeNumbers, setRemoveNumbers] = useState(true);

  const [csvResultUrl, setCsvResultUrl] = useState(null);
  const [csvResultPreview, setCsvResultPreview] = useState([]);
  const [csvDownloadName, setCsvDownloadName] = useState("text_cleaned.csv");
  const [selectedFile, setSelectedFile] = useState(null);
  const [csvData, setCsvData] = useState([]);
  const [readMode, setReadMode] = useState("paragraph");

  const handleFileSelect = (content, file, readModeParam) => {
    setTextInput(content);
    setSelectedFile(file || null);
    setReadMode(readModeParam);
    setResult(null);
    setCsvResultUrl(null);
    setCsvResultPreview([]);
    setCsvDownloadName("classification_result.csv");
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
      setCsvResultPreview([]);
    }
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setResult("");
    setCsvResultUrl(null);
    setCsvResultPreview([]);
    setCsvDownloadName("sentiment_result.csv");
    const lines = textInput.split(/\r?\n\s*\r?\n/).map(line => line.trim()).filter(line => line);
    if (lines.length === 0) {
      setResult({ error: "Vui lòng nhập văn bản hoặc chọn file để phân tích." });
      setLoading(false);
      return;
    } 
    const results = [];
    for (const line of lines) {
      try {
        const res = await axios.post(`${API_BASE}/api/preprocessing/preprocess`, {
          text: line,
          remove_stopwords: removeStopwords,
          remove_emojis: removeEmojis,
          remove_duplicates: removeDuplicates,
          lowercase: lowercase,
          remove_numbers: removeNumbers
        });
        const data = res.data;
        if (data.preprocessed_text) {
          results.push({
              text: line,
              cleaned_text: data.preprocessed_text});
        } else {
          setResult(data.error || "Có lỗi xảy ra!");
        }
      } catch (err) {
        setResult("Có lỗi xảy ra khi gọi API!");
      }
    }
    if (results.length === 1) {
      setResult(results[0]);
      setLoading(false);
      return;
    } 
    let csvResult = Papa.unparse(results);
    if (selectedFile && selectedFile.name.endsWith(".csv")) {
      setCsvDownloadName(`${selectedFile.name.replace(/\.csv$/i, "")}_clean.csv`);
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
    const blob = new Blob([csvResult], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    setCsvResultUrl(url);
    const text = await blob.text();
    const parsed = Papa.parse(text.trim(), { skipEmptyLines: true });
    const previewRows = parsed.data; 
    setCsvResultPreview(previewRows);
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
        
      </div>
      <FileUploader onFileSelect={handleFileSelect} />

      <div className="text-area-container">
        <div className="input-area">
          {!(readMode === "all" && selectedFile && selectedFile.name.endsWith(".csv")) && (
            <>
              <label>Văn bản</label>
              <textarea
                rows={10}
                placeholder="Nhập văn bản tại đây..."
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
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
          <div className="result-box">
            {!result && (
              <div style={{ color: "#888" }}>Kết quả sẽ hiển thị ở đây...</div>
            )}
            {result && result.error && (
              <div style={{ color: "red" }}>{result.error}</div>
            )}
            {result && !result.error && (
              <div>
                <div>
                  <strong>Văn bản đã xử lý:</strong> {result.cleaned_text}
                </div>

              </div>
            )}
            {csvResultUrl && (
              <div style={{ marginTop: 16 }}>
                <strong>Xem trước file kết quả:</strong>
                <div
                  style={{
                    background: "#fafafa",
                    border: "1px solid #eee",
                    borderRadius: 4,
                    padding: 8,
                    fontFamily: "monospace",
                    fontSize: 13,
                    maxHeight: 220,
                    overflow: "auto",
                    marginBottom: 8,
                  }}
                >
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <tbody>
                      {csvResultPreview.map((row, idx) => (
                        <tr key={idx} style={{ background: idx === 0 ? "#e0e0e0" : "inherit" }}>
                          {row.map((cell, cidx) => (
                            <td
                              key={cidx}
                              style={{
                                border: "1px solid #ddd",
                                padding: "4px 8px",
                                fontWeight: idx === 0 ? "bold" : "normal",
                                whiteSpace: "pre-wrap",
                              }}
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
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