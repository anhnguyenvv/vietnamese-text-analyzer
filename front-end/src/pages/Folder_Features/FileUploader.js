import React from "react";
import mammoth from "mammoth";

const FileUploader = ({ onFileSelect }) => {
  const [fileName, setFileName] = React.useState("");
  const [lines, setLines] = React.useState([]);
  const [selectedLine, setSelectedLine] = React.useState("");
  const [readMode, setReadMode] = React.useState("paragraph");
  const [fileObj, setFileObj] = React.useState(null);
  const [fileContent, setFileContent] = React.useState("");
  const [paragraphs, setParagraphs] = React.useState([]);
  const [allContent, setAllContent] = React.useState("");
  const [fileType, setFileType] = React.useState("");

  // Khi đổi chế độ đọc, cập nhật lines và selectedLine tương ứng
  React.useEffect(() => {
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
  }, [readMode]);

  const handleChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    setFileObj(file);

    const extension = file.name.split('.').pop().toLowerCase();
    setFileType(extension);

    if (extension === "txt") {
      const reader = new FileReader();
      reader.onload = () => {
        setFileContent(reader.result);
        setAllContent(reader.result);
        const splitParagraphs = reader.result.split(/\r?\n\s*\r?\n/).map(p => p.trim()).filter(p => p !== "");
        setParagraphs(splitParagraphs);
        if (readMode === "all") {
          setLines([reader.result]);
          setSelectedLine(reader.result);
          onFileSelect(reader.result, file);
        } else {
          setLines(splitParagraphs);
          setSelectedLine(splitParagraphs[0] || "");
          onFileSelect(splitParagraphs[0] || "", file);
        }
      };
      reader.readAsText(file);
    } else if (extension === "docx") {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      setFileContent(result.value);
      setAllContent(result.value);
      const splitParagraphs = result.value.split(/\r?\n\s*\r?\n/).map(p => p.trim()).filter(p => p !== "");
      setParagraphs(splitParagraphs);
      if (readMode === "all") {
        setLines([result.value]);
        setSelectedLine(result.value);
        onFileSelect(result.value, file);
      } else {
        setLines(splitParagraphs);
        setSelectedLine(splitParagraphs[0] || "");
        onFileSelect(splitParagraphs[0] || "", file);
      }
    } else if (extension === "csv") {
      const reader = new FileReader();
      reader.onload = () => {
        setFileContent(reader.result);
        setAllContent(reader.result);
        const content = reader.result;
        const allLines = content.split(/\r?\n/).filter(line => line.trim() !== "");
        const hasHeader = allLines.length > 1 && allLines[0].toLowerCase().includes("text");
        const splitLines = hasHeader ? allLines.slice(1) : allLines;
        setParagraphs(splitLines);
        if (readMode === "all") {
          setLines([content]);
          setSelectedLine(content);
          onFileSelect(content, file);
        } else {
          setLines(splitLines);
          setSelectedLine(splitLines[0] || "");
          onFileSelect(splitLines[0] || "", file);
        }
      };
      reader.readAsText(file);
    } else {
      setLines([]);
      setSelectedLine("");
      setFileContent("");
      setFileObj(null);
      setParagraphs([]);
      setAllContent("");
      setFileType("");
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