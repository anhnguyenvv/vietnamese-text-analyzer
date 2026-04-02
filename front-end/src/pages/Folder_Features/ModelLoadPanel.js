import React from "react";


const ModelLoadPanel = ({
  preloadState,
}) => {
  const progress = Math.max(0, Math.min(100, Number(preloadState.progress) || 0));
  const statusText = preloadState.message || "Sẵn sàng";

  return (
    <div className="model-load-inline">
      <span className="model-load-status-value">{statusText}</span>
      <span className="model-load-progress-info">{Math.round(progress)}%</span>
      <div className="model-load-track">
        <div
          className="model-load-fill"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};


export default ModelLoadPanel;