import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import TournamentDashboard from './pages/TournamentDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Login from './pages/Login';
import penguIcon from './assets/pengu-yasuo.png';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [role, setRole] = useState("");

  // Hàm kiểm tra trong ví (localStorage) có thẻ chưa
  const checkAuth = () => {
    const token = localStorage.getItem("token");
    if (token) {
      setIsAuthenticated(true);
      setRole(localStorage.getItem("role") || "");
    } else {
      setIsAuthenticated(false);
    }
  };

  useEffect(() => {
    checkAuth(); // Vừa vào web là check thẻ ngay
  }, []);

  const handleLogout = () => {
    // Xóa sạch thông tin đăng nhập
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    // Chuyển hướng về trang đăng nhập
    window.location.href = "/login"; 
  };

  return (
    <Router>
      {/* HEADER: Hiện cho cả khách và thành viên */}
      <div className="bg-[#200b0b] border-b border-[#650000] p-3 flex justify-between items-center z-50 relative px-8">
        <div className="flex gap-8">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-full border-2 border-[#ffcc00] bg-[#200b0b] overflow-hidden shadow-[0_0_15px_rgba(255,204,0,0.6)] flex items-center justify-center shrink-0">
              <img 
                src={penguIcon}
                className="w-full h-full object-cover scale-110" 
                alt="Pengu Yasuo icon"
              />
            </div>
            <Link to="/" className="text-[#ffcc00] font-black hover:text-white transition-colors text-sm uppercase tracking-wider">
              TFT VN Region
            </Link>
          
            {isAuthenticated && role === 'Admin' && (
              <Link to="/admin" className="text-red-500 font-black hover:text-white transition-colors text-sm uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 bg-red-600 rounded-full animate-ping"></span>
                Phòng Trọng Tài
              </Link>
            )}
          </div>
        </div>

        <div className="text-white text-sm font-bold flex items-center gap-4">
          {isAuthenticated ? (
            <>
              <span>
                Tuyển thủ: {(() => {
                  try {
                    const userStr = localStorage.getItem("user");
                    if (!userStr) return "Ẩn danh";
                    const user = JSON.parse(userStr);
                    return user.riotId?.split('#')[0] || "Ẩn danh";
                  } catch {
                    return "Ẩn danh";
                  }
                })()} 
                <span className="text-red-400 text-xs ml-1">({role})</span>
              </span>
              <button 
                onClick={handleLogout} 
                className="bg-red-900 hover:bg-red-700 text-white px-4 py-1 rounded border border-red-500 font-bold text-sm uppercase tracking-widest transition-colors"
              >
                ĐĂNG XUẤT
              </button>
            </>
          ) : (
            <Link 
              to="/login" 
              className="bg-[#650000] hover:bg-[#ffcc00] text-[#ffcc00] hover:text-[#650000] px-6 py-1.5 rounded border border-[#ffcc00]/50 font-black text-sm uppercase tracking-widest transition-all shadow-[0_0_10px_rgba(101,0,0,0.5)]"
            >
              Đăng Nhập
            </Link>
          )}
        </div>
      </div>

      <Routes>
        {/* ĐÃ THÊM ROUTE CHO TRANG LOGIN VÀO ĐÂY */}
        <Route path="/login" element={<Login />} />
        
        {/* Các Route cũ giữ nguyên */}
        <Route path="/" element={<TournamentDashboard />} />
        <Route path="/admin" element={role === 'Admin' ? <AdminDashboard /> : <Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
