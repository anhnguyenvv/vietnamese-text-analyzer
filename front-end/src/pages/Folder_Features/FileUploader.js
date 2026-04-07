import React, { useState, useEffect} from "react";
import mammoth from "mammoth";
import Papa from "papaparse";

const LIMITS = {
  MAX_FILE_SIZE_MB: 5,
  MAX_ROWS: 5000,
  MAX_TEXT_LENGTH: 20000,
  ENCODING: "utf-8 / utf-8-sig",
};

const MAX_FILE_SIZE = LIMITS.MAX_FILE_SIZE_MB * 1024 * 1024;

const FileUploader = ({ onFileSelect, sampleUrls, sharedFile, setSharedFile, changeFile }) => {
  const [fileName, setFileName] = useState("");
  const [lines, setLines] = useState([]);
  const [selectedLine, setSelectedLine] = useState("");
  const [readMode, setReadMode] = useState("paragraph");
  const [fileContent, setFileContent] = useState("");
  const [allContent, setAllContent] = useState("");
  // Thêm state cho bảng CSV
  const [csvColumns, setCsvColumns] = useState([]);
  const [csvColumn, setCsvColumn] = useState(null);
  const [csvPreviewTable, setCsvPreviewTable] = useState([]);
  const [uploadError, setUploadError] = useState("");
  const [uploadNotice, setUploadNotice] = useState("");
  const [readProgress, setReadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);

  const resetUploadState = () => {
    setUploadError("");
    setUploadNotice("");
    setReadProgress(0);
  };

  const readAsArrayBuffer = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onprogress = (event) => {
        if (event.lengthComputable) {
          setReadProgress(Math.round((event.loaded / event.total) * 100));
        }
      };
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Không thể đọc file."));
      reader.readAsArrayBuffer(file);
    });

  const decodeUtf8Text = (arrayBuffer) => {
    try {
      const decoder = new TextDecoder("utf-8", { fatal: true });
      return decoder.decode(arrayBuffer);
    } catch (_err) {
      return null;
    }
  };

  const parseParagraphs = (text) =>
    text
      .split(/\r?\n\s*\r?\n/)
      .map((p) => p.trim())
      .filter((p) => p);

  useEffect(() => {
    if (!fileContent) return;
    if (readMode === "all") {
      if (sharedFile && sharedFile.name && sharedFile.name.endsWith(".csv") && csvColumn) {
        const parsed = Papa.parse(fileContent.trim(), { header: true, skipEmptyLines: true });
        const filteredData = parsed.data.filter(row => row[csvColumn]&& row[csvColumn].trim() !== "");
        if (filteredData.length === 0) {
          onFileSelect("Không có dữ liệu trong cột đã chọn.", sharedFile, readMode, csvColumn);
          return;
        }
        
        const filteredContent = Papa.unparse(filteredData, { header: true });
        const filteredCsvFile = new File([filteredContent], sharedFile.name, { type: "text/csv" });
        const textLines = filteredData.map(row =>{
                          const val = row[csvColumn];
                          return typeof val === "string" ? val.replace(/\r?\n\s*\r?\n/g, " ") : (val ? String(val) : "");
                        }).filter(Boolean);
        const allText = textLines.join("\n\n");
        onFileSelect(allText, filteredCsvFile, readMode, csvColumn);
      } else {
        onFileSelect(allContent, sharedFile, readMode, csvColumn);
      }
    } else {      
      if (sharedFile && sharedFile.name && sharedFile.name.endsWith(".csv")) {
        const parsed = Papa.parse(fileContent.trim(), { header: true, skipEmptyLines: true });
        const filteredData = parsed.data.filter(row => row[csvColumn] && row[csvColumn].trim() !== "");
        if (filteredData.length === 0) {
          onFileSelect("Không có dữ liệu trong cột đã chọn.", sharedFile, readMode, csvColumn);
          return;
        }
        const filteredContent = Papa.unparse(filteredData, { header: true });
        const filteredCsvFile = new File([filteredContent], sharedFile.name, { type: "text/csv" });

        const textLines = filteredData.map(row => row[csvColumn]).filter(Boolean);
        setLines(textLines);
        setSelectedLine(textLines[0] || "");
        onFileSelect(textLines[0] || "", filteredCsvFile, readMode, csvColumn);
      }
      else {
      setSelectedLine(lines[0] || "");
      onFileSelect(lines[0] || "", sharedFile, readMode, csvColumn);
    }
    }
    // eslint-disable-next-line
  }, [readMode, fileContent, csvColumn]);

  const loadFile = async (file) => {
    if (!file) return;

    resetUploadState();

    if (file.size > MAX_FILE_SIZE) {
      setUploadError(`File vượt quá ${LIMITS.MAX_FILE_SIZE_MB}MB. Vui lòng chọn file nhỏ hơn.`);
      return "";
    }
    setFileName(file.name);
    setSharedFile(file);
    const ext = file.name.split('.').pop().toLowerCase();

    if (ext === "txt") {
      const buffer = await readAsArrayBuffer(file);
      const utf8Text = decodeUtf8Text(buffer);
      if (utf8Text === null) {
        setUploadError("File TXT không đúng encoding UTF-8/UTF-8-SIG.");
        return;
      }

      setFileContent(utf8Text);
      setAllContent(utf8Text);
      const paras = parseParagraphs(utf8Text);
      const maxFoundLen = paras.reduce((maxLen, item) => Math.max(maxLen, item.length), 0);
      if (maxFoundLen > LIMITS.MAX_TEXT_LENGTH) {
        setUploadNotice(`Có đoạn dài hơn ${LIMITS.MAX_TEXT_LENGTH} ký tự và có thể bị backend từ chối.`);
      }
        setLines(paras);
        setCsvColumns([]);
        setCsvColumn("");
        setCsvPreviewTable([]);
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
      const buffer = await readAsArrayBuffer(file);
      const utf8Text = decodeUtf8Text(buffer);
      if (utf8Text === null) {
        setUploadError("File CSV không đúng encoding UTF-8/UTF-8-SIG.");
        return;
      }

      setFileContent(utf8Text);
      setAllContent(utf8Text);
      const parsed = Papa.parse(utf8Text.trim(), { skipEmptyLines: true });
      const rowCount = Math.max((parsed.data || []).length - 1, 0);

      if (rowCount > LIMITS.MAX_ROWS) {
        setUploadError(`File CSV có ${rowCount} dòng, vượt giới hạn ${LIMITS.MAX_ROWS} dòng.`);
        return;
      }

      setCsvPreviewTable((parsed.data || []).slice(0, 6));
      if (parsed.data.length > 0) {
        const headers = parsed.data[0];
        setCsvColumns(headers);
        setCsvColumn(headers[0]);
      }
      setUploadNotice(`Đã đọc ${rowCount} dòng dữ liệu.`);
    } else {
      setLines([]);
      setSelectedLine("");
      setFileContent("");
      setSharedFile(null);
      setAllContent("");
      setCsvColumns([]);
      setCsvColumn("");
      setCsvPreviewTable([]);
      setUploadError("Định dạng không hỗ trợ. Hãy dùng .txt, .docx, .csv");
      onFileSelect("Định dạng không hỗ trợ. Hãy dùng .txt, .docx, .csv");
    }
  }
  
  useEffect(() => {
    if (sharedFile && fileName === "") {
      loadFile(sharedFile);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sharedFile, fileName]);
  
  const handleChange = async (e) => {
    const file = e.target.files[0];
    loadFile(file);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setDragActive(false);
    if (!e.dataTransfer.files || !e.dataTransfer.files[0]) {
      return;
    }
    await loadFile(e.dataTransfer.files[0]);
  };

  const handleSelectLine = (e) => {
    setSelectedLine(e.target.value);
    onFileSelect(e.target.value, sharedFile, readMode);
  };
  const handleSelectCsvColumn = (e) => {
    setCsvColumn(e.target.value);

  };
  changeFile && setTimeout(() => {
    loadFile(sharedFile);
  }, 100);
  return (
    <div className="file-upload">
      <div className="file-limit-hint">
        <strong>Giới hạn hệ thống:</strong> tối đa {LIMITS.MAX_FILE_SIZE_MB}MB, {LIMITS.MAX_ROWS} dòng CSV, {LIMITS.MAX_TEXT_LENGTH} ký tự/đoạn, encoding {LIMITS.ENCODING}.
      </div>
      <input
        type="file"
        id="fileInput"
        accept=".txt,.docx,.csv"
        style={{ display: "none" }}
        onChange={handleChange}
      />
      <div
        className={`drop-zone ${dragActive ? "active" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragActive(false);
        }}
        onDrop={handleDrop}
      >
        <div style={{ marginBottom: 8, color: "#5a6", fontSize: 13 }}>
          Kéo & thả file vào đây hoặc dùng nút Chọn file
        </div>
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
                setSharedFile(null);
                setFileContent("");
                setAllContent("");
                setCsvColumns([]);
                setCsvColumn("");
                setCsvPreviewTable([]);
                resetUploadState();
                document.getElementById("fileInput").value = "";
                if (onFileSelect) onFileSelect("", null);
              }}
            >
              {fileName} X
            </button>
          </>
        )}
      </div>
      </div>

      {readProgress > 0 && readProgress < 100 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 12, color: "#555" }}>Đang đọc file: {readProgress}%</div>
          <div className="loading-bar-container" style={{ width: "100%" }}>
            <div className="loading-bar" style={{ transform: "none", animation: "none", width: `${readProgress}%` }} />
          </div>
        </div>
      )}

      {uploadError && (
        <div className="upload-alert error">{uploadError}</div>
      )}
      {uploadNotice && !uploadError && (
        <div className="upload-alert info">{uploadNotice}</div>
      )}
      {fileName && sharedFile && sharedFile.name.endsWith(".csv") && csvColumns.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <label>Chọn cột chứa văn bản cần xử lý:&nbsp;</label>
          <select
            value={csvColumn}
            onChange={handleSelectCsvColumn}
            style={{
              background: "var(--bg-surface)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-color)",
              borderRadius: 6,
              padding: "6px 8px",
            }}
          >
            {csvColumns.map((col, idx) => (
              <option key={col + idx} value={col}>{col}</option>
            ))}
          </select>
          <div style={{ marginTop: 10 }}>
            <strong>Xem trước file CSV:</strong>
            <div
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-color)",
                borderRadius: 8,
                padding: 8,
                fontFamily: "monospace",
                fontSize: 13,
                maxHeight: 220,
                overflow: "auto",
                marginBottom: 8,
                color: "var(--text-primary)",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  {csvPreviewTable.map((row, idx) => (
                    <tr
                      key={idx}
                      style={{
                        background: idx === 0 ? "var(--bg-soft)" : "transparent",
                        color: "var(--text-primary)",
                      }}
                    >
                      {row.map((cell, cidx) => (
                        <td
                          key={cidx}
                          style={{
                            border: "1px solid var(--border-color)",
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
