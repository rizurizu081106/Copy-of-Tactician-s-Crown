import axios from "axios";

// Tạo instance axios với cấu hình mặc định
const api = axios.create({
  baseURL: "http://localhost:5196/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor: Tự động gắn Token vào mỗi request nếu có trong localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor: Xử lý lỗi tập trung (ví dụ: Token hết hạn -> đá ra Login)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn("Phiên làm việc hết hạn hoặc không có quyền.");
      // Tùy chọn: localStorage.clear(); window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
