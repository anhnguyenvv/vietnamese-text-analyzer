// Địa chỉ API backend, có thể lấy từ biến môi trường hoặc sửa trực tiếp
const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

export default API_BASE;