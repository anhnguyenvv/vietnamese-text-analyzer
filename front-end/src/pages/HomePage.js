import React from "react";
import { useNavigate } from "react-router-dom";
import "./HomePage.css";

const HomePage = () => {
  const navigate = useNavigate();

  const handleStart = () => {
    navigate("/tinh-nang");
  };

  return (
    <div className="homepage-container">
      <div className="intro">
        <h1>Xin chào! Mình là</h1>
        <h1 className="gradient-text">VTextTools</h1>
        <p>Giúp bạn xử lý văn bản tiếng Việt nhanh chóng và chính xác.</p>
        <button onClick={handleStart}>Bắt đầu ngay</button>
      </div>
    </div>
  );
};

export default HomePage;
