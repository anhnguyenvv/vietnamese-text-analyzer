import React, { useState, useEffect } from "react";
import mammoth from "mammoth";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const FileUploader = ({ onFileSelect }) => {
  const [fileName, setFileName] = useState("");
  const [lines, setLines] = useState([]);
  const [selectedLine, setSelectedLine] = useState("");
  const [readMode, setReadMode] = useState("paragraph");
  const [fileObj, setFileObj] = useState(null);
  const [fileContent, setFileContent] = useState("");
  const [paragraphs, setParagraphs] = useState([]);
  const [allContent, setAllContent] = useState("");

  useEffect(() => {
    if (!fileContent) return;
    if (readMode === "all") {
      setLines([allContent]);
      setSelectedLine(allContent);
      onFileSelect(allContent, fileObj);
    } else {
      setLines(paragraphs);
      setSelectedLine(paragraphs[0] || "");
      onFileSelect(paragraphs[0] || "", fileObj);
    }
    // eslint-disable-next-line
  }, [readMode, fileContent]);

  const handleChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      alert("Vui lòng chọn file nhỏ hơn 5MB.");
      e.target.value = "";
      return;
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
        setParagraphs(paras);
      };
      reader.readAsText(file);
    } else if (ext === "docx") {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      setFileContent(result.value);
      setAllContent(result.value);
      const paras = result.value.split(/\r?\n\s*\r?\n/).map(p => p.trim()).filter(p => p);
      setParagraphs(paras);
    } else if (ext === "csv") {
      const reader = new FileReader();
      reader.onload = () => {
        setFileContent(reader.result);
        setAllContent(reader.result);
        const allLines = reader.result.split(/\r?\n/).filter(line => line.trim());
        const hasHeader = allLines.length > 1 && allLines[0].toLowerCase().includes("text");
        const paras = hasHeader ? allLines.slice(1) : allLines;
        setParagraphs(paras);
      };
      reader.readAsText(file);
    } else {
      setLines([]);
      setSelectedLine("");
      setFileContent("");
      setFileObj(null);
      setParagraphs([]);
      setAllContent("");
      onFileSelect("Định dạng không hỗ trợ. Hãy dùng .txt, .docx, .csv");
    }
  };

  const handleSelectLine = (e) => {
    setSelectedLine(e.target.value);
    onFileSelect(e.target.value, fileObj);
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
          <span className="file-name">
            <strong>{fileName}</strong>
          </span>
        )}
      </div>

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

      {fileName && readMode === "paragraph" && lines.length > 0 && (
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
    </div>
  );
};

export default FileUploader;