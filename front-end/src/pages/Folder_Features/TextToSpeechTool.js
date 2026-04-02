import React, { useEffect, useState } from "react";
import axios from "axios";

import { API_BASE } from "../../config";
import "./Features.css";


const TextToSpeechTool = ({ sharedTextInput, setSharedTextInput }) => {
  const [audioUrl, setAudioUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lang, setLang] = useState("vi");
  const [slow, setSlow] = useState(false);

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
      const response = await axios.post(
        `${API_BASE}/api/tts/synthesize`,
        {
          text: sharedTextInput,
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
      const apiMessage = err?.response?.data?.error;
      setError(apiMessage || "Không thể tạo giọng nói. Vui lòng thử lại.");
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      setAudioUrl("");
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
        </div>

        <div className="result-area">
          <label>Kết quả âm thanh</label>
          {!audioUrl && !loading && <div className="result-box">Âm thanh sẽ xuất hiện tại đây sau khi tạo.</div>}
          {audioUrl && (
            <div className="result-box tts-audio-card">
              <audio controls src={audioUrl} />
              <a href={audioUrl} download="speech.mp3" className="file-button tts-download-link">
                Tải file MP3
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


export default TextToSpeechTool;