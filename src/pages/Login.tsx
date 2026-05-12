import { useState } from "react";
import api from "@/lib/api";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    riotId: "" // Chỉ dùng cho Đăng ký
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (isLogin) {
        // GỌI API ĐĂNG NHẬP
        const res = await api.post("/auth/login", {
          email: formData.email,
          password: formData.password
        });
        
        alert("✅ Đăng nhập thành công!");
        
        // Lưu thông tin vào LocalStorage để các trang khác biết ai đang đăng nhập
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        localStorage.setItem("role", res.data.user.role); // Player, Admin, Host...
        
        // Chuyển hướng về trang Dashboard
        window.location.href = "/"; 
      } else {
        // GỌI API ĐĂNG KÝ
        await api.post("/auth/register", {
          email: formData.email,
          riotId: formData.riotId,
          password: formData.password
        });
        
        alert("🎉 Đăng ký thành công! Vui lòng chờ Admin phê duyệt.");
        setIsLogin(true); // Tự động quay lại form đăng nhập
      }
    } catch (error: any) {
      if (error.response && error.response.data) {
        alert("❌ Lỗi: " + error.response.data.message);
      } else {
        alert("❌ Lỗi kết nối đến máy chủ C#!");
      }
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      {/* Background mờ ảo */}
      <div className="absolute inset-0 bg-[url('https://link-to-tft-background.jpg')] opacity-20 bg-cover bg-center" />
      
      <div className="relative z-10 w-full max-w-md bg-[#0f0606] border border-[#650000] rounded-xl shadow-[0_0_30px_rgba(101,0,0,0.5)] p-8">
        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#ffcc00] to-amber-600 mb-6 text-center uppercase tracking-widest drop-shadow-md">
          {isLogin ? "Đăng Nhập Giải Đấu" : "Đăng Ký Danh Tính"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-red-200 text-sm font-bold mb-1 uppercase tracking-wider">Riot ID (Kèm Tag)</label>
              <input 
                type="text" 
                name="riotId"
                placeholder="Ví dụ: Kudo#VN1"
                value={formData.riotId} 
                onChange={handleChange}
                required={!isLogin}
                className="w-full bg-[#200b0b] border border-[#490000] rounded px-4 py-2 text-[#ffcc00] outline-none focus:border-[#ffcc00] transition-colors"
              />
            </div>
          )}

          <div>
            <label className="block text-red-200 text-sm font-bold mb-1 uppercase tracking-wider">Email</label>
            <input 
              type="email" 
              name="email"
              placeholder="nhap-email@gmail.com"
              value={formData.email} 
              onChange={handleChange}
              required
              className="w-full bg-[#200b0b] border border-[#490000] rounded px-4 py-2 text-[#ffcc00] outline-none focus:border-[#ffcc00] transition-colors"
            />
          </div>

          <div>
            <label className="block text-red-200 text-sm font-bold mb-1 uppercase tracking-wider">Mật khẩu</label>
            <input 
              type="password" 
              name="password"
              placeholder="••••••••"
              value={formData.password} 
              onChange={handleChange}
              required
              className="w-full bg-[#200b0b] border border-[#490000] rounded px-4 py-2 text-[#ffcc00] outline-none focus:border-[#ffcc00] transition-colors"
            />
          </div>

          <button 
            type="submit" 
            className="w-full bg-[#650000] hover:bg-[#ffcc00] text-[#ffcc00] hover:text-[#650000] font-black py-3 rounded-md border-2 border-[#ffcc00]/50 shadow-[0_0_15px_rgba(101,0,0,0.8)] transition-all uppercase tracking-widest mt-6">
            {isLogin ? "Vào Sàn Đấu" : "Gửi Yêu Cầu Đăng Ký"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-400 text-sm">
            {isLogin ? "Chưa có danh tính?" : "Đã có thẻ căn cước?"}
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="ml-2 text-red-400 font-bold hover:text-[#ffcc00] transition-colors underline">
              {isLogin ? "Đăng ký ngay" : "Quay lại đăng nhập"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}