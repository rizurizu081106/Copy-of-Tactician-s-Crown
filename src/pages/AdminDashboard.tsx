import { useEffect, useState } from "react";
import api from "@/lib/api";
import { HubConnectionBuilder } from "@microsoft/signalr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AdminDashboard() {
  const [pendingLobbies, setPendingLobbies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [tournamentName, setTournamentName] = useState("");
  const [currentTournament, setCurrentTournament] = useState<any>(null);
  const [allPlayers, setAllPlayers] = useState<any[]>([]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<number[]>([]);
  
  const [currentStandings, setCurrentStandings] = useState<any[]>([]);
  const [activeBrackets, setActiveBrackets] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [allAccounts, setAllAccounts] = useState<any[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const fetchPendingLobbies = () => {
    api.get("/MatchLobbies/pending-approval")
      .then(res => { setPendingLobbies(res.data); setIsLoading(false); })
      .catch(() => setIsLoading(false));
  };

  const fetchAdminData = async () => {
    try {
      const playersRes = await api.get("/Auth/players");
      const playersList = playersRes.data;
      setAllPlayers(playersList);

      const bracketsRes = await api.get("/MatchLobbies/brackets");
      setActiveBrackets(bracketsRes.data);

      const activeTourRes = await api.get("/Tournaments/active");
      if (activeTourRes.data) {
        setCurrentTournament(activeTourRes.data);

        const standingsRes = await api.get(`/Tournaments/${activeTourRes.data.id}/standings`);
        setCurrentStandings(standingsRes.data);

        const activeIds = standingsRes.data.map((p: any) => p.id);
        if (activeIds.length > 0) setSelectedPlayerIds(activeIds);
        else setSelectedPlayerIds(playersList.slice(0, 40).map((p: any) => p.id));
      } else {
        setCurrentTournament(null);
      }

    try {
      const logsRes = await api.get("/Auth/audit-logs");
      setAuditLogs(logsRes.data);
    } catch (error) {
      console.warn("Không thể tải audit logs", error);
      setAuditLogs([]);
    }

      const accountsRes = await api.get("/Auth/all");
      setAllAccounts(accountsRes.data);
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu:", error);
      alert("❌ Có lỗi xảy ra!");
    }
  };

  const handleApproveUser = async (userId: number) => {
    try {
      await api.put(`/Auth/approve/${userId}`);
      alert("✅ Đã phê duyệt tài khoản!");
      fetchAdminData();
    } catch (error) {
      alert("❌ Lỗi phê duyệt!");
    }
  };

  const handleBanUser = async (userId: number) => {
    if (!window.confirm("⚠️ Bạn có chắc muốn KHÓA tài khoản này?")) return;
    try {
      await api.put(`/Auth/ban/${userId}`);
      alert("✅ Đã khóa tài khoản!");
      fetchAdminData();
    } catch (error) {
      alert("❌ Lỗi khi khóa!");
    }
  };

  const handleExportExcel = async () => {
    if (!currentTournament) return;
    try {
      const response = await api.get(`/Tournaments/${currentTournament.id}/export-excel`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `CTC_Result_${currentTournament.name}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert("❌ Lỗi khi xuất file Excel!");
    }
  };

  useEffect(() => {
    fetchPendingLobbies();
    fetchAdminData();
    const connection = new HubConnectionBuilder()
      .withUrl("http://localhost:5196/matchHub")
      .withAutomaticReconnect().build();
    
    connection.start().catch(err => console.error(err));
    connection.on("LeaderboardUpdated", () => {
      fetchPendingLobbies();
      fetchAdminData(); 
    });
    return () => { connection.stop(); };
  }, []);

  const handleCreateTournament = () => {
    if (!tournamentName) return alert("Vui lòng nhập tên giải đấu!");
    if (selectedPlayerIds.length !== 40) return alert("Phải chọn đủ 40 người!");
    api.post("/Tournaments", { name: tournamentName })
      .then(res => { alert(`✅ Thành công!`); setCurrentTournament(res.data); fetchAdminData(); })
      .catch(() => alert("❌ Lỗi tạo giải!"));
  };

  const handleCompleteTournament = () => {
    if (!currentTournament) return;
    if (window.confirm(`⚠️ BẠN CHẮC CHỨ? Giải sẽ được đưa vào Lịch sử. Bảng Xếp Hạng & Bảng Đấu sẽ được lưu giữ vĩnh viễn!`)) {
      api.post(`/Tournaments/${currentTournament.id}/complete`)
        .then(() => {
          alert("✅ Đã chốt giải và đưa vào Đại Sảnh Danh Vọng!");
          setCurrentTournament(null);
          setSelectedPlayerIds([]); 
          setCurrentStandings([]);
          setActiveBrackets([]);
          setTournamentName("");
          setPendingLobbies([]);
        }).catch(() => alert("❌ Lỗi khi kết thúc giải!"));
    }
  };

  const togglePlayerSelection = (id: number) => {
    if (currentTournament) return; 
    if (selectedPlayerIds.includes(id)) setSelectedPlayerIds(selectedPlayerIds.filter(pid => pid !== id));
    else if (selectedPlayerIds.length < 40) setSelectedPlayerIds([...selectedPlayerIds, id]);
  };

  const selectFirst40Players = () => {
    if (currentTournament) return; 
    setSelectedPlayerIds(allPlayers.slice(0, 40).map(p => p.id));
  };

// LOGIC ĐẾM SỐ VÁN VÀ KHÓA NÚT CHUẨN THỂ THỨC (CỘNG DỒN ĐIỂM)
  const vongLoaiLobbies = activeBrackets?.filter(l => l.lobbyName?.toUpperCase().includes("VÒNG LOẠI")) || [];
  const vongLoaiRoundCount = new Set(vongLoaiLobbies.map(l => l.roundNumber)).size;
  const isVongLoaiDone = vongLoaiRoundCount >= 6; // Xong đủ 6 ván Vòng Loại mới khóa nút

  const banKetLobbies = activeBrackets?.filter(l => l.lobbyName?.toUpperCase().includes("BÁN KẾT") && !l.lobbyName?.toUpperCase().includes("VÒNG VỚT")) || [];
  const banKetRoundCount = new Set(banKetLobbies.map(l => l.roundNumber)).size;
  const isBanKetDone = banKetRoundCount >= 4; // Xong đủ 4 ván Bán Kết mới khóa nút

  const vongVotLobbies = activeBrackets?.filter(l => l.lobbyName?.toUpperCase().includes("VÒNG VỚT")) || [];
  const vongVotRoundCount = new Set(vongVotLobbies.map(l => l.roundNumber)).size;
  const isVongVotDone = vongVotRoundCount >= 2; // Xong đủ 2 ván Vòng Vớt mới khóa

  const chungKetLobbies = activeBrackets?.filter(l => l.lobbyName?.toUpperCase().includes("CHUNG KẾT")) || [];
  const chungKetRoundCount = new Set(chungKetLobbies.map(l => l.roundNumber)).size;
  const isChungKetDone = false; // Chung kết không khóa, đánh tới khi nào có nhà Vô địch
  const handleStartStage = (stageName: string) => {
    if (!currentTournament) return alert("⚠️ Bạn chưa tạo giải đấu!");
    
    let playerIdsToPlay: number[] = [];
    let confirmMessage = "";

    if (stageName === "VÒNG LOẠI") {
      playerIdsToPlay = selectedPlayerIds;
      confirmMessage = `⚠️ Bắt đầu VÒNG LOẠI - VÁN ${vongLoaiRoundCount + 1}?`;
    } 
    else if (stageName === "BÁN KẾT") {
      const banKetLobbies = activeBrackets?.filter(l => l.lobbyName?.toUpperCase().includes("BÁN KẾT") && !l.lobbyName?.toUpperCase().includes("VÒNG VỚT")) || [];
      if (banKetLobbies.length > 0) {
        // Đã có phòng Bán Kết -> Gom ID từ phòng cũ, không bốc từ BXH nữa
        const allBKPlayers = banKetLobbies.flatMap(l => l.players.map((p:any) => p.id));
        playerIdsToPlay = Array.from(new Set(allBKPlayers));
      } else {
        // Chưa có phòng nào -> Cắt Top 16 từ BXH
        if (currentStandings.length < 16) return alert("Bảng xếp hạng chưa đủ dữ liệu!");
        playerIdsToPlay = currentStandings.slice(0, 16).map(p => p.id); 
      }
      confirmMessage = `⚠️ Bắt đầu BÁN KẾT - VÁN ${banKetRoundCount + 1}? (Cắt Top 16)`;
    }
    else if (stageName === "VÒNG VỚT") {
      const vongVotLobbies = activeBrackets?.filter(l => l.lobbyName?.toUpperCase().includes("VÒNG VỚT")) || [];
      if (vongVotLobbies.length > 0) {
         // Đã có Vòng vớt -> Lấy lại 8 người của ván trước
         playerIdsToPlay = vongVotLobbies[0].players.map((p:any) => p.id);
      } else {
        if (currentStandings.length < 12) return alert("Bảng xếp hạng chưa đủ dữ liệu!");
        playerIdsToPlay = currentStandings.slice(4, 12).map(p => p.id); 
      }
      confirmMessage = `⚠️ Bắt đầu VÒNG VỚT - VÁN ${vongVotRoundCount + 1}?`;
    }
    else if (stageName === "CHUNG KẾT") {
      const chungKetLobbies = activeBrackets?.filter(l => l.lobbyName?.toUpperCase().includes("CHUNG KẾT")) || [];
      if (chungKetLobbies.length > 0) {
         // Đã có Chung Kết (Ván 2, Ván 3...) -> Lấy đúng 8 ông của ván Chung Kết trước đó
         playerIdsToPlay = chungKetLobbies[0].players.map((p:any) => p.id);
      } else {
         // Ván 1 Chung Kết -> Gom 4 ông BK + 4 ông Vòng Vớt
        const top4BanKet = currentStandings.filter(p => p.stage === "BÁN KẾT" || p.stage === "CHUNG KẾT").slice(0, 4);
        const top4VongVot = currentStandings.filter(p => p.stage === "BÁN KẾT - VÒNG VỚT").slice(0, 4);
        playerIdsToPlay = [...top4BanKet.map(p => p.id), ...top4VongVot.map(p => p.id)];
      }

      if (playerIdsToPlay.length !== 8) {
         return alert(`⚠️ Lỗi: Không gom đủ 8 người! (Hệ thống tìm thấy ${playerIdsToPlay.length} người). Hãy chắc chắn Vòng Vớt đã chốt điểm!`);
      }
      confirmMessage = `⚠️ Bắt đầu CHUNG KẾT - VÁN ${chungKetRoundCount + 1}?`;
    }

    if (window.confirm(confirmMessage)) {
      api.post("/MatchLobbies/shuffle", { 
        playerIds: playerIdsToPlay, tournamentId: currentTournament.id, stageName: stageName
      })
      .then(() => { alert(`✅ Đã khởi tạo ${stageName}!`); fetchAdminData(); fetchPendingLobbies(); })
      .catch(err => {
        console.error("Shuffle error", err);
        alert(err.response?.data?.message || "❌ Có lỗi xảy ra!");
      });
    }
  };

  const handleApprove = (lobbyId: number) => { 
    if (!window.confirm(`Duyệt kết quả Phòng #${lobbyId}?`)) return;
    api.post(`/MatchLobbies/${lobbyId}/approve`)
      .then(() => { fetchPendingLobbies(); fetchAdminData(); })
  };

  const handleGenerateBots = () => {
    api.post("/Accounts/generate-bots").then(() => fetchAdminData());
  };

  return (
    <div className="min-h-screen bg-black text-red-50 p-6 relative">
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;700;900&display=swap');
          * { font-family: 'Be Vietnam Pro', sans-serif !important; }
        `}
      </style>

      <div className="max-w-7xl mx-auto space-y-6 relative z-10">
        
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-[#490000] pb-6">
          <h1 className="text-3xl font-black text-red-500 tracking-widest uppercase flex items-center gap-3">Admin Control Center</h1>
          {currentTournament && (
            <div className="flex items-center gap-4 bg-red-900/40 border border-red-500 px-4 py-2 rounded shadow-[0_0_15px_rgba(255,0,0,0.3)]">
              <span className="font-bold text-red-100">ĐANG ĐIỀU HÀNH:</span>
              <span className="font-black text-[#ffcc00] tracking-widest uppercase">{currentTournament.name}</span>
              <div className="flex gap-2 ml-4">
                <button onClick={handleExportExcel} className="bg-green-700 hover:bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded uppercase flex items-center gap-1">
                  📥 Xuất Excel
                </button>
                <button onClick={handleCompleteTournament} className="bg-red-700 hover:bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded uppercase">Kết Thúc Giải</button>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* CỘT TRÁI */}
          <div className="lg:col-span-2 space-y-6">
            <Card className={`bg-[#0f0606] border-[#490000] transition-all ${currentTournament ? 'border-green-600/50 shadow-[0_0_20px_rgba(21,128,61,0.1)]' : ''}`}>
              <CardHeader className="border-b border-[#2f0000] bg-[#1a0a0a]">
                <CardTitle className="text-[#ffcc00] uppercase font-black flex justify-between items-center">
                  <span>1. Cấu hình Giải & Chốt Roster</span>
                  {currentTournament ? <Badge className="bg-green-700 text-white">ĐÃ CHỐT SỔ KHÓA CỨNG</Badge> : <span className="text-sm font-bold text-red-400">Yêu cầu chọn đủ 40 người</span>}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div>
                  <input type="text" placeholder="Tên Giải Đấu..." value={currentTournament ? currentTournament.name : tournamentName} onChange={(e) => setTournamentName(e.target.value)} disabled={!!currentTournament} className="w-full bg-[#200b0b] border border-[#650000] rounded p-3 text-white font-bold outline-none disabled:opacity-50" />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-xs text-gray-400 font-bold uppercase">Tuyển thủ ({selectedPlayerIds.length}/40)</label>
                    {!currentTournament && (
                      <div className="flex gap-2">
                        {allPlayers.length < 40 && <button onClick={handleGenerateBots} className="text-[10px] bg-purple-900 text-purple-300 px-2 py-1 rounded">TẠO 40 BOT</button>}
                        <button onClick={selectFirst40Players} className="bg-[#490000] hover:bg-[#650000] text-white text-xs font-bold px-3 py-1.5 rounded">+ CHỌN TỰ ĐỘNG 40 NGƯỜI</button>
                      </div>
                    )}
                  </div>
                  <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 max-h-[350px] overflow-y-auto custom-scrollbar pr-2 ${currentTournament ? 'opacity-80' : ''}`}>
                    {allPlayers.map(p => {
                      const isSelected = selectedPlayerIds.includes(p.id);
                      return (
                        <div key={p.id} onClick={() => togglePlayerSelection(p.id)} className={`p-2 rounded border text-sm font-bold text-center transition-colors ${currentTournament ? 'cursor-not-allowed' : 'cursor-pointer'} ${isSelected ? "bg-green-900/40 border-green-500 text-green-300" : "bg-[#200b0b] border-[#490000] text-gray-500"}`}>
                          {p.riotId?.split('#')[0] || "Trống"}
                        </div>
                      )
                    })}
                  </div>
                </div>
                {!currentTournament && (
                  <button onClick={handleCreateTournament} disabled={selectedPlayerIds.length !== 40 || !tournamentName} className="w-full py-4 rounded font-black text-lg uppercase tracking-widest disabled:bg-gray-800 disabled:text-gray-500 bg-green-700 hover:bg-green-600 text-white">
                    Tạo Giải & Chốt Danh Sách
                  </button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* CỘT PHẢI: LOGIC DISABLED MỚI */}
          <div className="space-y-6">
            <Card className={`bg-[#1a0a0a] border-red-600 shadow-[0_0_20px_rgba(255,0,0,0.2)] transition-all ${!currentTournament ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
              <CardHeader className="border-b border-red-900/50">
                <CardTitle className="text-red-500 uppercase font-black">2. Tiến Độ Giải Đấu</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-3">
                <p className="text-xs text-gray-400 italic mb-4">Các nút chỉ được bấm MỘT LẦN duy nhất cho mỗi giải đấu. Đã khóa là cấm click!</p>
                
                {/* NÚT DEMO QUYỀN NĂNG Ở ĐÂY */}
                {currentTournament && (
                  <button 
                    onClick={() => {
                      if(window.confirm("🚀 AUTO DEMO: Điền rank 1-8 ngẫu nhiên cho CÁC PHÒNG ĐANG MỞ và DUYỆT LUÔN?")) {
                         api.post(`/MatchLobbies/simulate-round/${currentTournament.id}`)
                          .then(res => { alert(res.data.message); fetchAdminData(); fetchPendingLobbies(); })
                          .catch(() => alert("❌ Lỗi hệ thống giả lập!"));
                      }
                    }} 
                    className="w-full mb-4 py-3 bg-purple-900 hover:bg-purple-700 text-purple-300 font-black rounded border-2 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)] transition-all uppercase text-sm animate-pulse">
                    ⚡ AUTO DEMO: ĐIỀN ĐIỂM & DUYỆT VÒNG NÀY
                  </button>
                )}

                <button disabled={isVongLoaiDone} onClick={() => handleStartStage("VÒNG LOẠI")} className={`w-full py-3 font-black rounded border transition-all uppercase text-sm ${isVongLoaiDone ? 'bg-gray-800 text-gray-600 border-gray-700 cursor-not-allowed' : 'bg-[#490000] hover:bg-[#650000] text-white border-[#ffcc00]/30'}`}>
                  {isVongLoaiDone ? "🔒 ĐÃ XONG VÒNG LOẠI" : `1️⃣ BẮT ĐẦU VÒNG LOẠI (VÁN ${vongLoaiRoundCount + 1}/6)`}
                </button>
                
                <button disabled={isBanKetDone || !isVongLoaiDone} onClick={() => handleStartStage("BÁN KẾT")} className={`w-full py-3 font-black rounded border transition-all uppercase text-sm ${isBanKetDone || !isVongLoaiDone ? 'bg-gray-800 text-gray-600 border-gray-700 cursor-not-allowed' : 'bg-[#650000] hover:bg-[#800000] text-[#ffcc00] border-[#ffcc00]/50 shadow-[0_0_10px_rgba(101,0,0,0.5)]'}`}>
                  {isBanKetDone ? "🔒 ĐÃ XONG BÁN KẾT" : `2️⃣ BẮT ĐẦU BÁN KẾT (VÁN ${banKetRoundCount + 1}/4)`}
                </button>

                <button disabled={isVongVotDone || !isBanKetDone} onClick={() => handleStartStage("VÒNG VỚT")} className={`w-full py-3 font-black rounded border transition-all uppercase text-sm ${isVongVotDone || !isBanKetDone ? 'bg-gray-800 text-gray-600 border-gray-700 cursor-not-allowed' : 'bg-orange-900 hover:bg-orange-800 text-orange-200 border-orange-500/50'}`}>
                  {isVongVotDone ? "🔒 ĐÃ XONG VÒNG VỚT" : `♻️ BẮT ĐẦU VÒNG VỚT (VÁN ${vongVotRoundCount + 1}/2)`}
                </button>

                <button disabled={isChungKetDone || !isVongVotDone} onClick={() => handleStartStage("CHUNG KẾT")} className={`w-full py-3 font-black rounded border-2 transition-all uppercase text-sm ${isChungKetDone || !isVongVotDone ? 'bg-gray-800 text-gray-600 border-gray-700 cursor-not-allowed' : 'bg-yellow-600 hover:bg-yellow-500 text-black border-yellow-400 shadow-[0_0_15px_rgba(255,204,0,0.6)]'}`}>
                  {isChungKetDone ? "🔒 ĐÃ XONG CHUNG KẾT" : `🏆 BẮT ĐẦU CHUNG KẾT (VÁN ${chungKetRoundCount + 1})`}
                </button>
              </CardContent>
            </Card>

            {/* HỒ SƠ CHỜ DUYỆT - ĐẦY ĐỦ BẰNG CHỨNG */}
            <Card className="bg-[#0f0606] border-[#ffcc00]/50">
              <CardHeader className="border-b border-[#ffcc00]/20 bg-[#1a1500]">
                <CardTitle className="text-[#ffcc00] uppercase font-black flex justify-between">
                  <span>Hồ sơ chờ duyệt</span>
                  <Badge className="bg-yellow-600 text-black font-black">{pendingLobbies.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 max-h-[600px] overflow-y-auto custom-scrollbar">
                {isLoading ? <div className="text-center text-yellow-500 py-10 animate-pulse font-bold">Đang quét...</div> : pendingLobbies.length === 0 ? <div className="text-center text-green-500/50 py-10 font-bold border border-green-900/30 rounded-lg bg-[#0a1a0a]">[ SẠCH ]</div> : (
                  <div className="space-y-6">
                    {pendingLobbies.map((lobby) => (
                      <div key={lobby.id} className="bg-[#1a1111] border border-[#ffcc00]/30 rounded-lg overflow-hidden">
                        {/* Header phòng */}
                        <div className="flex justify-between items-center bg-[#1a1500] border-b border-[#ffcc00]/20 px-4 py-3">
                          <h3 className="text-[#ffcc00] font-black text-sm uppercase tracking-wider">{lobby.lobbyName}</h3>
                          <div className="flex gap-2">
                            <button onClick={() => handleApprove(lobby.id)} className="px-4 py-1.5 bg-green-700 hover:bg-green-600 text-white font-black text-xs uppercase rounded transition-colors">✅ DUYỆT KẾT QUẢ</button>
                          </div>
                        </div>
                        {/* Danh sách 8 người chơi + bằng chứng */}
                        <div className="p-4 space-y-2">
                          {lobby.players.sort((a:any, b:any) => a.rank - b.rank).map((p: any) => {
                            const isTop4 = p.rank >= 1 && p.rank <= 4;
                            return (
                              <div key={p.id} className={`flex items-center gap-3 p-2 rounded-lg border transition-all ${
                                isTop4 ? 'bg-[#1a1a0a] border-[#ffcc00]/20' : 'bg-[#0f0606] border-[#2f0000]'
                              }`}>
                                {/* Rank */}
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-sm shrink-0 ${
                                  p.rank === 1 ? 'bg-yellow-600 text-black' :
                                  p.rank === 2 ? 'bg-gray-400 text-black' :
                                  p.rank === 3 ? 'bg-orange-600 text-white' :
                                  p.rank === 4 ? 'bg-red-800 text-red-200' :
                                  'bg-[#200b0b] text-gray-500 border border-[#490000]'
                                }`}>T{p.rank}</div>
                                {/* Tên người chơi */}
                                <div className="flex-1 min-w-0">
                                  <span className={`font-bold text-sm truncate block ${isTop4 ? 'text-white' : 'text-gray-400'}`}>
                                    {p.riotId?.split('#')[0] || 'Trống'}
                                  </span>
                                  <span className="text-[10px] text-gray-600">{p.rank <= 4 ? `+${9-p.rank} điểm` : `+${9-p.rank} điểm`}</span>
                                </div>
                                {/* Ảnh bằng chứng */}
                                {p.evidenceUrl ? (
                                  <div
                                    onClick={() => setPreviewImage(p.evidenceUrl)}
                                    className="w-16 h-10 rounded border border-[#ffcc00]/30 overflow-hidden cursor-pointer hover:border-[#ffcc00] hover:shadow-[0_0_10px_rgba(255,204,0,0.3)] transition-all shrink-0 group relative"
                                  >
                                    <img src={p.evidenceUrl} alt="evidence" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                      <span className="text-[8px] text-white font-bold">🔍 XEM</span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="w-16 h-10 rounded border border-dashed border-[#490000] flex items-center justify-center shrink-0">
                                    <span className="text-[8px] text-gray-600 italic">Chưa nộp</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* SECTION 3: USER MANAGEMENT */}
        <Card className="bg-[#0f0606] border-[#490000]">
          <CardHeader className="border-b border-[#2f0000] bg-[#1a0a0a]">
            <CardTitle className="text-[#ffcc00] uppercase font-black">
              👥 Quản Lý Tài Khoản ({allAccounts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-300">
                <thead className="text-xs uppercase bg-[#1a1111] text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Riot ID</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Vai trò</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2f0000]">
                  {allAccounts.map((acc) => (
                    <tr key={acc.id} className="hover:bg-[#1a1111] transition-colors">
                      <td className="px-4 py-3 font-bold text-white">{acc.riotId}</td>
                      <td className="px-4 py-3 text-gray-400">{acc.email}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={acc.role === 'Admin' ? 'border-red-500 text-red-500' : 'border-gray-500'}>
                          {acc.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {acc.isApproved ? (
                          <Badge className="bg-green-900/40 text-green-400 border-green-800">Đã Duyệt</Badge>
                        ) : (
                          <Badge className="bg-yellow-900/40 text-yellow-400 border-yellow-800">Chờ Duyệt</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {!acc.isApproved && acc.role !== 'Admin' && (
                            <button onClick={() => handleApproveUser(acc.id)} className="bg-green-700 hover:bg-green-600 text-white text-[10px] font-bold px-2 py-1 rounded uppercase">Duyệt</button>
                          )}
                          {acc.role !== 'Admin' && (
                            <button onClick={() => handleBanUser(acc.id)} className="bg-red-900 hover:bg-red-700 text-red-200 text-[10px] font-bold px-2 py-1 rounded uppercase">Khóa</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* SECTION 4: AUDIT LOGS */}
        <Card className="bg-[#0f0606] border-[#490000]">
          <CardHeader className="border-b border-[#2f0000] bg-[#1a0a0a]">
            <CardTitle className="text-gray-400 uppercase font-black flex items-center gap-2">
              📜 Lịch sử thao tác Admin
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-300">
                <thead className="text-xs uppercase bg-[#1a1111] text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Thời gian</th>
                    <th className="px-4 py-3">Admin</th>
                    <th className="px-4 py-3">Hành động</th>
                    <th className="px-4 py-3">Chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2f0000]">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#1a1111] transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                        {new Date(log.timestamp).toLocaleString("vi-VN")}
                      </td>
                      <td className="px-4 py-3 font-bold text-red-400">
                        {log.adminName?.split('#')[0]}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className="bg-blue-900/40 text-blue-300 border-blue-800">
                          {log.actionType}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 italic">
                        {log.description}
                      </td>
                    </tr>
                  ))}
                  {auditLogs.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-gray-600">
                        Chưa có hành động nào được ghi lại.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* MODAL XEM ẢNH BẰNG CHỨNG */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm cursor-pointer"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-3 -right-3 w-10 h-10 bg-red-700 hover:bg-red-600 text-white font-black text-xl rounded-full border-2 border-red-500 shadow-[0_0_15px_rgba(255,0,0,0.5)] transition-colors z-10 flex items-center justify-center"
            >&times;</button>
            <div className="bg-[#0f0606] border-2 border-[#ffcc00]/50 rounded-xl overflow-hidden shadow-[0_0_40px_rgba(255,204,0,0.2)]">
              <div className="bg-[#1a1500] border-b border-[#ffcc00]/20 px-4 py-2">
                <span className="text-[#ffcc00] font-black text-xs uppercase tracking-widest">📸 Bằng chứng kết quả ván đấu</span>
              </div>
              <div className="p-2">
                <img
                  src={previewImage}
                  alt="Evidence preview"
                  className="w-full max-h-[75vh] object-contain rounded"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
