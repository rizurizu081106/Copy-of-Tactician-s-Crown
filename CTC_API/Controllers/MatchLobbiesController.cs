using CTC_API.Data;
using CTC_API.Models;
using CTC_API.Hubs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.SignalR;
using System;
using System.Linq;
using System.Security.Claims;

namespace CTC_API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class MatchLobbiesController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IHubContext<MatchHub> _hubContext;

        public MatchLobbiesController(AppDbContext context, IHubContext<MatchHub> hubContext)
        {
            _context = context;
            _hubContext = hubContext;
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<MatchLobby>> GetLobby(int id)
        {
            var lobby = await _context.MatchLobbies.FindAsync(id);
            if (lobby == null) return NotFound(new { message = "Không tìm thấy phòng đấu này!" });
            
            var playersInLobby = await _context.MatchResults
                .Where(m => m.MatchLobbyId == id)
                .Select(m => new {
                    id = m.AccountId,
                    riotId = _context.Accounts.Where(a => a.Id == m.AccountId).Select(a => a.RiotId).FirstOrDefault(),
                    evidenceUrl = m.EvidenceUrl,
                    rank = m.Rank 
                })
                .ToListAsync();

            return Ok(new {
                id = lobby.Id, lobbyName = lobby.LobbyName, status = lobby.Status,
                hostId = lobby.HostId, players = playersInLobby, roundNumber = lobby.RoundNumber
            });
        }

        [Authorize(Roles = "Admin")]
        [HttpGet("disputed")]
        public async Task<ActionResult<IEnumerable<MatchLobby>>> GetDisputedLobbies()
        {
            var disputedLobbies = await _context.MatchLobbies.Where(l => l.Status == "Disputed").ToListAsync();
            return Ok(disputedLobbies);
        }

        [Authorize]
        [HttpPost("{id}/upload-evidence")]
        public async Task<IActionResult> UploadEvidence(int id, [FromBody] UploadEvidenceDto dto)
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var isAdmin = User.IsInRole("Admin");
            if (!isAdmin && (string.IsNullOrWhiteSpace(userIdStr) || !int.TryParse(userIdStr, out var userId) || dto.AccountId != userId))
            {
                return Forbid();
            }

            var matchResult = await _context.MatchResults.FirstOrDefaultAsync(m => m.MatchLobbyId == id && m.AccountId == dto.AccountId);
            if (matchResult == null) return NotFound();

            matchResult.EvidenceUrl = dto.ImageUrl;
            await _context.SaveChangesAsync();
            
            if (_hubContext != null) await _hubContext.Clients.All.SendAsync("LeaderboardUpdated");
            return Ok(new { message = "Đã tải ảnh bằng chứng lên thành công!" });
        }

        [Authorize]
        [HttpPost("{id}/report")]
        public async Task<IActionResult> HostReportResult(int id, [FromBody] string evidenceUrl)
        {
            var lobby = await _context.MatchLobbies.FindAsync(id);
            if (lobby == null) return NotFound();
            if (lobby.Status != "Playing") return BadRequest(new { message = "Phòng đấu này không ở trạng thái có thể báo cáo!" });
            lobby.Status = "WaitingVote";
            await _context.SaveChangesAsync();
            return Ok(new { message = "Đã nộp báo cáo kết quả! Đang chờ xác nhận...", status = lobby.Status });
        }

        [Authorize]
        [HttpPost("{id}/dispute")]
        public async Task<IActionResult> DisputeResult(int id, [FromBody] string reason)
        {
            var lobby = await _context.MatchLobbies.FindAsync(id);
            if (lobby == null) return NotFound();
            if (lobby.Status == "PendingAdminApproval") 
            {
                lobby.Status = "Disputed"; 
                await _context.SaveChangesAsync();
                if (_hubContext != null) await _hubContext.Clients.All.SendAsync("ReceiveDisputeAlert");
                return Ok(new { message = "Ván đấu đã bị Đóng Băng!", status = lobby.Status });
            }
            return BadRequest(new { message = "Không thể khiếu nại lúc này!" });
        }

        [Authorize(Roles = "Admin")]
        [HttpPost("{id}/resolve")]
        public async Task<IActionResult> ResolveDispute(int id, [FromBody] List<PlayerResultDto> finalResults)
        {
            var lobby = await _context.MatchLobbies.FindAsync(id);
            if (lobby == null) return NotFound();

            var pointMapping = new Dictionary<int, int> { { 1, 8 }, { 2, 7 }, { 3, 6 }, { 4, 5 }, { 5, 4 }, { 6, 3 }, { 7, 2 }, { 8, 1 } };

            foreach (var res in finalResults)
            {
                var matchResult = await _context.MatchResults.FirstOrDefaultAsync(m => m.MatchLobbyId == id && m.AccountId == res.AccountId);
                if (matchResult != null)
                {
                    matchResult.Rank = res.Rank;
                    matchResult.PointsEarned = pointMapping.ContainsKey(res.Rank) ? pointMapping[res.Rank] : 0;
                }
            }

            lobby.Status = "Completed";

            // GHI LOG ADMIN
            var adminIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (adminIdStr != null) {
                _context.AdminAuditLogs.Add(new AdminAuditLog {
                    AdminId = int.Parse(adminIdStr),
                    ActionType = "Giải quyết tranh chấp",
                    Description = $"Xử lý Dispute phòng {lobby.LobbyName}",
                    Timestamp = DateTime.Now
                });
            }

            await _context.SaveChangesAsync();
            if (_hubContext != null) await _hubContext.Clients.All.SendAsync("LeaderboardUpdated");
            return Ok(new { message = "Trọng tài đã chốt! Bảng xếp hạng đã cập nhật." });
        }

        [Authorize]
        [HttpPost("{id}/submit-results")]
        public async Task<IActionResult> SubmitResults(int id, [FromBody] List<SubmitResultDto> results)
        {
            var lobby = await _context.MatchLobbies.FindAsync(id);
            if (lobby == null) return NotFound(new { message = "Không tìm thấy phòng đấu!" });

            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var isAdmin = User.IsInRole("Admin");
            if (!isAdmin && (string.IsNullOrWhiteSpace(userIdStr) || !int.TryParse(userIdStr, out var userId) || lobby.HostId != userId))
            {
                return Forbid();
            }

            var pointMapping = new Dictionary<int, int> { { 1, 8 }, { 2, 7 }, { 3, 6 }, { 4, 5 }, { 5, 4 }, { 6, 3 }, { 7, 2 }, { 8, 1 } };

            foreach (var req in results)
            {
                var matchResult = await _context.MatchResults.FirstOrDefaultAsync(m => m.MatchLobbyId == id && m.AccountId == req.AccountId);
                if (matchResult != null)
                {
                    matchResult.Rank = req.Rank;
                    matchResult.PointsEarned = pointMapping.ContainsKey(req.Rank) ? pointMapping[req.Rank] : 0;
                    matchResult.UpdatedAt = DateTime.Now;
                }
            }

            lobby.Status = "PendingAdminApproval";
            lobby.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();

            if (_hubContext != null) await _hubContext.Clients.All.SendAsync("LeaderboardUpdated");
            return Ok(new { message = "✅ Host đã nộp điểm! Đang chờ Admin duyệt." });
        }

        [Authorize(Roles = "Admin")]
        [HttpPost("simulate-round/{tournamentId}")]
        public async Task<IActionResult> SimulateRound(int tournamentId)
        {
            var activeLobbies = await _context.MatchLobbies
                .Include(l => l.MatchResults)
                .Where(l => l.TournamentId == tournamentId && l.Status != "Completed")
                .ToListAsync();

            if (!activeLobbies.Any()) return BadRequest(new { message = "Không có phòng nào đang mở để giả lập!" });

            int[] pointSystem = { 0, 8, 7, 6, 5, 4, 3, 2, 1 };
            
            bool isTournamentEnded = false;
            int? winnerAccountId = null;
            string winnerRiotId = null;

            foreach (var lobby in activeLobbies)
            {
                var results = lobby.MatchResults.ToList();
                if (results.Count == 0) continue;

                var shuffledRanks = Enumerable.Range(1, results.Count).OrderBy(x => Guid.NewGuid()).ToList();

                for (int i = 0; i < results.Count; i++)
                {
                    results[i].Rank = shuffledRanks[i];
                    results[i].PointsEarned = shuffledRanks[i] <= 8 ? pointSystem[shuffledRanks[i]] : 0;
                    results[i].EvidenceUrl = "https://i.ibb.co/Xz9Z2n8/demo-auto.jpg"; 
                }
                
                lobby.Status = "Completed"; 
                lobby.UpdatedAt = DateTime.Now;

                if (lobby.LobbyName.Contains("CHUNG KẾT"))
                {
                    var top1Result = results.FirstOrDefault(r => r.Rank == 1);
                    if (top1Result != null)
                    {
                        int pointsBeforeThisMatch = await _context.MatchResults
                            .Where(m => m.AccountId == top1Result.AccountId 
                                     && m.MatchLobby.LobbyName.Contains("CHUNG KẾT") 
                                     && m.MatchLobbyId != lobby.Id
                                     && m.MatchLobby.Status == "Completed")
                            .SumAsync(m => m.PointsEarned);

                        if (pointsBeforeThisMatch >= 20)
                        {
                            isTournamentEnded = true;
                            winnerAccountId = top1Result.AccountId;
                            winnerRiotId = await _context.Accounts.Where(a => a.Id == winnerAccountId).Select(a => a.RiotId).FirstOrDefaultAsync();
                        }
                    }
                }
            }
            
            if (isTournamentEnded)
            {
                var currentTour = await _context.Tournaments.FindAsync(tournamentId);
                if (currentTour != null) {
                    currentTour.Status = "Completed";
                    currentTour.WinnerRiotId = winnerRiotId;
                }
            }

            await _context.SaveChangesAsync();
            
            if (_hubContext != null) {
                await _hubContext.Clients.All.SendAsync("LeaderboardUpdated");
                if (isTournamentEnded) {
                     await _hubContext.Clients.All.SendAsync("TournamentEnded", new { 
                         accountId = winnerAccountId,
                         riotId = winnerRiotId
                     });
                }
            }

            if (isTournamentEnded) {
                return Ok(new { message = $"🏆 ĐÃ TÌM RA NHÀ VÔ ĐỊCH: {winnerRiotId?.Split('#')[0]}! Giải đấu đã kết thúc." });
            }

            return Ok(new { message = "🚀 ĐÃ GIẢ LẬP XONG! Toàn bộ phòng đấu đã được đánh xong và duyệt tự động!" });
        }

        [Authorize(Roles = "Admin")]
        [HttpPost("{id}/approve")]
        public async Task<IActionResult> ApproveResults(int id)
        {
            var lobby = await _context.MatchLobbies.FindAsync(id);
            if (lobby == null) return NotFound();
            if (lobby.Status == "Completed") return BadRequest(new { message = "Ván đấu này đã được duyệt rồi!" });

            lobby.Status = "Completed";
            lobby.UpdatedAt = DateTime.Now;

            // GHI LOG ADMIN
            var adminIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (adminIdStr != null) {
                _context.AdminAuditLogs.Add(new AdminAuditLog {
                    AdminId = int.Parse(adminIdStr),
                    ActionType = "Duyệt kết quả",
                    Description = $"Duyệt kết quả phòng {lobby.LobbyName} (Ván {lobby.RoundNumber})",
                    Timestamp = DateTime.Now
                });
            }

            if (lobby.LobbyName.Contains("CHUNG KẾT"))
            {
                var top1Result = await _context.MatchResults
                    .Include(m => m.Account)
                    .FirstOrDefaultAsync(m => m.MatchLobbyId == lobby.Id && m.Rank == 1);

                if (top1Result != null)
                {
                    int pointsBeforeThisMatch = await _context.MatchResults
                        .Where(m => m.AccountId == top1Result.AccountId 
                                 && m.MatchLobby.LobbyName.Contains("CHUNG KẾT") 
                                 && m.MatchLobbyId != lobby.Id
                                 && m.MatchLobby.Status == "Completed")
                        .SumAsync(m => m.PointsEarned);

                    if (pointsBeforeThisMatch >= 20)
                    {
                        var currentTour = await _context.Tournaments.FindAsync(lobby.TournamentId);
                        if (currentTour != null) {
                            currentTour.Status = "Completed";
                            currentTour.WinnerRiotId = top1Result.Account.RiotId;
                        }

                        if (_hubContext != null) {
                            await _hubContext.Clients.All.SendAsync("TournamentEnded", new { 
                                accountId = top1Result.AccountId,
                                riotId = top1Result.Account.RiotId
                            });
                        }
                    }
                }
            }

            await _context.SaveChangesAsync();
            if (_hubContext != null) await _hubContext.Clients.All.SendAsync("LeaderboardUpdated");
            return Ok(new { message = "✅ Đã phê duyệt! Hệ thống đã tính toán vòng đấu." });
        }

        [HttpGet("brackets")]
        public async Task<IActionResult> GetBrackets()
        {
            var lobbies = await _context.MatchLobbies
                .Include(l => l.MatchResults).ThenInclude(m => m.Account)
                .Where(l => l.Tournament != null && l.Tournament.Status == "Active")
                .OrderBy(l => l.RoundNumber).ThenBy(l => l.LobbyName)
                .Select(l => new {
                    id = l.Id, lobbyName = l.LobbyName, status = l.Status, roundNumber = l.RoundNumber,
                    players = l.MatchResults.Select(mr => new {
                        id = mr.AccountId, riotId = mr.Account.RiotId, evidenceUrl = mr.EvidenceUrl, rank = mr.Rank
                    }).ToList()
                }).ToListAsync();
            return Ok(lobbies);
        }

        [HttpGet("history-brackets/{tournamentId}")]
        public async Task<IActionResult> GetHistoryBrackets(int tournamentId)
        {
            var lobbies = await _context.MatchLobbies
                .Include(l => l.MatchResults).ThenInclude(m => m.Account)
                .Where(l => l.TournamentId == tournamentId)
                .OrderBy(l => l.RoundNumber).ThenBy(l => l.LobbyName)
                .Select(l => new {
                    id = l.Id, lobbyName = l.LobbyName, status = l.Status, roundNumber = l.RoundNumber,
                    players = l.MatchResults.Select(mr => new {
                        id = mr.AccountId, riotId = mr.Account.RiotId, evidenceUrl = mr.EvidenceUrl, rank = mr.Rank
                    }).ToList()
                }).ToListAsync();
            return Ok(lobbies);
        }

        [Authorize]
        [HttpGet("my-lobby/{accountId}")]
        public async Task<IActionResult> GetMyCurrentLobby(int accountId)
        {
            var myResult = await _context.MatchResults
                .Include(m => m.MatchLobby)
                .ThenInclude(l => l.Tournament)
                .Where(m => m.AccountId == accountId
                    && m.MatchLobby.Tournament != null
                    && m.MatchLobby.Tournament.Status == "Active"
                    && m.MatchLobby.Status != "Completed")
                .OrderByDescending(m => m.CreatedAt)
                .FirstOrDefaultAsync();
            int? lobbyIdToFetch = myResult?.MatchLobbyId;

            if (lobbyIdToFetch == null)
            {
                var hostedLobby = await _context.MatchLobbies
                    .Include(l => l.Tournament)
                    .FirstOrDefaultAsync(l => l.HostId == accountId
                        && l.Tournament != null
                        && l.Tournament.Status == "Active"
                        && (l.Status == "Playing" || l.Status == "PendingAdminApproval" || l.Status == "Disputed"));
                if (hostedLobby != null) lobbyIdToFetch = hostedLobby.Id;
            }

            if (lobbyIdToFetch == null) return NotFound(new { message = "Bạn hiện không có trận đấu nào." });

            var lobby = await _context.MatchLobbies.FindAsync(lobbyIdToFetch);
            var playersInLobby = await _context.MatchResults
                .Where(m => m.MatchLobbyId == lobbyIdToFetch)
                .Select(m => new {
                    id = m.AccountId,
                    riotId = _context.Accounts.Where(a => a.Id == m.AccountId).Select(a => a.RiotId).FirstOrDefault(),
                    evidenceUrl = m.EvidenceUrl, 
                    rank = m.Rank
                }).ToListAsync();

            return Ok(new {
                id = lobby?.Id, lobbyName = lobby?.LobbyName, roundNumber = lobby?.RoundNumber, 
                status = lobby?.Status, hostId = lobby?.HostId, players = playersInLobby
            });
        }

        [Authorize(Roles = "Admin")]
        [HttpGet("pending-approval")]
        public async Task<IActionResult> GetPendingLobbies()
        {
            var pendingLobbies = await _context.MatchLobbies
                .Where(l => l.Status == "PendingAdminApproval")
                .Select(l => new {
                    id = l.Id, lobbyName = l.LobbyName, roundNumber = l.RoundNumber, hostId = l.HostId,
                    players = _context.MatchResults
                        .Where(mr => mr.MatchLobbyId == l.Id)
                        .Select(mr => new {
                            id = mr.AccountId,
                            riotId = _context.Accounts.Where(a => a.Id == mr.AccountId).Select(a => a.RiotId).FirstOrDefault(),
                            evidenceUrl = mr.EvidenceUrl, rank = mr.Rank
                        }).ToList()
                })
                .ToListAsync();

            return Ok(pendingLobbies);
        }

        [Authorize(Roles = "Admin")]
        [HttpPost("shuffle")]
        public async Task<IActionResult> ShuffleLobbies([FromBody] ShuffleRequestDto request)
        {
            try
            {
                if (request.PlayerIds == null || request.PlayerIds.Count == 0)
                    return BadRequest(new { message = "Vui lòng chọn người chơi!" });

                int currentRound = await _context.MatchLobbies
                    .Where(l => l.TournamentId == request.TournamentId)
                    .MaxAsync(l => (int?)l.RoundNumber) ?? 0;
                int nextRound = currentRound + 1;

                var pendingLobbies = await _context.MatchLobbies
                    .Where(l => l.TournamentId == request.TournamentId && l.Status != "Completed" && l.RoundNumber == nextRound)
                    .ToListAsync();
                _context.MatchLobbies.RemoveRange(pendingLobbies);
                await _context.SaveChangesAsync();

                var playersToPlay = await _context.Accounts
                    .Where(a => request.PlayerIds.Contains(a.Id) && a.Role != "Admin")
                    .ToListAsync();

                var shuffled = playersToPlay.OrderBy(x => Guid.NewGuid()).ToList();
                int lobbyCount = (request.StageName == "VÒNG VỚT" || request.StageName == "CHUNG KẾT") ? 1 : (int)Math.Ceiling((double)shuffled.Count / 8);

                for (int i = 0; i < lobbyCount; i++)
                {
                    var lobbyPlayers = shuffled.Skip(i * 8).Take(8).ToList();

                    string lobbyName = "";
                    if (request.StageName == "VÒNG LOẠI") lobbyName = $"VÒNG LOẠI - BẢNG {(char)('A' + i)} - VÁN {nextRound}";
                    else if (request.StageName == "BÁN KẾT") lobbyName = $"BÁN KẾT - BẢNG {i + 1}";
                    else if (request.StageName == "VÒNG VỚT") lobbyName = $"BÁN KẾT - VÒNG VỚT";
                    else if (request.StageName == "CHUNG KẾT") lobbyName = $"CHUNG KẾT";

                    var newLobby = new MatchLobby
                    {
                        TournamentId = request.TournamentId,
                        LobbyName = lobbyName,
                        RoundNumber = nextRound,
                        Status = "Playing",
                        HostId = lobbyPlayers.First().Id
                    };

                    _context.MatchLobbies.Add(newLobby);
                    await _context.SaveChangesAsync();

                    foreach (var p in lobbyPlayers)
                    {
                        _context.MatchResults.Add(new MatchResult { MatchLobbyId = newLobby.Id, AccountId = p.Id, Rank = 0, PointsEarned = 0 });
                    }
                }

                await _context.SaveChangesAsync();

                // GHI LOG ADMIN
                var adminIdShuffle = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (adminIdShuffle != null)
                {
                    _context.AdminAuditLogs.Add(new AdminAuditLog {
                        AdminId = int.Parse(adminIdShuffle),
                        ActionType = "Bốc thăm chia bảng",
                        Description = $"Khởi tạo {request.StageName} với {request.PlayerIds.Count} tuyển thủ",
                        Timestamp = DateTime.Now
                    });
                    await _context.SaveChangesAsync();
                }

                return Ok(new { message = $"Đã khởi tạo {request.StageName} thành công!" });
            }
            catch (Exception ex)
            {
                var innerMsg = ex.InnerException != null ? ex.InnerException.Message : "";
                var logPath = Path.Combine(Directory.GetCurrentDirectory(), "Logs", "shuffle-errors.log");
                var logLine = $"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] {ex.GetType().Name}: {ex.Message} | INNER: {innerMsg}\n{ex.StackTrace}\n";
                await System.IO.File.AppendAllTextAsync(logPath, logLine);
                return StatusCode(500, new { message = $"Lỗi server: {innerMsg}" });
            }
        }
    }

    public class UploadEvidenceDto { public int AccountId { get; set; } public string ImageUrl { get; set; } }
    public class PlayerResultDto { public int AccountId { get; set; } public int Rank { get; set; } }
    public class SubmitResultDto { public int AccountId { get; set; } public int Rank { get; set; } }
    
    public class ShuffleRequestDto {
        public List<int> PlayerIds { get; set; }
        public int TournamentId { get; set; }
        public string StageName { get; set; } 
    }
}
