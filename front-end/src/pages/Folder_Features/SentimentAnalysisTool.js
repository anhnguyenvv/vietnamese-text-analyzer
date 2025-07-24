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


const SentimentAnalysisTool = ({ sharedTextInput, setSharedTextInput, sharedFile, setSharedFile }) => {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [csvResultUrl, setCsvResultUrl] = useState(null);
  const [csvDownloadName, setCsvDownloadName] = useState("sentiment_result.csv");
  const [selectedModel, setSelectedModel] = useState("sentiment"); // Thêm state chọn model
  const [csvData, setCsvData] = useState([]); 
  const [readMode, setReadMode] = useState("paragraph");
  const [sampleUrls, setSampleUrls] = useState(TEST_SAMPLE_PATHS.sentiment);

  const handleFileSelect = (content, file, readMode, csvColumn) => {
    setReadMode(readMode);
    setResult(null);
    setSharedFile(file || null);
    setCsvResultUrl(null);
    setSharedTextInput(content);
    setSharedFile(file || null);
    setCsvDownloadName("sentiment_result.csv");
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
    setCsvResultUrl(null);
    setCsvDownloadName("sentiment_result.csv");
    const lines = sharedTextInput.split(/\r?\n\s*\r?\n/).map(line => line.trim()).filter(line => line);
    if (lines.length === 0) {
      setResult({ error: "Vui lòng nhập văn bản hoặc chọn file để phân tích." });
      setLoading(false);
      return;
    }    
    const promises = lines.map(line => 
       axios.post(`${API_BASE}/api/sentiment/analyze`, {
        text: line,
        model_name: selectedModel,
        //label_type: labelType, // Gửi loại nhãn
      }).then(res => {
        if (res.data && res.data.label) {
          return {
            text: line,
            ...res.data
          };
        }
        else {
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
    setResult(null);
    setCsvResultUrl(null);
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
                result["no-spam"] ? result["no-spam"] * 100 : 0,
                result["spam"] ? result["spam"] * 100 : 0,
              ]
            : [
                result.NEG ? result.NEG * 100 : 0,
                result.NEU ? result.NEU * 100 : 0,
                result.POS ? result.POS * 100 : 0,
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
      <div className="options" style={{ marginBottom: 12 }}>
        <label style={{ marginRight: 8 }}>Chọn mô hình:</label>
        <div style={{ display: "inline-flex", gap: 16, alignItems: "center" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <input
              type="radio"
              value="sentiment"
              checked={selectedModel === "sentiment"}
              onChange={handleModelChange}
            />
            Cảm xúc (POS/NEU/NEG)
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
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
      
      <div style={{ color: "#d69e2e", fontStyle: "italic", marginBottom: 8 , fontSize: 14 }}>
        {selectedModel === "sentiment"
          ? "Mô hình phân tích cảm xúc: Dự đoán văn bản là Tích cực, Trung tính hoặc Tiêu cực."
          : "Mô hình phát hiện review spam: Dự đoán review trên các trang thương mại điện tử là Spam hoặc Không phải spam."}
      </div>
      
      <FileUploader onFileSelect={handleFileSelect } sampleUrls={sampleUrls} />
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
            <button
              className="analyze-button"
              onClick={() => {
                handleAnalyze();
              }}
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
        {!csvResultUrl && (        
        <div className="result-area">
          <label>Kết quả</label>
            <div className="result-box">
              {!result && (
                <div style={{ color: "#888" }}>Kết quả sẽ hiển thị ở đây...</div>
              )}

              {result && !result.error && result.label && (
              <div style={{ marginTop: 16 }}>
                <strong>Nhận định:  </strong>
                <span style={{ color: "#0984e3", fontWeight: 600 }}>
                  {selectedModel === "vispam"
                    ? (result.label === "spam" ? "Spam" : "Không phải spam")
                    : result.label === "NEG"
                      ? "Tiêu cực"
                      : result.label === "NEU"
                        ? "Trung tính"
                        : "Tích cực"}
                </span>
              </div>
            )}
            
            {result && result.error && (
              <div style={{ color: "red" }}>{result.error}</div>
            )}

            {pieData && result.label && (
              <Pie
                data={pieData}
                className="custom-pie-chart"
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
                style={{ maxWidth: 500, margin: "16px auto" }}
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
              <div>
                <a
                  href={csvResultUrl}
                  download={csvDownloadName}
                  className="analyze-button"
                  title={`Tải file kết quả: ${csvDownloadName}`}
                  style={{
                    background: "#e0e0e0", // màu xám nhạt
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
          )}
    </div>
  );
};  

export default SentimentAnalysisTool;