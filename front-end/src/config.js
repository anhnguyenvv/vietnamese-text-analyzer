// Địa chỉ API backend, tự động lấy theo domain khi build production
const API_BASE =
  process.env.REACT_APP_API_BASE ||
  (window.location.origin.includes("localhost")
    ? "http://localhost:5000"
    : window.location.origin);

export default API_BASE;