import React, { useState } from "react";
import "./Features.css";
import FileUploader from "./FileUploader";
import CsvViewer from "./csvViewer"; // Import CsvViewer component
import Papa from "papaparse";
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from "chart.js";
import axios from "axios";
import {API_BASE, TEST_SAMPLE_PATHS}from "../../config"; // Địa chỉ API backend
ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const ClassificationTool = ({ sharedTextInput, setSharedTextInput, sharedFile, setSharedFile }) => {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedClassification, setSelectedClassification] = useState("essay_identification");
  const [csvResultUrl, setCsvResultUrl] = useState(null);
  const [csvDownloadName, setCsvDownloadName] = useState("classification_result.csv");
  const [csvData, setCsvData] = useState([]);
  const [readMode, setReadMode] = useState("paragraph");
  const [sampleUrls, setSampleUrls] = useState(TEST_SAMPLE_PATHS.essay_identification);

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
    setCsvResultUrl(null);
    setCsvDownloadName("classification_result.csv");
    const lines = sharedTextInput.split(/\r?\n\s*\r?\n/).map(line => line.trim()).filter(line => line);
    if (lines.length === 0) {
      setResult({ error: "Vui lòng nhập văn bản hoặc chọn file để phân tích." });
      setLoading(false);
      return;
    }
    const promises = lines.map(line =>
    axios.post(`${API_BASE}/api/classification/classify`, {
      text: line,
      model_name: selectedClassification,
    })
    .then(res => {
      if (res.data && res.data.label_name) {
        return {
          text: line,
          label: res.data.label_name,
          label_id: res.data.label_id
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
    setResult(null);
    let csvResult = Papa.unparse(results);
    if (sharedFile)
    {
      setCsvDownloadName(`${sharedFile.name.replace(/\.[^/.]+$/, "")}_classify.csv`);
        if (sharedFile.name.endsWith(".csv")) {
        const csvWithResults = csvData.map((row, index) => {
          if (index === 0) {
            const resultKeys = results[0] ? Object.keys(results[0]).filter(key => key !== "text") : [];
            return [...row, ...resultKeys];
          }
          if (index - 1 >= results.length) {
            return row; 
          }
          const res = results[index - 1] ? results[index - 1] : {};
          delete res.text; 
          return [
              ...row,
              ...Object.values(res)
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
      <FileUploader
        onFileSelect={handleFileSelect} 
        sampleUrls={sampleUrls}
        sharedFile={sharedFile}
        setSharedFile={setSharedFile}
      />
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
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClassificationTool;