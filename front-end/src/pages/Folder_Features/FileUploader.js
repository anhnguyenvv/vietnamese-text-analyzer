import React from "react";
import mammoth from "mammoth";

const FileUploader = ({ onFileSelect }) => {
  const [fileName, setFileName] = React.useState("");
  const [lines, setLines] = React.useState([]);
  const [selectedLine, setSelectedLine] = React.useState("");
  const [readMode, setReadMode] = React.useState("paragraph"); // "paragraph" hoặc "all"

  const handleChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);

    const extension = file.name.split('.').pop().toLowerCase();

    const handleContent = (content) => {
      if (readMode === "all") {
        setLines([content]);
        setSelectedLine(content);
        onFileSelect(content);
      } else {
        // Chia theo đoạn văn (2 dòng trống trở lên)
        const splitParagraphs = content.split(/\r?\n\s*\r?\n/).map(p => p.trim()).filter(p => p !== "");
        setLines(splitParagraphs);
        setSelectedLine(splitParagraphs[0] || "");
        onFileSelect(splitParagraphs[0] || "");
      }
    };

    if (extension === "txt") {
      const reader = new FileReader();
      reader.onload = () => {
        handleContent(reader.result);
      };
      reader.readAsText(file);
    } else if (extension === "docx") {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      handleContent(result.value);
    } else if (extension === "csv") {
      const reader = new FileReader();
      reader.onload = () => {
        const content = reader.result;
        const allLines = content.split(/\r?\n/).filter(line => line.trim() !== "");
        const hasHeader = allLines.length > 1 && allLines[0].toLowerCase().includes("text");
        const splitLines = hasHeader ? allLines.slice(1) : allLines;
        setLines(splitLines);
        setSelectedLine(splitLines[0] || "");
        onFileSelect(splitLines[0] || "");
      };
      reader.readAsText(file);
    } else {
      setLines([]);
      setSelectedLine("");
      onFileSelect("Định dạng không hỗ trợ. Hãy dùng .txt, .docx, .csv");
    }
  };

  const handleSelectLine = (e) => {
    setSelectedLine(e.target.value);
    onFileSelect(e.target.value);
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
          <span className="file-name" >
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

      {/* Chỉ hiển thị nếu chọn đọc theo đoạn */}
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