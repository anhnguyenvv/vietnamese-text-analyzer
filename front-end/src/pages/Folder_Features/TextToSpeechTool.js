import React, { useEffect, useState } from "react";
import axios from "axios";

import { API_BASE } from "../../config";
import { chunkTextForTts, normalizeVietnameseTtsText } from "../../utils/ttsTextProcessing";
import "./Features.css";


const TextToSpeechTool = ({ sharedTextInput, setSharedTextInput }) => {
  const [audioUrl, setAudioUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lang, setLang] = useState("vi");
  const [slow, setSlow] = useState(false);
  const [chunkCount, setChunkCount] = useState(0);

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const handleGenerateVoice = async () => {
    setError("");
    if (!sharedTextInput.trim()) {
      setError("Vui lòng nhập văn bản trước khi chuyển giọng nói.");
      return;
    }

    setLoading(true);
    try {
      const normalizedText = normalizeVietnameseTtsText(sharedTextInput);
      const chunks = chunkTextForTts(normalizedText);
      setChunkCount(chunks.length);

      if (chunks.length === 0) {
        setError("Không có nội dung hợp lệ sau khi xử lý văn bản.");
        setLoading(false);
        return;
      }

      const response = await axios.post(
        `${API_BASE}/api/tts/synthesize`,
        {
          text: sharedTextInput,
          chunks,
          lang,
          slow,
        },
        {
          responseType: "blob",
        }
      );

      const nextAudioUrl = URL.createObjectURL(response.data);
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      setAudioUrl(nextAudioUrl);
    } catch (err) {
      let apiMessage = "";
      if (err?.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          apiMessage = JSON.parse(text)?.error || "";
        } catch (_e) {
          apiMessage = "";
        }
      } else {
        apiMessage = err?.response?.data?.error || "";
      }

      setError(apiMessage || "Không thể tạo giọng nói. Vui lòng thử lại.");
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      setAudioUrl("");
      setChunkCount(0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tts-tool">
      <strong>Chuyển văn bản thành giọng nói</strong>

      <div className="text-area-container">
        <div className="input-area">
          <label>Văn bản</label>
          <textarea
            rows={10}
            placeholder="Nhập văn bản để chuyển thành giọng nói..."
            value={sharedTextInput}
            onChange={(event) => setSharedTextInput(event.target.value)}
          />

          <div className="tts-controls-row">
            <label className="tts-field-label">
              Ngôn ngữ:&nbsp;
              <select value={lang} onChange={(event) => setLang(event.target.value)}>
                <option value="vi">Tiếng Việt</option>
                <option value="en">Tiếng Anh</option>
              </select>
            </label>

            <label className="tts-switch-label">
              <input type="checkbox" checked={slow} onChange={(event) => setSlow(event.target.checked)} />
              Đọc chậm
            </label>
          </div>

          <div className="tts-action-row">
            <button className="analyze-button" onClick={handleGenerateVoice} disabled={loading}>
              Tạo giọng nói
            </button>
            {loading && (
              <div className="tts-loading-stack">
                <div className="tts-loading-label">
                  Đang tổng hợp giọng nói...
                </div>
                <div className="loading-bar-container">
                  <div className="loading-bar" />
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="upload-alert error tts-error">
              {error}
            </div>
          )}
          {!error && chunkCount > 0 && (
            <div className="upload-alert success">
              Đã chia thành {chunkCount} đoạn để tổng hợp giọng nói.
            </div>
          )}
        </div>

        <div className="result-area">
          <label>Kết quả âm thanh</label>
          {!audioUrl && !loading && <div className="result-box">Âm thanh sẽ xuất hiện tại đây sau khi tạo.</div>}
          {audioUrl && (
            <div className="result-box tts-audio-card">
              <audio controls src={audioUrl} />
              <a href={audioUrl} download="speech.wav" className="file-button tts-download-link">
                Tải file WAV
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


export default TextToSpeechTool;