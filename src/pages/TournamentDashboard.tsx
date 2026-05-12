import { useEffect, useState } from "react";
import api from "@/lib/api";
import axios from "axios";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HubConnectionBuilder } from "@microsoft/signalr";

export default function TournamentDashboard() {
  const [realLobby, setRealLobby] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [standings, setStandings] = useState<any[]>([]);
  const [playerRanks, setPlayerRanks] = useState<Record<number, number>>({});
  const currentUserRole = localStorage.getItem("role");
  const [allLobbies, setAllLobbies] = useState<any[]>([]); 
  const userData = JSON.parse(localStorage.getItem("user") || "{}");
  const currentUserId = userData.id;
  const [champion, setChampion] = useState<any>(null);
  const [historyTournaments, setHistoryTournaments] = useState<any[]>([]);
  const [selectedHistoryTour, setSelectedHistoryTour] = useState<any>(null);
  const [historyBrackets, setHistoryBrackets] = useState<any[]>([]);
  const [isLiveUpdating, setIsLiveUpdating] = useState(false);
  
  const handleRankChange = (accountId: number, rank: string) => {
    setPlayerRanks(prev => ({
      ...prev,
      [accountId]: parseInt(rank)
    }));
  };

  const fetchHistory = async () => {
    try {
      const res = await api.get("/Tournaments/history");
      setHistoryTournaments(res.data);
    } catch (error) {
      console.error("Lỗi khi lấy lịch sử:", error);
    }
  };

  const fetchData = () => {
    const userJson = localStorage.getItem("user");
    const userId = userJson ? JSON.parse(userJson).id : null;
    
    // 1. Quét xem có giải đấu nào đang Active không
    api.get("/Tournaments/active")
      .then(res => {
        const activeTour = res.data;
        
        if (!activeTour) {
          setStandings([]);
          setAllLobbies([]);
          setRealLobby(null);
          setIsLoading(false);
          return;
        }

        api.get(`/Tournaments/${activeTour.id}/standings`).then(s => setStandings(s.data));
        api.get("/MatchLobbies/brackets").then(b => setAllLobbies(b.data));
        
        if (userId) {
          api.get(`/MatchLobbies/my-lobby/${userId}`)
            .then(myLobby => setRealLobby(myLobby.data))
            .catch(() => setRealLobby(null));
        }
        setIsLoading(false);
      })
      .catch(err => {
        console.error(err);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchData(); 

    const connection = new HubConnectionBuilder()
      .withUrl("http://localhost:5196/matchHub")
      .withAutomaticReconnect()
      .build();

    connection.start()
      .then(() => console.log("📺 Tuyển thủ: Đã bắt được sóng giải đấu!"))
      .catch(err => console.error("Lỗi sóng:", err));

    connection.on("LeaderboardUpdated", () => {
      console.log("🔥 ĐIỂM SỐ VỪA THAY ĐỔI, CẬP NHẬT NGAY!");
      setIsLiveUpdating(true);
      fetchData(); 
      setTimeout(() => setIsLiveUpdating(false), 3000); // Hiệu ứng kéo dài 3s
    });
    
    connection.on("TournamentEnded", (winnerData) => {
      console.log("🏆 CÓ NHÀ VÔ ĐỊCH:", winnerData);
      setChampion(winnerData);
      fetchData(); 
    });

    return () => { connection.stop(); };
  }, []);

  // HÀM MỚI: Tự động xếp điểm để Demo cho lẹ
  const handleDemoRandomRanks = () => {
    if (!realLobby?.players) return;
    const shuffledRanks = [1, 2, 3, 4, 5, 6, 7, 8].sort(() => Math.random() - 0.5);
    const newRanks: Record<number, number> = {};
    realLobby.players.forEach((p: any, index: number) => {
      newRanks[p.id] = shuffledRanks[index];
    });
    setPlayerRanks(newRanks);
  };

  const handleConfirmResults = () => {
    if (Object.keys(playerRanks).length < 8) {
      alert("⚠️ Lỗi: Bạn phải nhập đủ thứ hạng cho cả 8 tuyển thủ!");
      return;
    }

    const ranksArray = Object.values(playerRanks);
    const uniqueRanks = new Set(ranksArray);
    if (uniqueRanks.size !== ranksArray.length) {
      alert("❌ Lỗi: Xếp hạng bị trùng lặp! Mỗi tuyển thủ phải có một vị trí Top riêng biệt (Từ 1 đến 8).");
      return;
    }

    const submittedResults = Object.entries(playerRanks).map(([id, rank]) => ({
      accountId: parseInt(id),
      rank: Number(rank)
    }));

    api.post(`/MatchLobbies/${realLobby.id}/submit-results`, submittedResults)
      .then(() => {
        alert("✅ Đã chốt điểm thành công!");
        setPlayerRanks({}); 
        fetchData(); 
      })
      .catch(() => alert("❌ Có lỗi xảy ra khi nộp điểm!"));
  };

  return (
    <div className="min-h-screen bg-black text-red-50 pb-12 relative">
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;700;900&display=swap');
          * { font-family: 'Montserrat', sans-serif !important; }
        `}
      </style>

      {/* HERO BANNER */}
      <div className="relative w-full h-64 bg-gradient-to-r from-[#0f0606] via-[#490000] to-[#0f0606] border-b border-[#650000] flex items-center justify-center overflow-hidden shadow-[0_4px_20px_rgba(47,0,0,0.5)]">
        <div className="absolute inset-0 bg-[url('https://link-to-tft-background.jpg')] opacity-10 bg-cover bg-center mix-blend-overlay" />
        <div className="relative z-10 text-center space-y-4">
          <Badge className="bg-[#650000] text-[#ffcc00] px-3 py-1 text-xs tracking-widest uppercase border border-[#ffcc00]/30 shadow-[0_0_10px_rgba(101,0,0,0.8)]">
            Giải Đấu Cộng Đồng Việt Nam • 2026
          </Badge>
          <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#ffcc00] to-amber-600 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
            Copy of TACTICIAN'S CROWN
          </h1>
          <p className="text-red-200 text-sm tracking-wider uppercase font-bold">
            Giải đấu TFT khu vực VN theo thể thức TACTICIAN'S CROWN
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 relative">
        <Tabs 
          defaultValue="overview" 
          className="w-full" 
          onValueChange={(value) => {
            // Khi người dùng click chuyển tab
            if (value === "history") {
              fetchHistory(); // Gọi hàm lấy dữ liệu từ C#
            }
          }}
        >
          
          <TabsList className="grid w-full grid-cols-5 bg-[#200b0b] border border-[#490000] rounded-lg p-1 mb-8 shadow-lg h-auto">
            <TabsTrigger value="overview" className="text-red-400 data-[state=active]:bg-[#650000] data-[state=active]:text-[#ffcc00] font-bold transition-all">TỔNG QUAN</TabsTrigger>
            <TabsTrigger value="brackets" className="text-red-400 data-[state=active]:bg-[#650000] data-[state=active]:text-[#ffcc00] font-bold transition-all">CHIA BẢNG</TabsTrigger>
            <TabsTrigger value="standings" className="text-red-400 data-[state=active]:bg-[#650000] data-[state=active]:text-[#ffcc00] font-bold transition-all">BẢNG XẾP HẠNG</TabsTrigger>
            <TabsTrigger value="matches" className="text-red-400 data-[state=active]:bg-[#650000] data-[state=active]:text-[#ffcc00] font-bold transition-all">PHÒNG ĐẤU</TabsTrigger>
            <TabsTrigger value="history" className="text-red-400 data-[state=active]:bg-[#650000] data-[state=active]:text-[#ffcc00] font-bold transition-all">LỊCH SỬ</TabsTrigger>
          </TabsList>

          {/* TAB 1: BẢNG XẾP HẠNG LEO RANK */}
          <TabsContent value="standings">
            <Card className="bg-[#200b0b] border-[#490000] shadow-[0_0_20px_rgba(0,0,0,0.5)]">
              <CardHeader className="border-b border-[#2f0000] pb-4">
                <CardTitle className="text-2xl text-red-100 flex items-center justify-between">
                  <span className="font-black tracking-wide text-[#ffcc00]">Bảng Xếp Hạng</span>
                  <span className="text-sm font-bold text-red-500 flex items-center gap-2 uppercase tracking-widest">
                    Trực tiếp <span className="inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  {standings.length === 0 ? (
                    <div className="text-center text-red-400 py-10 font-bold">Bảng xếp hạng đang trống. Chờ Admin phê duyệt ván đấu đầu tiên!</div>
                  ) : (
                    standings.map((player, index) => {
                      const displayName = player?.riotId ? player.riotId.split('#')[0] : "Trống";
                      
                      let rankStyle = "text-[#650000]"; 
                      let borderStyle = "border-[#490000] bg-[#0f0606]";
                      let badgeStyle = "bg-[#200b0b] text-gray-400 border border-[#490000]";

                      if (index === 0) { 
                        rankStyle = "text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]";
                        borderStyle = "border-yellow-500 bg-yellow-900/20 shadow-[0_0_20px_rgba(234,179,8,0.3)]";
                        badgeStyle = "bg-yellow-600 text-black font-black border-yellow-400";
                      } else if (index === 1) { 
                        rankStyle = "text-gray-300 drop-shadow-[0_0_8px_rgba(209,213,219,0.8)]";
                        borderStyle = "border-gray-400 bg-gray-900/40 shadow-[0_0_15px_rgba(156,163,175,0.2)]";
                        badgeStyle = "bg-gray-400 text-black font-black border-gray-300";
                      } else if (index === 2) { 
                        rankStyle = "text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]";
                        borderStyle = "border-orange-700 bg-orange-950/40 shadow-[0_0_15px_rgba(194,65,12,0.2)]";
                        badgeStyle = "bg-orange-600 text-white font-black border-orange-500";
                      }

                      return (
                        <div key={player.id} className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-500 ${isLiveUpdating ? "border-yellow-400 shadow-[0_0_20px_rgba(255,204,0,0.5)] scale-[1.02]" : ""} ${player.isCheckmate ? "border-[#ffcc00] bg-[#490000]/40 shadow-[0_0_25px_rgba(255,204,0,0.4)] animate-[pulse_2s_ease-in-out_infinite]" : borderStyle}`}>
                          <div className="flex items-center gap-4">
                            <div className={`text-3xl font-black w-10 text-center ${rankStyle}`}>{index + 1}</div>
                            <div className="flex flex-col gap-1">
                              <span className={`text-xl font-black ${index < 3 ? "text-white" : "text-red-100"}`}>{displayName}</span>
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] px-2 py-0.5 rounded uppercase tracking-wider ${badgeStyle}`}>
                                  {player.stage}
                                </span>
                                {player.top1Count > 0 && (
                                  <span className="text-[10px] bg-yellow-900/40 text-yellow-400 border border-yellow-700 px-2 py-0.5 rounded flex items-center gap-1 font-black">
                                    👑 {player.top1Count}
                                  </span>
                                )}
                                <span className="text-[10px] text-gray-500 font-bold">
                                  AVG: {player.avgRank?.toFixed(1)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className={`text-3xl font-black ${index === 0 ? "text-yellow-400" : index === 1 ? "text-gray-300" : index === 2 ? "text-orange-400" : "text-red-400"}`}>
                            {player.points || 0} <span className="text-sm font-bold opacity-70">pts</span>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: PHÒNG ĐẤU */}
          <TabsContent value="matches">
            {currentUserRole === "Admin" ? (
              // NẾU LÀ ADMIN -> HIỆN BIỂN CẤM
              <Card className="bg-[#0f0606] border-red-900 shadow-[0_0_20px_rgba(255,0,0,0.2)]">
                <CardContent className="py-20 text-center space-y-4">
                  <div className="text-6xl animate-pulse drop-shadow-[0_0_15px_rgba(255,0,0,0.8)]">🛡️</div>
                  <h3 className="text-3xl font-black text-red-500 uppercase tracking-widest drop-shadow-md">Khu Vực Cấm</h3>
                  <p className="text-gray-400 font-medium text-lg">Bạn đang đăng nhập bằng tài khoản Quản trị viên (Admin).<br/>Admin không tham gia thi đấu, vui lòng sang trang <strong className="text-red-400">Admin Control Center</strong> để quản lý giải!</p>
                </CardContent>
              </Card>
            ) : (
              // NẾU LÀ PLAYER -> HIỆN PHÒNG ĐẤU BÌNH THƯỜNG (Đây là toàn bộ code cũ của bạn)
              <Card className="bg-[#200b0b] border-[#490000]">
                <CardHeader className="border-b border-[#490000] pb-4">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-2xl text-[#ffcc00] font-black uppercase flex items-center gap-3">
                      {isLoading 
                        ? "Đang tải dữ liệu..." 
                        : realLobby 
                          ? `${realLobby.lobbyName} - VÁN ${realLobby.roundNumber || 1}` 
                          : "PHÒNG ĐẤU CHUNG KẾT"}
                    </CardTitle>
                    {realLobby?.status === "Disputed" ? (
                      <Badge className="bg-red-600 text-white animate-pulse">ĐÓNG BĂNG - CÓ TRANH CHẤP</Badge>
                    ) : realLobby?.status === "PendingAdminApproval" ? (
                      <Badge className="bg-yellow-600 text-black font-bold uppercase tracking-wider">CHỜ ADMIN DUYỆT</Badge>
                    ) : (
                      <Badge className="bg-[#2f0000] text-green-400 uppercase tracking-wider font-bold">Đang thi đấu</Badge>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="pt-6">
                  {(() => {
                    const isApproved = String(userData.isApproved).toLowerCase() === "true" || userData.isApproved === true;
                    const isHost = realLobby && realLobby.hostId === currentUserId;
                    const canSubmit = isHost; // ĐÃ XÓA QUYỀN CỦA ADMIN Ở ĐÂY
                    const isPlayerInLobby = realLobby?.players?.some((p: any) => p.id === currentUserId);
                    const isPendingAdmin = realLobby?.status === "PendingAdminApproval";

                    const handleUploadEvidence = async (e: any) => {
                      const file = e.target.files[0];
                      if (!file) return;
      
                      alert("⏳ Đang đẩy ảnh lên máy chủ, chờ vài giây nhé...");
                    
                      // CLOUDINARY UPLOAD CONFIG
                      const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
                      const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

                      if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
                        alert("❌ Thiếu cấu hình Cloudinary. Vui lòng set VITE_CLOUDINARY_CLOUD_NAME và VITE_CLOUDINARY_UPLOAD_PRESET.");
                        return;
                      }
                    
                      const formData = new FormData();
                      formData.append("file", file);
                      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
                    
                      try {
                        const cloudinaryRes = await axios.post(
                          `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
                          formData
                        );
                        const realImageUrl = cloudinaryRes.data.secure_url;
        
                        await api.post(`/MatchLobbies/${realLobby.id}/upload-evidence`, {
                          accountId: currentUserId,
                          imageUrl: realImageUrl
                        });
        
                        alert("📸 Tuyệt vời! Bằng chứng đã được nộp lên Cloudinary.");
                        fetchData(); 
        
                      } catch (error) {
                        console.error(error);
                        alert("❌ Lỗi up ảnh! Kiểm tra lại mạng hoặc API Key nhé.");
                      }
                    };

                    return (
                      <>
                        {/* KHU VỰC THÔNG BÁO CHO NGƯỜI CHỈ XEM */}
                        {!canSubmit && !isPendingAdmin && (
                          <div className="bg-[#0a1a0a] border border-green-900/50 rounded-xl p-4 mb-8 text-center">
                            <h3 className="text-lg font-black text-green-500 uppercase tracking-widest animate-pulse">
                              {isApproved ? "ĐANG THEO DÕI TRỰC TIẾP" : "CHỜ ADMIN DUYỆT TÀI KHOẢN"}
                            </h3>
                          </div>
                        )}

                        {/* HIỂN THỊ KẾT QUẢ ĐANG CHỜ DUYỆT */}
                        {isPendingAdmin && (
                          <div className="bg-yellow-900/30 border border-yellow-600 rounded-xl p-6 mb-8 text-center shadow-[0_0_20px_rgba(202,138,4,0.2)]">
                            <h3 className="text-xl font-black text-[#ffcc00] uppercase tracking-widest animate-pulse mb-2">⏳ KẾT QUẢ ĐANG CHỜ ADMIN PHÊ DUYỆT</h3>
                            <p className="text-yellow-200/70 text-sm">Trọng tài đã chốt danh sách. Bạn có thể xem bảng điểm bên dưới, nếu có sai sót hãy nhờ Host bấm "Báo cáo sai lệch".</p>
                          </div>
                        )}

                        {/* DANH SÁCH 8 TUYỂN THỦ TRONG PHÒNG */}
                        <div className="mb-8">
                          <h3 className="text-xl font-black text-[#ffcc00] uppercase mb-4 border-b border-[#490000] pb-2">Đội Hình Tham Chiến</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {realLobby?.players ? realLobby.players.map((p: any) => {
                              const rawId = p?.riotId || p?.RiotId || "Trống";
                              const displayName = rawId !== "Trống" ? rawId.split('#')[0] : "Trống";
                              const isMe = p.id === currentUserId;

                              return (
                                <div key={p.id} className="flex justify-between items-center bg-[#0f0606] p-3 rounded-lg border border-[#490000]">
                                  <div className="flex flex-col">
                                    <div className="flex items-center gap-3">
                                      <span className={`font-bold text-lg ${isMe ? "text-[#ffcc00]" : "text-red-100"}`}>
                                        {displayName} {isMe && <span className="text-xs text-gray-400 italic">(Bạn)</span>}
                                      </span>
                                      {p.id === realLobby.hostId && (
                                        <Badge className="bg-yellow-600 hover:bg-yellow-500 text-black font-black px-2 py-0 text-[10px]">👑 HOST</Badge>
                                      )}
                                    </div>
                                    
                                    {p.evidenceUrl ? (
                                      <a href={p.evidenceUrl} target="_blank" className="text-xs text-blue-400 hover:text-blue-300 underline mt-1">👁️ Xem bằng chứng</a>
                                    ) : (
                                      <span className="text-[10px] text-gray-600 italic mt-1">Chưa nộp ảnh</span>
                                    )}
                                  </div>

                                  {isPendingAdmin ? (
                                    <div className="bg-[#200b0b] px-4 py-1.5 rounded border border-[#ffcc00] text-[#ffcc00] font-black text-lg">Top {p.rank || "?"}</div>
                                  ) : canSubmit ? (
                                    <select 
                                      value={playerRanks[p.id] || ""} 
                                      onChange={(e) => handleRankChange(p.id, e.target.value)}
                                      className="bg-[#200b0b] text-[#ffcc00] border border-[#650000] p-1.5 rounded text-sm font-bold outline-none cursor-pointer"
                                    >
                                      <option value="" disabled>Chọn Top</option>
                                      {[1, 2, 3, 4, 5, 6, 7, 8].map(num => <option key={num} value={num}>Top {num}</option>)}
                                    </select>
                                  ) : (
                                    <span className="text-gray-500 text-sm font-semibold italic">Đang thi đấu...</span>
                                  )}
                                </div>
                              )
                            }) : <div className="col-span-2 text-center text-gray-500">Chưa có tuyển thủ nào trong phòng này.</div>}
                          </div>
                        </div>

                        {/* KHU VỰC NỘP BẰNG CHỨNG CỦA PLAYER */}
                        {isPlayerInLobby && !isPendingAdmin && (
                          <div className="bg-[#1a1111] border border-[#650000] rounded-xl p-6 mb-8 flex flex-col items-center justify-center text-center shadow-[0_0_15px_rgba(47,0,0,0.5)]">
                            <h4 className="text-red-300 font-bold mb-2 uppercase tracking-wide">📸 Nộp ảnh kết quả ván đấu (Bắt buộc)</h4>
                            <input 
                              type="file" 
                              accept="image/*"
                              onChange={handleUploadEvidence}
                              className="text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-bold file:bg-[#490000] file:text-red-100 hover:file:bg-[#650000] cursor-pointer" 
                            />
                          </div>
                        )}

                        {/* NÚT CHỐT KẾT QUẢ CỦA HOST */}
                        {canSubmit && !isPendingAdmin && (
                          <div className="bg-[#0f0606] border border-[#ffcc00]/30 rounded-xl p-6 text-center space-y-4">
                            <h3 className="text-xl font-black text-[#ffcc00] uppercase">Thẩm định & Chốt kết quả</h3>
                            <div className="flex justify-center gap-4 pt-2">
                              <button onClick={handleDemoRandomRanks} className="px-4 py-2.5 rounded-md font-bold text-xs bg-purple-900 text-purple-300 border border-purple-500 hover:bg-purple-800 transition">
                                🎲 Auto Điền Top
                              </button>
                              <button onClick={handleConfirmResults} className="px-6 py-2.5 rounded-md font-black text-sm bg-[#650000] text-[#ffcc00] border-2 border-[#ffcc00]/50 hover:bg-[#800000] uppercase">
                                Gửi điểm lên Admin
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* TAB 3: TỔNG QUAN GIẢI ĐẤU (Giữ nguyên) */}
          <TabsContent value="overview">
            <div className="text-red-100 p-8 bg-[#0f0606] rounded-lg border border-[#490000] font-sans leading-relaxed shadow-[0_0_20px_rgba(47,0,0,0.8)] h-[800px] overflow-y-auto custom-scrollbar">
              <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#ffcc00] to-amber-600 mb-8 text-center uppercase tracking-widest drop-shadow-md">
                Luật Đấu Giải CTC 
              </h2>

              <div className="space-y-10">
                <section>
                  <h3 className="text-xl font-black text-[#ffcc00] border-b-2 border-[#490000] pb-2 mb-5 uppercase flex items-center gap-2">
                     1. Lộ trình giải đấu (Roadmap)
                  </h3>
                  <div className="space-y-4 text-sm font-medium pl-2">
                    <div className="bg-[#200b0b] p-4 rounded border border-[#2f0000]">
                      <h4 className="text-red-300 font-bold text-base mb-2">Ngày 1 - Vòng Loại (40 Tuyển thủ)</h4>
                      <p>Chia làm 5 Lobbies. Thi đấu <strong className="text-[#ffcc00]">6 ván</strong> (xáo trộn Lobby sau mỗi 2 ván). <strong className="text-green-400">Top 16</strong> tuyển thủ có tổng điểm cao nhất sẽ bước tiếp vào Ngày 2.</p>
                    </div>
                    <div className="bg-[#200b0b] p-4 rounded border border-[#2f0000]">
                      <h4 className="text-red-300 font-bold text-base mb-2">Ngày 2 - Vòng Bán Kết (16 Tuyển thủ)</h4>
                      <p className="mb-2 italic text-gray-400">Điểm số từ Ngày 1 sẽ được reset về 0.</p>
                      <ul className="list-disc list-inside space-y-2 ml-2">
                        <li><strong className="text-[#ffcc00]">Giai đoạn 1:</strong> 16 người thi đấu <strong className="text-[#ffcc00]">4 ván</strong>. Sau 4 ván, <strong className="text-green-400">Top 4</strong> cao điểm nhất vào thẳng Chung Kết. Top 13-16 bị loại trực tiếp.</li>
                        <li><strong className="text-[#ffcc00]">Giai đoạn 2 (Vòng Vớt - Last Chance):</strong> 8 người còn lại (từ Top 5 đến Top 12) sẽ <strong className="text-red-400">reset điểm về 0</strong> và thi đấu sinh tử <strong className="text-[#ffcc00]">2 ván</strong>. <strong className="text-green-400">Top 4</strong> cao điểm nhất sẽ giành 4 chiếc vé cuối cùng vào Chung Kết.</li>
                      </ul>
                    </div>
                    <div className="bg-[#200b0b] p-4 rounded border border-[#2f0000]">
                      <h4 className="text-red-300 font-bold text-base mb-2">Ngày 3 - Chung Kết (Top 8)</h4>
                      <p>Top 8 thi đấu theo thể thức <strong className="text-[#ffcc00] uppercase tracking-wider">Checkmate (Ngưỡng 20 điểm)</strong> để tìm ra Nhà Vô Địch.</p>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-xl font-black text-[#ffcc00] border-b-2 border-[#490000] pb-2 mb-5 uppercase flex items-center gap-2">
                    2. Thể thức Checkmate (Chung Kết)
                  </h3>
                  <p className="text-sm mb-4 pl-2">Giải đấu không có số ván cố định. Trận chung kết sẽ kết thúc ngay lập tức khi có một tuyển thủ thỏa mãn đồng thời 2 điều kiện sau:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-2 text-sm">
                    <div className="bg-[#0a1a0a] border border-green-900/50 rounded p-4">
                      <div className="text-[#ffcc00] font-black mb-1">ĐIỀU KIỆN 1 (BÁO ĐỘNG)</div>
                      Tích lũy được <strong className="text-[#ffcc00]">tổng điểm ≥ 20</strong>. Lúc này, tuyển thủ sẽ bước vào trạng thái "Checkmate".
                    </div>
                    <div className="bg-[#1a0a0a] border border-red-900/50 rounded p-4">
                      <div className="text-green-400 font-black mb-1">ĐIỀU KIỆN 2 (CHỐT HẠ)</div>
                      Sau khi đã đạt Checkmate, phải giành được <strong className="text-[#ffcc00]">Top 1</strong> trong một ván đấu bất kỳ tiếp theo.
                    </div>
                  </div>
                  <p className="text-gray-500 text-xs italic mt-3 pl-2">*Lưu ý: Việc đạt đủ 20 điểm bằng vị trí Top 1 ở ván hiện tại không giúp vô địch ngay. Trạng thái Checkmate chỉ có tác dụng từ ván sau.</p>
                </section>

                <section>
                  <h3 className="text-xl font-black text-[#ffcc00] border-b-2 border-[#490000] pb-2 mb-5 uppercase flex items-center gap-2">
                    3. Hệ thống điểm & Phân định thứ hạng
                  </h3>
                  <div className="pl-2">
                    <div className="grid grid-cols-4 md:grid-cols-8 gap-2 text-center text-sm font-bold mb-6">
                      <div className="bg-[#200b0b] border border-[#650000] rounded py-2"><span className="text-[#ffcc00]">Top 1</span><br/>8 Đ</div>
                      <div className="bg-[#200b0b] border border-[#650000] rounded py-2"><span className="text-gray-300">Top 2</span><br/>7 Đ</div>
                      <div className="bg-[#200b0b] border border-[#650000] rounded py-2"><span className="text-orange-400">Top 3</span><br/>6 Đ</div>
                      <div className="bg-[#200b0b] border border-[#650000] rounded py-2"><span className="text-red-300">Top 4</span><br/>5 Đ</div>
                      <div className="bg-[#0f0606] border border-[#2f0000] rounded py-2 text-gray-400">Top 5<br/>4 Đ</div>
                      <div className="bg-[#0f0606] border border-[#2f0000] rounded py-2 text-gray-400">Top 6<br/>3 Đ</div>
                      <div className="bg-[#0f0606] border border-[#2f0000] rounded py-2 text-gray-400">Top 7<br/>2 Đ</div>
                      <div className="bg-[#0f0606] border border-[#2f0000] rounded py-2 text-gray-500">Top 8<br/>1 Đ</div>
                    </div>
                    
                    <h4 className="text-red-300 font-bold text-sm mb-2 uppercase">Tiêu chí phân định (Tie-breakers):</h4>
                    <p className="text-sm text-gray-300 mb-2">Nếu bằng điểm, thứ hạng sẽ được xét ưu tiên theo:</p>
                    <div className="flex gap-4 text-sm font-medium">
                      <span className="bg-[#200b0b] px-3 py-1 rounded border border-[#490000]"><strong className="text-red-400">#1:</strong> Điểm số</span>
                      <span className="bg-[#200b0b] px-3 py-1 rounded border border-[#490000]"><strong className="text-red-400">#2:</strong> Số lần Top 1</span>
                      <span className="bg-[#200b0b] px-3 py-1 rounded border border-[#490000]"><strong className="text-red-400">#3:</strong> Avg Rank (Thấp hơn là tốt hơn)</span>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-xl font-black text-[#ffcc00] border-b-2 border-[#490000] pb-2 mb-5 uppercase flex items-center gap-2">
                    4. Luật công bằng (Fair Play)
                  </h3>
                  <ul className="list-disc list-inside space-y-3 text-sm font-medium pl-2 text-gray-300">
                    <li><strong className="text-red-400">Cấm gian lận:</strong> Mọi hành vi Wintrading (bơm đồ, cố tình thua), đánh hộ, hoặc lợi dụng Bug game sẽ dẫn đến việc <span className="text-red-500 font-bold uppercase">Bị loại ngay lập tức</span> và cấm thi đấu vĩnh viễn khỏi các giải của ban tổ chức.</li>
                    <li><strong className="text-red-400">Sự cố kỹ thuật (Disconnect/Lag):</strong> Nếu một cá nhân bị mất kết nối mạng hoặc crash game, trận đấu vẫn sẽ tiếp tục. Không có Remake (đấu lại) trừ khi máy chủ Riot Games sập toàn bộ. Vui lòng tự đảm bảo đường truyền ổn định.</li>
                    <li><strong className="text-red-400">Hành vi ứng xử:</strong> Bắt buộc tôn trọng Trọng tài (Host) và các đối thủ. Cấm các hành vi Toxic, chat khiêu khích vô văn hóa trong game và trên các kênh truyền thông của giải.</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-xl font-black text-[#ffcc00] border-b-2 border-[#490000] pb-2 mb-5 uppercase flex items-center gap-2">
                    5. Hướng dẫn sử dụng hệ thống
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-2 text-sm">
                    <div className="bg-[#0f0606] p-5 rounded-lg border border-[#2f0000] relative">
                      <div className="absolute top-0 right-0 bg-[#2f0000] text-gray-300 px-3 py-1 rounded-bl-lg font-bold text-xs uppercase">Dành cho Tuyển Thủ</div>
                      <ul className="list-decimal list-inside space-y-2 mt-2 text-gray-300">
                        <li>Sử dụng tài khoản BTC cung cấp để <strong className="text-white">Đăng nhập</strong>.</li>
                        <li>Tab <strong className="text-[#ffcc00]">BẢNG XẾP HẠNG</strong> sẽ tự động cập nhật Real-time ngay khi Host chốt điểm. Bạn không cần làm mới trang (F5).</li>
                        <li>Bạn không có quyền nhập điểm, chỉ có quyền theo dõi và tra cứu.</li>
                        <li>Nếu phát hiện sai sót điểm số, phải báo ngay cho BTC/Host chậm nhất 5 phút sau khi ván đấu kết thúc.</li>
                      </ul>
                    </div>

                    <div className="bg-[#200b0b] p-5 rounded-lg border border-[#650000] relative shadow-[0_0_15px_rgba(101,0,0,0.2)]">
                      <div className="absolute top-0 right-0 bg-[#650000] text-[#ffcc00] px-3 py-1 rounded-bl-lg font-bold text-xs uppercase">Dành cho Host (Trọng tài)</div>
                      <ul className="list-decimal list-inside space-y-2 mt-2 text-red-100">
                        <li>Phải chụp ảnh màn hình (Screenshot) kết quả cuối mỗi ván đấu để làm bằng chứng đối chiếu.</li>
                        <li>Vào tab <strong className="text-[#ffcc00]">PHÒNG ĐẤU & BÁO CÁO</strong>.</li>
                        <li>Chọn chính xác thứ hạng (Từ Top 1 đến Top 8) cho từng tuyển thủ trong Lobby.</li>
                        <li>Kiểm tra kỹ lưỡng và nhấn nút <strong className="text-red-500 border border-red-500 px-1 rounded bg-[#0f0606] uppercase text-xs">Đồng ý kết quả</strong>. Hệ thống sẽ tự động tính điểm và cập nhật lên bảng tổng sắp.</li>
                      </ul>
                    </div>
                  </div>
                </section>
                
              </div>
            </div>
          </TabsContent>

          {/* TAB 4: CHIA BẢNG ĐẤU (ĐÃ FIX HIỆU ỨNG NHÂN BẢN) */}
          <TabsContent value="brackets">
            <Card className="bg-[#0f0606] border-[#490000] shadow-[0_0_30px_rgba(47,0,0,0.8)]">
              <CardHeader className="border-b border-[#2f0000] pb-4 bg-gradient-to-r from-[#200b0b] to-[#0f0606] rounded-t-xl">
                <CardTitle className="text-2xl font-black tracking-widest text-[#ffcc00] uppercase drop-shadow-md">
                  Bảng Đấu
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-8 pb-12 space-y-16">
                
                {/* Dùng logic tách dữ liệu VÀ CHỈ LẤY VÁN MỚI NHẤT */}
                {(() => {
                  // HÀM MỚI: Quét tất cả các phòng và chỉ giữ lại những phòng thuộc Ván đấu cao nhất
                  const getLatestLobbies = (lobbies: any[]) => {
                    if (!lobbies || lobbies.length === 0) return [];
                    const maxRound = Math.max(...lobbies.map(l => l.roundNumber || 0));
                    return lobbies.filter(l => l.roundNumber === maxRound);
                  };

                  const vongLoaiLobbies = getLatestLobbies(allLobbies.filter(l => l.lobbyName?.includes("VÒNG LOẠI")));
                  const banKetLobbies = getLatestLobbies(allLobbies.filter(l => l.lobbyName?.includes("BÁN KẾT") && !l.lobbyName?.includes("VÒNG VỚT")));
                  const vongVotLobbies = getLatestLobbies(allLobbies.filter(l => l.lobbyName?.includes("VÒNG VỚT")));
                  const chungKetLobbies = getLatestLobbies(allLobbies.filter(l => l.lobbyName?.includes("CHUNG KẾT")));

                  // Nếu chưa có, tạo Placeholder mờ ảo
                  const displayVongLoai = vongLoaiLobbies.length > 0 ? vongLoaiLobbies : Array(5).fill({ lobbyName: "CHƯA BỐC THĂM", players: [] });
                  const displayBanKet = banKetLobbies.length > 0 ? banKetLobbies : [ { lobbyName: "BÁN KẾT - BẢNG 1", players: [] }, { lobbyName: "BÁN KẾT - BẢNG 2", players: [] } ];
                  const displayVongVot = vongVotLobbies.length > 0 ? vongVotLobbies : [ { lobbyName: "LAST CHANCE (VÒNG VỚT)", players: [] } ];
                  const displayChungKet = chungKetLobbies.length > 0 ? chungKetLobbies[0] : { lobbyName: "CHUNG KẾT", players: [] };

                  return (
                    <>
                      {/* 1. KHU VỰC VÒNG LOẠI */}
                      <section>
                        <div className="flex items-center gap-4 mb-6">
                          <h3 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-200 to-gray-500 uppercase tracking-widest">
                            VÒNG LOẠI (NGÀY 1)
                          </h3>
                          <div className="h-0.5 flex-1 bg-gradient-to-r from-gray-600 to-transparent"></div>
                        </div>

                        <div className="space-y-6">
                          {displayVongLoai.map((lobby, index) => {
                            const isReal = lobby.lobbyName !== "CHƯA BỐC THĂM";
                            const displayName = isReal ? lobby.lobbyName : `BẢNG ${String.fromCharCode(65 + index)}`;
                            const players = lobby.players || [];

                            return (
                              <div key={`group-${index}`} className={`bg-[#1a1a1a] rounded-xl border ${isReal ? 'border-green-800 shadow-[0_0_15px_rgba(21,128,61,0.2)]' : 'border-[#333] opacity-60'} overflow-hidden transition-all`}>
                                <div className={`border-b py-2 text-center ${isReal ? 'bg-green-900/30 border-green-800' : 'bg-[#222] border-[#333]'}`}>
                                  <span className={`font-black tracking-widest uppercase ${isReal ? 'text-green-400' : 'text-gray-400'}`}>{displayName}</span>
                                </div>
                                <div className="p-6 flex flex-wrap justify-center gap-x-8 gap-y-6">
                                  {[...Array(8)].map((_, slotIndex) => {
                                    const p = players[slotIndex];
                                    return (
                                      <div key={`slot-${slotIndex}`} className="flex flex-col items-center w-24">
                                        <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 shadow-[0_4px_10px_rgba(0,0,0,0.5)] border-2 ${p ? 'bg-gradient-to-b from-gray-700 to-gray-900 border-gray-500' : 'bg-gradient-to-b from-[#222] to-[#111] border-[#333]'}`}>
                                          <svg className={`w-8 h-8 ${p ? 'text-gray-300' : 'text-gray-600'}`} fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
                                        </div>
                                        <span className={`text-xs font-bold text-center w-full truncate px-1 ${p ? 'text-white' : 'text-gray-500'}`}>
                                          {p?.riotId ? p.riotId.split('#')[0] : (isReal ? "Trống" : "Chờ xếp")}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </section>

                      {/* 2. KHU VỰC BÁN KẾT & VÒNG VỚT */}
                      <section>
                        <div className="flex items-center gap-4 mb-6">
                          <h3 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-700 uppercase tracking-widest">
                            BÁN KẾT (NGÀY 2)
                          </h3>
                          <div className="h-0.5 flex-1 bg-gradient-to-r from-red-800 to-transparent"></div>
                        </div>

                        <div className="space-y-6">
                          {/* Render 2 Bảng Bán Kết */}
                          {displayBanKet.map((lobby, index) => {
                            const isReal = lobby.players?.length > 0;
                            // Gắn thêm chữ VÁN X vào tên bảng nếu là dữ liệu thật
                            const displayName = isReal ? `${lobby.lobbyName} - VÁN ${lobby.roundNumber}` : lobby.lobbyName;
                            
                            return (
                              <div key={`semi-${index}`} className={`bg-[#200b0b] rounded-xl border ${isReal ? 'border-red-600 shadow-[0_0_15px_rgba(220,38,38,0.2)]' : 'border-[#490000] opacity-60'} overflow-hidden transition-all`}>
                                <div className={`border-b py-2 text-center ${isReal ? 'bg-red-900/50 border-red-700' : 'bg-[#2f0000] border-[#490000]'}`}>
                                  <span className={`font-black tracking-widest uppercase ${isReal ? 'text-white' : 'text-red-300'}`}>{displayName}</span>
                                </div>
                                <div className="p-6 flex flex-wrap justify-center gap-x-8 gap-y-6">
                                  {[...Array(8)].map((_, slotIndex) => {
                                    const p = lobby.players?.[slotIndex];
                                    return (
                                      <div key={`semi-slot-${slotIndex}`} className="flex flex-col items-center w-24">
                                        <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 border-2 ${p ? 'bg-gradient-to-b from-red-900 to-black border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]' : 'bg-[#111] border-[#333]'}`}>
                                          <span className={`text-xl ${p ? 'text-red-200' : 'text-gray-600'}`}>{p ? '⚔️' : '?'}</span>
                                        </div>
                                        <span className={`text-xs font-bold text-center w-full truncate ${p ? 'text-red-200' : 'text-gray-500'}`}>
                                          {p?.riotId ? p.riotId.split('#')[0] : "Chờ kết quả"}
                                        </span>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )
                          })}
                          
                          {/* Render Vòng Vớt */}
                          {displayVongVot.map((lobby, index) => {
                            const isReal = lobby.players?.length > 0;
                            const displayName = isReal ? `${lobby.lobbyName} - VÁN ${lobby.roundNumber}` : lobby.lobbyName;

                            return (
                              <div key={`vot-${index}`} className={`bg-[#1a0a00] rounded-xl border ${isReal ? 'border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.2)]' : 'border-[#4a2000] opacity-60'} overflow-hidden transition-all mt-4`}>
                                <div className={`border-b py-2 text-center ${isReal ? 'bg-orange-900/50 border-orange-700' : 'bg-[#301000] border-[#4a2000]'}`}>
                                  <span className={`font-black tracking-widest uppercase ${isReal ? 'text-orange-200' : 'text-orange-500'}`}>{displayName}</span>
                                </div>
                                <div className="p-6 flex flex-wrap justify-center gap-x-8 gap-y-6">
                                  {[...Array(8)].map((_, slotIndex) => {
                                    const p = lobby.players?.[slotIndex];
                                    return (
                                      <div key={`vot-slot-${slotIndex}`} className="flex flex-col items-center w-24">
                                        <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 border-2 ${p ? 'bg-gradient-to-b from-orange-900 to-black border-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.3)]' : 'bg-[#111] border-[#333]'}`}>
                                          <span className={`text-xl ${p ? 'text-orange-200' : 'text-gray-600'}`}>{p ? '♻️' : '?'}</span>
                                        </div>
                                        <span className={`text-xs font-bold text-center w-full truncate ${p ? 'text-orange-200' : 'text-gray-500'}`}>
                                          {p?.riotId ? p.riotId.split('#')[0] : "Chờ kết quả"}
                                        </span>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </section>

                      {/* 3. KHU VỰC CHUNG KẾT */}
                      <section>
                        <div className="flex items-center gap-4 mb-6 mt-8">
                          <h3 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#ffcc00] to-yellow-600 uppercase tracking-widest drop-shadow-[0_2px_10px_rgba(255,204,0,0.4)]">
                            CHUNG KẾT (NGÀY 3)
                          </h3>
                          <div className="h-1 flex-1 bg-gradient-to-r from-[#ffcc00] to-transparent shadow-[0_0_10px_rgba(255,204,0,0.5)]"></div>
                        </div>

                        <div className={`bg-[#1a1500] rounded-xl border-2 overflow-hidden transition-all ${displayChungKet.players?.length > 0 ? 'border-yellow-400 shadow-[0_0_40px_rgba(255,204,0,0.3)]' : 'border-[#ffcc00]/30 shadow-[0_0_20px_rgba(255,204,0,0.1)] opacity-70'}`}>
                          <div className="bg-gradient-to-r from-[#4d3d00] to-[#1a1500] border-b border-[#ffcc00]/30 py-3 text-center">
                            <span className="text-[#ffcc00] font-black tracking-widest uppercase text-xl drop-shadow-md">👑 SÀN ĐẤU HOÀNG GIA {displayChungKet.roundNumber ? `- VÁN ${displayChungKet.roundNumber}` : ''}</span>
                          </div>
                          <div className="p-10 flex flex-wrap justify-center gap-x-12 gap-y-8">
                            {[...Array(8)].map((_, slotIndex) => {
                              const p = displayChungKet.players?.[slotIndex];
                              return (
                                <div key={`final-slot-${slotIndex}`} className="flex flex-col items-center w-28">
                                  <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 border-2 shadow-[0_0_15px_rgba(255,204,0,0.2)] ${p ? 'bg-gradient-to-b from-yellow-700 to-yellow-900 border-yellow-300 scale-110' : 'bg-gradient-to-b from-[#332900] to-[#000] border-[#ffcc00]/40'}`}>
                                    <span className="text-3xl">{p ? '🏆' : '👑'}</span>
                                  </div>
                                  <span className={`text-sm font-bold text-center w-full truncate ${p ? 'text-yellow-400 drop-shadow-md text-base' : 'text-yellow-600/50'}`}>
                                    {p?.riotId ? p.riotId.split('#')[0] : `Vé Vàng ${slotIndex + 1}`}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </section>
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* TAB LỊCH SỬ GIẢI ĐẤU */}
          <TabsContent value="history">
            <Card className="bg-[#0f0606] border-[#490000] shadow-[0_0_20px_rgba(0,0,0,0.5)]">
              <CardHeader className="border-b border-[#2f0000] pb-4">
                <CardTitle className="text-2xl text-[#ffcc00] font-black tracking-wide uppercase drop-shadow-md">
                  ĐẠI SẢNH DANH VỌNG
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-8 space-y-6">
                {historyTournaments.length === 0 ? (
                  <div className="text-center text-gray-500 py-10 font-bold bg-[#1a1111] rounded-xl border border-[#2f0000]">
                    Chưa có giải đấu nào được lưu vào Đại Sảnh Danh Vọng.
                  </div>
                ) : (
                  historyTournaments.map((tour, index) => (
                    <div 
                      key={tour.id} 
                      onClick={() => {
                        setSelectedHistoryTour(tour);
                        api.get(`/MatchLobbies/history-brackets/${tour.id}`)
                          .then(res => setHistoryBrackets(res.data));
                      }}
                      className="cursor-pointer bg-[#200b0b] border-2 border-yellow-600/50 rounded-xl p-6 relative overflow-hidden shadow-[0_0_30px_rgba(255,204,0,0.1)] hover:border-yellow-400 hover:shadow-[0_0_40px_rgba(255,204,0,0.3)] transition-all"
                    >
                      <div className="absolute top-0 right-0 bg-gradient-to-l from-yellow-600 to-yellow-400 text-black font-black px-6 py-2 rounded-bl-2xl shadow-lg">
                        MÙA {historyTournaments.length - index}
                      </div>
                      <h3 className="text-2xl font-black text-red-100 uppercase tracking-widest mb-2">{tour.name}</h3>
                      <p className="text-gray-400 text-sm mb-6">
                        Trạng thái: Đã kết thúc • Cập nhật: {new Date(tour.createdAt).toLocaleDateString() || "2026"}
                      </p>
                      
                      <div className="flex items-center gap-6 bg-[#0a0505] p-4 rounded-lg border border-[#490000]">
                        <div className="text-5xl drop-shadow-[0_0_15px_rgba(255,204,0,0.8)]">👑</div>
                        <div>
                          <p className="text-xs text-yellow-600 font-bold uppercase tracking-wider mb-1">Nhà Vô Địch</p>
                          <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-600">
                            {tour.winnerRiotId ? tour.winnerRiotId.split('#')[0] : "ẨN DANH"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        {/* MODAL XEM LẠI LỊCH SỬ SA BÀN ĐỈNH CAO */}
      {selectedHistoryTour && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm">
          <div className="bg-[#1a0a0a] border-2 border-yellow-600 rounded-xl w-full max-w-6xl h-[90vh] flex flex-col shadow-[0_0_100px_rgba(255,204,0,0.2)]">
            {/* Header Modal */}
            <div className="flex justify-between items-center p-6 border-b-2 border-[#490000] bg-[#0f0606] rounded-t-xl">
              <div>
                <h2 className="text-3xl font-black text-[#ffcc00] uppercase tracking-widest flex items-center gap-4">
                  🏆 SA BÀN CHIẾN DỊCH: {selectedHistoryTour.name}
                </h2>
                <p className="text-gray-400 font-bold mt-2">
                  NHÀ VÔ ĐỊCH: <span className="text-yellow-400 text-xl ml-2">{selectedHistoryTour.winnerRiotId?.split('#')[0] || "ẨN DANH"}</span>
                </p>
              </div>
              <button onClick={() => setSelectedHistoryTour(null)} className="text-red-500 hover:text-red-400 font-black text-5xl">&times;</button>
            </div>
            
            {/* Body Modal (Hiển thị toàn bộ bảng đấu) */}
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
              {historyBrackets.length === 0 ? (
                  <p className="text-center text-yellow-600 font-bold animate-pulse py-20 text-xl">Đang trích xuất dữ liệu từ kho lưu trữ...</p>
              ) : (
                  (() => {
                    // Lọc để lịch sử chỉ hiện ván chốt hạ của mỗi vòng (Tránh rác)
                    const getLatestHistory = (lobbies: any[]) => {
                      if (!lobbies || lobbies.length === 0) return [];
                      const maxRound = Math.max(...lobbies.map(l => l.roundNumber || 0));
                      return lobbies.filter(l => l.roundNumber === maxRound);
                    };
                    
                    const vl = getLatestHistory(historyBrackets.filter(l => l.lobbyName?.includes("VÒNG LOẠI")));
                    const bk = getLatestHistory(historyBrackets.filter(l => l.lobbyName?.includes("BÁN KẾT") && !l.lobbyName?.includes("VÒNG VỚT")));
                    const vv = getLatestHistory(historyBrackets.filter(l => l.lobbyName?.includes("VÒNG VỚT")));
                    const ck = getLatestHistory(historyBrackets.filter(l => l.lobbyName?.includes("CHUNG KẾT")));
                    
                    const cleanHistoryBrackets = [...vl, ...bk, ...vv, ...ck];

                    return cleanHistoryBrackets.map(lobby => {
                      const isChampLobby = lobby.lobbyName.includes("CHUNG KẾT");
                      return (
                      <div key={lobby.id} className="bg-[#200b0b] rounded-lg border border-[#490000] p-5 shadow-lg">
                          <h3 className="text-xl font-black text-red-300 uppercase mb-4 text-center border-b border-[#490000] pb-2">
                            {lobby.lobbyName} - VÁN {lobby.roundNumber}
                          </h3>
                          <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
                             {lobby.players.map((p: any) => {
                                 // Hào quang rực rỡ chỉ dành cho Nhà Vô Địch ở bảng Chung Kết
                                 const isChamp = selectedHistoryTour.winnerRiotId === p.riotId && isChampLobby;
                                 return (
                                  <div key={p.id} className={`p-3 rounded-md text-center border-2 transition-all ${isChamp ? 'bg-yellow-600/20 border-yellow-400 shadow-[0_0_30px_rgba(255,204,0,0.8)] animate-pulse scale-110 z-10' : 'bg-[#0f0606] border-[#2f0000]'}`}>
                                      <div className="text-xs text-gray-400 mb-1 font-bold">Top {p.rank || "?"}</div>
                                      <div className={`font-black text-xs truncate ${isChamp ? 'text-yellow-400' : 'text-gray-300'}`}>
                                          {isChamp && "👑 "} {p.riotId?.split('#')[0]}
                                      </div>
                                  </div>
                                 )
                             })}
                          </div>
                      </div>
                      )
                    });
                  })()
              )}
            </div>
          </div>
        </div>
      )}
      </div>

      {/* POPUP NHÀ VÔ ĐỊCH ĐÃ ĐƯỢC ĐƯA VÀO ĐÚNG VỊ TRÍ */}
      {champion && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/90 backdrop-blur-md">
          <div className="bg-[#1a1111] border-4 border-[#ffcc00] p-12 rounded-2xl text-center shadow-[0_0_100px_rgba(255,204,0,0.4)] animate-[bounce_1s_ease-in-out]">
            <h2 className="text-3xl text-red-500 font-black tracking-widest uppercase mb-4 animate-pulse">
              Giải Đấu Đã Kết Thúc
            </h2>
            <div className="text-8xl mb-6">🏆</div>
            <h3 className="text-xl text-gray-300 font-bold uppercase mb-2">Tân Vương Tactician's Crown</h3>
            <p className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#ffcc00] to-yellow-600 drop-shadow-lg uppercase">
              {champion.riotId?.split('#')[0] || "ẨN DANH"}
            </p>
            <button 
              onClick={() => setChampion(null)} 
              className="mt-10 px-8 py-3 bg-[#650000] text-[#ffcc00] font-black rounded-lg hover:bg-red-900 border border-[#ffcc00]/50 transition-colors">
              Đóng và xem Bảng Xếp Hạng
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
