import React, { useState } from "react";
import "./Features.css";
import { API_BASE, TEST_SAMPLE_PATHS }  from "../../config"; // Địa chỉ API backend
import FileUploader from "./FileUploader";
import { Pie } from "react-chartjs-2";
import axios from "axios";
import Papa from "papaparse";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
ChartJS.register(ArcElement, Tooltip, Legend);

const SentimentAnalysisTool = () => {
  const [textInput, setTextInput] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [csvResultUrl, setCsvResultUrl] = useState(null);
  const [csvResultPreview, setCsvResultPreview] = useState([]);
  const [csvDownloadName, setCsvDownloadName] = useState("sentiment_result.csv");
  const [selectedModel, setSelectedModel] = useState("sentiment"); // Thêm state chọn model
  //const [labelType, setLabelType] = useState("label"); 
  const [csvData, setCsvData] = useState([]); 
  const [readMode, setReadMode] = useState("paragraph");
  const [sampleUrls] = useState(TEST_SAMPLE_PATHS.sentiment);
 
  const handleFileSelect = (content, file, readMode) => {
    setTextInput(content);
    setSelectedFile(file || null);
    setReadMode(readMode);
    setCsvResultPreview([]);
    setResult(null);
    setCsvResultUrl(null);
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
        setCsvResultPreview([]);
        setCsvData([]);
      }
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setResult(null);
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
        const res = await axios.post(`${API_BASE}/api/sentiment/analyze`, {
          text: line,
          model_name: selectedModel,
          //label_type: labelType, // Gửi loại nhãn
        });
        if (res.data && res.data.label) {
            results.push({
            text: line,
            ...res.data});
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
      //   handleAnalyzeFile();
      //   setLoading(false);
      //   return;
      setCsvDownloadName(`${selectedFile.name.replace(/\.csv$/i, "")}_${selectedModel}_result.csv`);
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
    // Thay đổi model sẽ xóa kết quả và dữ liệu liên quan
  const handleModelChange = (e) => {
    setSelectedModel(e.target.value);
    setResult(null);
    setCsvResultUrl(null);
    setCsvResultPreview([]);
  };
  // Xử lý file CSV
  // const handleAnalyzeFile = async () => {
  //   if (!selectedFile || !selectedFile.name.endsWith(".csv")) {
  //     alert("Vui lòng chọn file CSV hợp lệ!");
  //     return;
  //   }
  //   setLoading(true);
  //   setResult(null);
  //   setCsvResultUrl(null);
  //   setCsvResultPreview([]);
  //   try {
  //     const formData = new FormData();

  //     formData.append("file", selectedFile);
  //     formData.append("model_name", selectedModel); // Gửi model_name

  //     const res = await fetch(`${API_BASE}/api/sentiment/analyze-file`, {
  //       method: "POST",
  //       body: formData,
  //     });
  //     if (res.ok) {
  //       const blob = await res.blob();
  //       const url = window.URL.createObjectURL(blob);
  //       setCsvResultUrl(url);

  //       // Đặt tên file kết quả dựa trên file gốc
  //       const baseName = selectedFile.name.replace(/\.csv$/i, "");
  //       setCsvDownloadName(`${baseName}_${selectedModel}_result.csv`);

  //       // Đọc trước kết quả để xem trước
  //       const text = await blob.text();
  //       const parsed = Papa.parse(text.trim(), { skipEmptyLines: true });
  //       const previewRows = parsed.data; 
  //       setCsvResultPreview(previewRows);

  //       setResult({ message: "Phân tích file CSV thành công. Bạn có thể xem trước và tải kết quả bên dưới." });
  //     } else {
  //       const data = await res.json();
  //       setResult({ error: data.error || "Có lỗi xảy ra khi xử lý file." });
  //     }
  //   } catch (err) {
  //     setResult({ error: "Có lỗi xảy ra khi gọi API: " + err.message });
  //   }
  //   setLoading(false);
  // };
  // Chuẩn bị dữ liệu cho Pie Chart
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
      
      {/* <div className="options" style={{ marginBottom: 12 }}>
        <label style={{ marginRight: 8 }}>Chọn nhãn trả về:</label>

        <div style={{ display: "inline-flex", gap: 16, alignItems: "center" }}>
          <label>
            <input
              type="radio"
              value="label"
              checked={labelType === "label"}
              onChange={() => setLabelType("label")}
            /> Xuất nhãn dạng tên (label)
          </label>
          <label style={{ marginLeft: 16 }}>
            <input
              type="radio"
              value="id"
              checked={labelType === "id"}
              onChange={() => setLabelType("id")}
            /> Xuất nhãn dạng số (id)
          </label>
        </div>
      </div> */}
     
      <div style={{ color: "#d69e2e", fontStyle: "italic", marginBottom: 8 , fontSize: 14 }}>
        {selectedModel === "sentiment"
          ? "Mô hình phân tích cảm xúc: Dự đoán văn bản là Tích cực, Trung tính hoặc Tiêu cực."
          : "Mô hình phát hiện spam: Dự đoán văn bản là Spam hoặc Không phải spam."}
      </div>
      
      <FileUploader onFileSelect={handleFileSelect } sampleUrls={sampleUrls} />
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
                    {/* Hiển thị bảng preview */}
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
      </div>
      
    </div>
  );
};  

export default SentimentAnalysisTool;