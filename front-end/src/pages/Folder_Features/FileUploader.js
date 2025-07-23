import React, { useState, useEffect } from "react";
import mammoth from "mammoth";
import Papa from "papaparse";

const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB

const FileUploader = ({ onFileSelect, sampleUrls }) => {
  const [fileName, setFileName] = useState("");
  const [lines, setLines] = useState([]);
  const [selectedLine, setSelectedLine] = useState("");
  const [readMode, setReadMode] = useState("paragraph");
  const [fileObj, setFileObj] = useState(null);
  const [fileContent, setFileContent] = useState("");
  const [allContent, setAllContent] = useState("");
  // Thêm state cho bảng CSV
  const [csvColumns, setCsvColumns] = useState([]);
  const [csvColumn, setCsvColumn] = useState(null);
  const [csvPreviewTable, setCsvPreviewTable] = useState([]);
  useEffect(() => {
    if (!fileContent) return;
    if (readMode === "all") {
      if (fileObj && fileObj.name && fileObj.name.endsWith(".csv") && csvColumn) {
        const parsed = Papa.parse(fileContent.trim(), { header: true, skipEmptyLines: true });
        const filteredData = parsed.data.filter(row => row[csvColumn]&& row[csvColumn].trim() !== "");
        if (filteredData.length === 0) {
          onFileSelect("Không có dữ liệu trong cột đã chọn.", fileObj, readMode, csvColumn);
          return;
        }
        const filteredContent = Papa.unparse(filteredData, { header: true });
        const filteredCsvFile = new File([filteredContent], fileObj.name, { type: "text/csv" });
        const textLines = filteredData.map(row =>{
                          const val = row[csvColumn];
                          return typeof val === "string" ? val.replace(/\r?\n\s*\r?\n/g, " ") : (val ? String(val) : "");
                        }).filter(Boolean);
        const allText = textLines.join("\n\n");
        onFileSelect(allText, filteredCsvFile, readMode, csvColumn);
      } else {
        onFileSelect(allContent, fileObj, readMode, csvColumn);
      }
    } else {      
      if (fileObj && fileObj.name && fileObj.name.endsWith(".csv")) {
        const parsed = Papa.parse(fileContent.trim(), { header: true, skipEmptyLines: true });
        const filteredData = parsed.data.filter(row => row[csvColumn] && row[csvColumn].trim() !== "");
        if (filteredData.length === 0) {
          onFileSelect("Không có dữ liệu trong cột đã chọn.", fileObj, readMode, csvColumn);
          return;
        }
        const filteredContent = Papa.unparse(filteredData, { header: true });
        const filteredCsvFile = new File([filteredContent], fileObj.name, { type: "text/csv" });

        const textLines = filteredData.map(row => row[csvColumn]).filter(Boolean);
        setLines(textLines);
        setSelectedLine(textLines[0] || "");
        onFileSelect(textLines[0] || "", filteredCsvFile, readMode, csvColumn);
      }
      else {
      setSelectedLine(lines[0] || "");
      onFileSelect(lines[0] || "", fileObj, readMode, csvColumn);
    }
    }
    // eslint-disable-next-line
  }, [readMode, fileContent, csvColumn]);

  const loadFile = async (file) => {
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      alert("Vui lòng chọn file nhỏ hơn 5MB.");
      return "";
    }
    setFileName(file.name);
    setFileObj(file);
    const ext = file.name.split('.').pop().toLowerCase();

    if (ext === "txt") {
      const reader = new FileReader();
      reader.onload = () => {
        setFileContent(reader.result);
        setAllContent(reader.result);
        const paras = reader.result.split(/\r?\n\s*\r?\n/).map(p => p.trim()).filter(p => p);
        setLines(paras);
        setCsvColumns([]);
        setCsvColumn("");
        setCsvPreviewTable([]);
      };
      reader.readAsText(file);
    } else if (ext === "docx") {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      setFileContent(result.value);
      setAllContent(result.value);
      const paras = result.value.split(/\r?\n\s*\r?\n/).map(p => p.trim()).filter(p => p);
      setLines(paras);
      setCsvColumns([]);
      setCsvColumn("");
      setCsvPreviewTable([]);
    } else if (ext === "csv") {
      const reader = new FileReader();
      reader.onload = () => {
        setFileContent(reader.result);
        setAllContent(reader.result);
        // Parse CSV lấy header và preview
        const parsed = Papa.parse(reader.result.trim(), { skipEmptyLines: true });
        setCsvPreviewTable(parsed.data.slice(0, 6)); // header + 5 dòng
        if (parsed.data.length > 0) {
          const headers = parsed.data[0];
          setCsvColumns(headers);
          setCsvColumn(headers[0]); // mặc định chọn cột đầu
        }
      };
      reader.readAsText(file);
    } else {
      setLines([]);
      setSelectedLine("");
      setFileContent("");
      setFileObj(null);
      setAllContent("");
      setCsvColumns([]);
      setCsvColumn("");
      setCsvPreviewTable([]);
      onFileSelect("Định dạng không hỗ trợ. Hãy dùng .txt, .docx, .csv");
    }
  }

  const handleChange = async (e) => {
    const file = e.target.files[0];
    loadFile(file);
  };

  const handleSelectLine = (e) => {
    setSelectedLine(e.target.value);
    onFileSelect(e.target.value, fileObj, readMode);
  };

  const handleSelectCsvColumn = (e) => {
    setCsvColumn(e.target.value);

  };

  return (
    <div className="file-upload">
      <input
        type="file"
        id="fileInput"
        accept=".txt,.docx,.csv"
        style={{ display: "none" }}
        onChange={handleChange}
      />
      <div style={{ display: "flex", alignItems: "center" }}>
        <button
          type="button"
          className="file-button"
          onClick={() => document.getElementById("fileInput").click()}
        >
          Chọn file
        </button>
        {fileName && (
          <>
            <button
              type="button"
              className="file-button"
              style={{
                marginLeft: 0,
                background: "#aaa",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                padding: "2px 10px",
                cursor: "pointer"
              }}
              onClick={() => {
                setFileName("");
                setLines([]);
                setSelectedLine("");
                setReadMode("paragraph");
                setFileObj(null);
                setFileContent("");
                setAllContent("");
                setCsvColumns([]);
                setCsvColumn("");
                setCsvPreviewTable([]);
                document.getElementById("fileInput").value = "";
                if (onFileSelect) onFileSelect("", null);
              }}
            >
              {fileName} X
            </button>
          </>
        )}
      </div>
      {fileName && fileObj && fileObj.name.endsWith(".csv") && csvColumns.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <label>Chọn cột chứa văn bản cần xử lý:&nbsp;</label>
          <select value={csvColumn} onChange={handleSelectCsvColumn}>
            {csvColumns.map((col, idx) => (
              <option key={col + idx} value={col}>{col}</option>
            ))}
          </select>
          <div style={{ marginTop: 10 }}>
            <strong>Xem trước file CSV:</strong>
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
                  {csvPreviewTable.map((row, idx) => (
                    <tr key={idx} style={{ background: idx === 0 ? "#e0e0e0" : "inherit" }}>
                      {row.map((cell, cidx) => (
                        <td
                          key={cidx}
                          style={{
                            border: "1px solid #eee",
                            padding: 4,
                            textAlign: "left",
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
        </div>
      )}

      {fileName && (
        <div style={{ marginTop: 10 }}>
          <label style={{ marginRight: 10 }}>
            <input
              type="radio"
              name="readMode"
              value="paragraph"
              checked={readMode === "paragraph"}
              onChange={() => setReadMode("paragraph")}
            />{" "}
            Đọc theo đoạn
          </label>
          <label>
            <input
              type="radio"
              name="readMode"
              value="all"
              checked={readMode === "all"}
              onChange={() => setReadMode("all")}
            />{" "}
            Đọc toàn bộ file
          </label>
        </div>
      )}

      {fileName && readMode === "paragraph" && lines.length > 1 && (
        <div style={{ marginTop: 10 }}>
          <label>Chọn đoạn để xử lý:&nbsp;</label>
          <select
            value={selectedLine}
            onChange={handleSelectLine}
            style={{ width: "80%" }}
          >
            {lines.map((line, idx) => (
              <option key={idx} value={line}>
                {line.length > 100 ? line.slice(0, 100) + "..." : line}
              </option>
            ))}
          </select>
        </div>
      )}
      {sampleUrls && sampleUrls.length > 0 && (
      <div style={{ margin: "12px 0" }}>
            <b>Tải file mẫu thử nghiệm:</b>
            {sampleUrls.map((url, idx) => (
              <span key={url} style={{ marginRight: 16 }}>
                <button
                  type="button"
                  style={{
                    color: "#0984e3",
                    background: "transparent",
                    border: "none",
                    textDecoration: "underline",
                    fontSize: 15,
                    marginRight: 4,
                  }}
                  onClick={async (e) => {
                    e.preventDefault();
                    try {
                      const res = await fetch(url);
                      const text = await res.text();
                      // Tạo file object như khi chọn file thật
                      const ext = url.split('.').pop().toLowerCase();
                      let mime = "text/plain";
                      if (ext === "csv") mime = "text/csv";
                      if (ext === "docx") mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
                      const fakeFile = new File([text], url.split("/").pop(), { type: mime });
                      // Truyền vào FileUploader như file mới
                      loadFile(fakeFile);
                      setFileName(fakeFile.name);
                    } catch {
                      alert("Không thể tải file mẫu!");
                    }
                  }}
                >
                  {url.split("/").pop()}
                </button>
              </span>
            ))}
          </div>
      )}
    </div>    
  );
};

export default FileUploader;