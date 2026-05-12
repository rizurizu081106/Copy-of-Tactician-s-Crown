using CTC_API.Data;
using CTC_API.Models;
using CTC_API.Hubs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.SignalR;
using ClosedXML.Excel;

namespace CTC_API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TournamentsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IHubContext<MatchHub> _hubContext;

        public TournamentsController(AppDbContext context, IHubContext<MatchHub> hubContext)
        {
            _context = context;
            _hubContext = hubContext; 
        }

        // 1. API CHO LỊCH SỬ: Lấy tất cả các giải ĐÃ KẾT THÚC (Completed)
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Tournament>>> GetTournaments()
        {
            var historyTournaments = await _context.Tournaments
                .Where(t => t.Status == "Completed")
                .OrderByDescending(t => t.Id)
                .ToListAsync();
            return Ok(historyTournaments);
        }

        // 2. API CHO ADMIN: Lấy Giải đấu ĐANG DIỄN RA (Active)
        [HttpGet("active")]
        public async Task<IActionResult> GetActiveTournament()
        {
            var activeTournament = await _context.Tournaments
                .Where(t => t.Status == "Active")
                .OrderByDescending(t => t.Id)
                .FirstOrDefaultAsync();

            return Ok(activeTournament); // Nếu null React sẽ tự hiểu là chưa có giải
        }

        // 3. API TẠO GIẢI MỚI: Tự động đóng các giải cũ
        [Authorize(Roles = "Admin")]
        [HttpPost]
        public async Task<ActionResult<Tournament>> CreateTournament([FromBody] Tournament request)
        {
            // Quét và đóng lại tất cả các giải cũ đang Active (nếu có)
            var oldTournaments = await _context.Tournaments.Where(t => t.Status == "Active").ToListAsync();
            foreach (var old in oldTournaments) {
                old.Status = "Completed"; 
            }

            var newTournament = new Tournament {
                Name = request.Name,
                Status = "Active"
                // CreatedAt = DateTime.Now // Bỏ comment nếu Model của bạn có trường này
            };

            _context.Tournaments.Add(newTournament);
            await _context.SaveChangesAsync();

            return Ok(newTournament);
        }

        // 4. API KẾT THÚC GIẢI: Dọn dẹp rác, đẩy giải vào Lịch Sử
        [Authorize(Roles = "Admin")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> EndTournament(int id)
        {
            var tournament = await _context.Tournaments.FindAsync(id);
            if (tournament == null) return NotFound(new { message = "Không tìm thấy giải đấu!" });

            // Chuyển trạng thái thành Completed để nó lọt vào tab Lịch Sử
            tournament.Status = "Completed";

            // Dọn dẹp: Xóa các phòng đấu đang đánh dở hoặc rác thuộc giải này (Giữ lại các phòng Completed)
            var junkLobbies = await _context.MatchLobbies
                .Where(l => l.TournamentId == id && l.Status != "Completed")
                .ToListAsync();
            
            if(junkLobbies.Any()) {
                _context.MatchLobbies.RemoveRange(junkLobbies);
            }
            
            await _context.SaveChangesAsync();
            return Ok(new { message = "Đã kết thúc giải đấu và lưu vào lịch sử!" });
        }

        // 5. API LEADERBOARD - Giữ nguyên logic siêu đỉnh của bạn
        [HttpGet("{id}/standings")]
        public async Task<IActionResult> GetStandings(int id)
        {
            // BỎ điều kiện m.MatchLobby.Status == "Completed" để lấy TẤT CẢ người chơi đã bốc thăm
            var allResults = await _context.MatchResults
                .Include(m => m.Account)
                .Include(m => m.MatchLobby)
                .Where(m => m.MatchLobby.TournamentId == id) 
                .ToListAsync();

            int highestRoundOverall = allResults.Any() ? allResults.Max(m => m.MatchLobby.RoundNumber) : 0;

            List<int> earlyFinalists = new List<int>();
            if (highestRoundOverall >= 10) {
                earlyFinalists = allResults.Where(m => m.MatchLobby.LobbyName.Contains("BÁN KẾT"))
                    .GroupBy(m => m.AccountId)
                    .OrderByDescending(g => g.Sum(x => x.PointsEarned))
                    .Take(4).Select(g => g.Key).ToList();
            }

            var standings = allResults
                .GroupBy(m => new { m.AccountId, m.Account.RiotId })
                .Select(g => {
                    var latestMatch = g.OrderByDescending(m => m.MatchLobby.RoundNumber).FirstOrDefault();
                    
                    string currentStage = "VÒNG LOẠI";
                    string displayStage = "VÒNG LOẠI";
                    int stageWeight = 1;
                    
                    if (latestMatch != null) {
                        if (latestMatch.MatchLobby.LobbyName.Contains("BÁN KẾT")) {
                            currentStage = "BÁN KẾT";
                            displayStage = "BÁN KẾT";
                            stageWeight = 2;
                        }
                        if (latestMatch.MatchLobby.LobbyName.Contains("VÒNG VỚT")) {
                            currentStage = "VÒNG VỚT";
                            displayStage = "BÁN KẾT - VÒNG VỚT"; 
                            stageWeight = 3;
                        }
                        if (latestMatch.MatchLobby.LobbyName.Contains("CHUNG KẾT")) {
                            currentStage = "CHUNG KẾT";
                            displayStage = "CHUNG KẾT";
                            stageWeight = 4;
                        }
                    }

                    if (earlyFinalists.Contains(g.Key.AccountId)) {
                        currentStage = "CHUNG KẾT";
                        displayStage = "CHUNG KẾT";
                        stageWeight = 4;
                    }

                    // CHỈ TÍNH ĐIỂM NẾU PHÒNG ĐÓ ĐÃ KẾT THÚC (Completed)
                    var relevantMatches = g.Where(m => 
                        m.MatchLobby.Status == "Completed" && (
                        (currentStage == "VÒNG LOẠI" && m.MatchLobby.LobbyName.Contains("VÒNG LOẠI")) ||
                        (currentStage == "BÁN KẾT" && m.MatchLobby.LobbyName.Contains("BÁN KẾT")) ||
                        (currentStage == "VÒNG VỚT" && m.MatchLobby.LobbyName.Contains("VÒNG VỚT")) || 
                        (currentStage == "CHUNG KẾT" && m.MatchLobby.LobbyName.Contains("CHUNG KẾT"))
                    )).ToList();

                    int currentPoints = relevantMatches.Sum(m => m.PointsEarned);
                    int top1Count = relevantMatches.Count(m => m.Rank == 1);
                    double avgRank = relevantMatches.Any() ? relevantMatches.Average(m => m.Rank) : 8.0;

                    return new {
                        id = g.Key.AccountId, 
                        riotId = g.Key.RiotId, 
                        points = currentPoints,
                        top1Count = top1Count,
                        avgRank = avgRank,
                        stage = displayStage,
                        stageWeight = stageWeight,
                        isCheckmate = currentStage == "CHUNG KẾT" && currentPoints >= 20 
                    };
                })
                .OrderByDescending(x => x.stageWeight) 
                .ThenByDescending(x => x.points)       
                .ThenByDescending(x => x.top1Count)    // Tie-breaker #2: Nhiều Top 1 hơn thắng
                .ThenBy(x => x.avgRank)              // Tie-breaker #3: Rank trung bình thấp hơn thắng
                .ToList();

            return Ok(standings);
        }
        [Authorize(Roles = "Admin")]
        [HttpPost("{id}/complete")]
        public async Task<IActionResult> CompleteTournament(int id)
        {
        // 1. Tìm giải đấu
            var tour = await _context.Tournaments.FindAsync(id);
            if (tour == null) return NotFound();

            // 2. CHỈ đổi trạng thái, KHÔNG ĐƯỢC xóa (Delete)
            tour.Status = "Completed"; 

            // 3. Dọn dẹp các phòng rác (Lobbies chưa đánh xong)
            var junkLobbies = await _context.MatchLobbies
                .Where(l => l.TournamentId == id && l.Status != "Completed")
                .ToListAsync();

            if(junkLobbies.Any()) _context.MatchLobbies.RemoveRange(junkLobbies);

            await _context.SaveChangesAsync();

            // 4. Bắn SignalR để cập nhật giao diện ngay lập tức
            if (_hubContext != null) 
                await _hubContext.Clients.All.SendAsync("LeaderboardUpdated");

            return Ok(new { message = "Giải đấu đã được lưu vào lịch sử!" });
        }

        // 2. API LẤY DANH SÁCH GIẢI ĐẤU TRONG LỊCH SỬ ĐỂ HIỂN THỊ
        [HttpGet("history")]
        public async Task<IActionResult> GetHistoryTournaments()
        {
            var history = await _context.Tournaments
                .Where(t => t.Status == "Completed")
                .OrderByDescending(t => t.Id)
                .Select(t => new {
                    id = t.Id,           // Ép về chữ thường cho React dễ đọc
                    name = t.Name,
                    status = t.Status,
                    winnerRiotId = t.WinnerRiotId,
                    createdAt = t.CreatedAt
                })
                .ToListAsync();

            return Ok(history);
        }

        // ==========================================
        // XUẤT EXCEL: Bảng xếp hạng giải đấu
        // ==========================================
        [Authorize(Roles = "Admin")]
        [HttpGet("{id}/export-excel")]
        public async Task<IActionResult> ExportExcel(int id)
        {
            var tournament = await _context.Tournaments.FindAsync(id);
            if (tournament == null) return NotFound(new { message = "Không tìm thấy giải đấu!" });

            // Lấy toàn bộ kết quả của giải
            var allResults = await _context.MatchResults
                .Include(m => m.Account)
                .Include(m => m.MatchLobby)
                .Where(m => m.MatchLobby.TournamentId == id && m.MatchLobby.Status == "Completed")
                .ToListAsync();

            // Tổng hợp theo người chơi
            var standings = allResults
                .GroupBy(m => new { m.AccountId, m.Account.RiotId })
                .Select(g => new {
                    RiotId = g.Key.RiotId,
                    TotalPoints = g.Sum(m => m.PointsEarned),
                    Top1Count = g.Count(m => m.Rank == 1),
                    MatchesPlayed = g.Count(),
                    BestRank = g.Min(m => m.Rank),
                    AvgRank = Math.Round(g.Average(m => (double)m.Rank), 1)
                })
                .OrderByDescending(x => x.TotalPoints)
                .ThenByDescending(x => x.Top1Count)
                .ThenBy(x => x.AvgRank)
                .ToList();

            // Tạo file Excel
            using var workbook = new XLWorkbook();
            var ws = workbook.Worksheets.Add("Bảng Xếp Hạng");

            // Tiêu đề giải đấu
            ws.Cell(1, 1).Value = $"GIẢI ĐẤU: {tournament.Name}";
            ws.Range(1, 1, 1, 6).Merge().Style
                .Font.SetBold(true)
                .Font.SetFontSize(16)
                .Alignment.SetHorizontal(XLAlignmentHorizontalValues.Center);

            if (!string.IsNullOrEmpty(tournament.WinnerRiotId))
            {
                ws.Cell(2, 1).Value = $"🏆 Nhà vô địch: {tournament.WinnerRiotId}";
                ws.Range(2, 1, 2, 6).Merge().Style
                    .Font.SetBold(true)
                    .Font.SetFontColor(XLColor.DarkRed)
                    .Alignment.SetHorizontal(XLAlignmentHorizontalValues.Center);
            }

            // Header bảng
            int headerRow = 4;
            string[] headers = { "Hạng", "Riot ID", "Tổng Điểm", "Số lần Top 1", "Số Trận", "Hạng Cao Nhất", "Hạng TB" };
            for (int i = 0; i < headers.Length; i++)
            {
                ws.Cell(headerRow, i + 1).Value = headers[i];
            }
            ws.Range(headerRow, 1, headerRow, 7).Style
                .Font.SetBold(true)
                .Fill.SetBackgroundColor(XLColor.DarkRed)
                .Font.SetFontColor(XLColor.White)
                .Alignment.SetHorizontal(XLAlignmentHorizontalValues.Center);
 
            // Dữ liệu
            for (int i = 0; i < standings.Count; i++)
            {
                int row = headerRow + 1 + i;
                ws.Cell(row, 1).Value = i + 1;
                ws.Cell(row, 2).Value = standings[i].RiotId;
                ws.Cell(row, 3).Value = standings[i].TotalPoints;
                ws.Cell(row, 4).Value = standings[i].Top1Count;
                ws.Cell(row, 5).Value = standings[i].MatchesPlayed;
                ws.Cell(row, 6).Value = standings[i].BestRank;
                ws.Cell(row, 7).Value = standings[i].AvgRank;
            }

            // Auto-fit columns
            ws.Columns().AdjustToContents();

            // ===== SHEET 2: Chi tiết từng ván =====
            var detailSheet = workbook.Worksheets.Add("Chi Tiết Ván Đấu");
            var lobbies = await _context.MatchLobbies
                .Include(l => l.MatchResults).ThenInclude(m => m.Account)
                .Where(l => l.TournamentId == id && l.Status == "Completed")
                .OrderBy(l => l.RoundNumber).ThenBy(l => l.LobbyName)
                .ToListAsync();

            detailSheet.Cell(1, 1).Value = $"CHI TIẾT: {tournament.Name}";
            detailSheet.Range(1, 1, 1, 5).Merge().Style
                .Font.SetBold(true).Font.SetFontSize(14)
                .Alignment.SetHorizontal(XLAlignmentHorizontalValues.Center);

            string[] detailHeaders = { "Phòng Đấu", "Vòng", "Tuyển Thủ", "Hạng", "Điểm" };
            for (int i = 0; i < detailHeaders.Length; i++)
                detailSheet.Cell(3, i + 1).Value = detailHeaders[i];
            detailSheet.Range(3, 1, 3, 5).Style
                .Font.SetBold(true)
                .Fill.SetBackgroundColor(XLColor.DarkRed)
                .Font.SetFontColor(XLColor.White);

            int detailRow = 4;
            foreach (var lobby in lobbies)
            {
                foreach (var result in lobby.MatchResults.OrderBy(r => r.Rank))
                {
                    detailSheet.Cell(detailRow, 1).Value = lobby.LobbyName;
                    detailSheet.Cell(detailRow, 2).Value = lobby.RoundNumber;
                    detailSheet.Cell(detailRow, 3).Value = result.Account?.RiotId ?? "N/A";
                    detailSheet.Cell(detailRow, 4).Value = result.Rank;
                    detailSheet.Cell(detailRow, 5).Value = result.PointsEarned;
                    detailRow++;
                }
            }
            detailSheet.Columns().AdjustToContents();

            // Xuất file
            using var stream = new MemoryStream();
            workbook.SaveAs(stream);
            var fileName = $"CTC_{tournament.Name.Replace(" ", "_")}_{DateTime.Now:yyyyMMdd}.xlsx";

            return File(
                stream.ToArray(),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                fileName
            );
        }
    }
}
