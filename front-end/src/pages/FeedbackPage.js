import React, { useState } from "react";
import "./FeedbackPage.css";

const FeedbackPage = () => {
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: xử lý gửi dữ liệu
    alert("Cảm ơn bạn đã gửi phản hồi!");
    setMessage("");
    setEmail("");
  };

  return (
  <div className="feedback-wrapper">
    <div className="feedback-container">
      <h2 className="feedback-title">
        <span className="title">Báo lỗi hoặc góp ý</span>
      </h2>
      <p className="feedback-subtitle">
        Sự đóng góp ý kiến từ các bạn sẽ là sự hỗ trợ đắc lực giúp chúng tôi ngày càng tốt hơn.
      </p>

      <form onSubmit={handleSubmit} className="feedback-form">
        <textarea
          placeholder="Nhập phản hồi của bạn tại đây!"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
        />
        <input
          type="email"
          placeholder="Email của bạn"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button type="submit">Gửi ý kiến</button>
      </form>
    </div>
  </div>
);
};

export default FeedbackPage;
