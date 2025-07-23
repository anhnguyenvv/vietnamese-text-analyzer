import React, { useState } from "react";
import "./Features.css";
import FileUploader from "./FileUploader";
import Papa from "papaparse";
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from "chart.js";
import { Bar } from "react-chartjs-2";
import axios from "axios";
import {API_BASE, TEST_SAMPLE_PATHS}from "../../config"; // Địa chỉ API backend
ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const ClassificationTool = () => {
  const [textInput, setTextInput] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedClassification, setSelectedClassification] = useState("essay_identification");

  const [csvResultUrl, setCsvResultUrl] = useState(null);
  const [csvResultPreview, setCsvResultPreview] = useState([]);
  const [csvDownloadName, setCsvDownloadName] = useState("classification_result.csv");
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
  const handleLoadSample = async (url) => {
    try {
      const res = await fetch(url);
      const text = await res.text();
      setTextInput(text);
      setSelectedFile(null);
      setResult(null);
      setCsvResultUrl(null);
      setCsvResultPreview([]);
      setCsvDownloadName("sentiment_result.csv");
    } catch (e) {
      alert("Không thể tải file mẫu!");
    }
  };
  const handleAnalyze = async () => {
    setLoading(true);
    setResult(null);
    setCsvResultUrl(null);
    setCsvResultPreview([]);
    setCsvDownloadName("classification_result.csv");
    const lines = textInput.split(/\r?\n\s*\r?\n/).map(line => line.trim()).filter(line => line);
    if (lines.length === 0) {
      setResult({ error: "Vui lòng nhập văn bản hoặc chọn file để phân tích." });
      setLoading(false);
      return;
    }
    const results = [];
    for (const line of lines) {
      try {
        const res = await axios.post(`${API_BASE}/api/classification/classify`, {
          text: line,
          model_name: selectedClassification,
        });
        if (res.data && res.data.label_name) {
            results.push({
            text: line,
            label: res.data.label_name
        });
        }
        else {
          setResult({ error: "Có lỗi xảy ra: " + (res.data.error || "Không rõ") });
          setLoading(false);
          return;
        }
      } catch (err) {
        setResult({ error: "Có lỗi xảy ra khi gọi API: " + err.message });
        setLoading(false);
        return;
      }
    }
    if (results.length === 1) {
      setResult(results[0]);
      setLoading(false);
      return;
    } 
    let csvResult = Papa.unparse(results);
    if (selectedFile && selectedFile.name.endsWith(".csv")) {
      setCsvDownloadName(`${selectedFile.name.replace(/\.csv$/i, "")}_${selectedClassification}_result.csv`);
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

  const getBarChartData = (result) => {
    if (!result || !result.all_labels) return null;
    const labels = Object.keys(result.all_labels);
    const data = Object.values(result.all_labels).map((v) => Math.round(v * 1000) / 10);
    return {
      labels,
      datasets: [
        {
          label: "Xác suất (%)",
          data,
          backgroundColor: "#0984e3",
        },
      ],
    };
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
            onChange={() => setSelectedClassification("essay_identification")}
          />{" "}
          Phân loại kiểu văn bản
        </label>
        <label style={{ marginLeft: 16 }}>
          <input
            type="radio"
            name="classification"
            value="topic_classification"
            checked={selectedClassification === "topic_classification"}
            onChange={() => setSelectedClassification("topic_classification")}
          />{" "}
          Phân loại chủ đề
        </label>
      </div>
      <div style={{ color: "#d69e2e", fontStyle: "italic", marginBottom: 8 , fontSize: 14 }}>
        {selectedClassification === "essay_identification"
          ? "Mô hình phân loại kiểu văn bản: Dự đoán thể loại văn bản với các nhãn như: Nghị luận, Biểu cảm, Miêu tả, Thuyết minh, Tự sự."
          : "Mô hình phân loại chủ đề: Dự đoán văn bản thuộc về chủ đề nào với 10 chủ đề khác nhau."}
      </div>
      <FileUploader
        onFileSelect={handleFileSelect}
      />
      <div className="text-area-container">
        <div className="input-area">
          khi không là file csv
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
          <div className="result-box">
            {!result && (
              <div style={{ color: "#888" }}>Kết quả sẽ hiển thị ở đây...</div>
            )}
            {result && result.error && (
              <div style={{ color: "red" }}>{result.error}</div>
            )}
            {result && !result.error && result.label_name && (
              <div style={{ marginTop: 16 }}>
                <strong>Nhận định: </strong>
                <span style={{ color: "#0984e3", fontWeight: 600 }}>
                  {result.label_name}
                </span>
              </div>
            )}
            {result && !result.error && result.all_labels && (
              <div style={{ maxWidth: 420, margin: "24px auto 0" }}>
                <Bar
                  data={getBarChartData(result)}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: { display: false },
                      tooltip: { callbacks: { label: ctx => `${ctx.parsed.y}%` } }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        max: 100,
                        title: { display: true, text: "Xác suất (%)" }
                      },
                      x: {
                        title: { display: true, text: "Nhãn" }
                      }
                    }
                  }}
                />
                <div style={{ textAlign: "center", marginTop: 8, fontSize: 13, color: "#636e72" }}>
                  Biểu đồ xác suất các nhãn dự đoán
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

export default ClassificationTool;