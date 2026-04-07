import React, { useEffect, useState } from "react";
import axios from "axios";

import { API_BASE } from "../../config";
import { chunkTextForTts, normalizeVietnameseTtsText } from "../../utils/ttsTextProcessing";
import "./Features.css";


const SPEED_MIN = 0.25;
const SPEED_MAX = 3;
const SPEED_STEP = 0.25;
const SPEED_MARKS = [0.25, 0.5, 0.75, 1, 2, 3];
const PARAGRAPH_BREAK_MARKER = "__TTS_PARAGRAPH_BREAK__";

const formatSpeedLabel = (value) => `${Number(value).toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1")}x`;
const speedToPercent = (value) => ((value - SPEED_MIN) / (SPEED_MAX - SPEED_MIN)) * 100;


const TextToSpeechTool = ({ sharedTextInput, setSharedTextInput }) => {
  const [audioUrl, setAudioUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [speed, setSpeed] = useState(1);
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
      const paragraphs = String(sharedTextInput || "")
        .replace(/\r\n?/g, "\n")
        .split(/\n+/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean);

      const chunks = [];
      for (const paragraph of paragraphs) {
        const normalizedParagraph = normalizeVietnameseTtsText(paragraph);
        if (!normalizedParagraph) {
          continue;
        }

        const paragraphChunks = chunkTextForTts(normalizedParagraph);
        if (paragraphChunks.length === 0) {
          continue;
        }

        if (chunks.length > 0) {
          chunks.push(PARAGRAPH_BREAK_MARKER);
        }
        chunks.push(...paragraphChunks);
      }

      const spokenChunkCount = chunks.filter((chunk) => chunk !== PARAGRAPH_BREAK_MARKER).length;
      setChunkCount(spokenChunkCount);

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
          speed,
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
            <div className="tts-speed-control">
              <label className="tts-speed-label" htmlFor="tts-speed-slider">
                Tốc độ đọc: <strong>{formatSpeedLabel(speed)}</strong>
              </label>
              <input
                id="tts-speed-slider"
                type="range"
                min={SPEED_MIN}
                max={SPEED_MAX}
                step={SPEED_STEP}
                value={speed}
                onChange={(event) => setSpeed(Number(event.target.value))}
              />
              <div className="tts-speed-marks" aria-hidden="true">
                {SPEED_MARKS.map((mark) => (
                  <span
                    key={mark}
                    className="tts-speed-mark"
                    style={{ left: `${speedToPercent(mark)}%` }}
                  >
                    {formatSpeedLabel(mark)}
                  </span>
                ))}
              </div>
            </div>
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