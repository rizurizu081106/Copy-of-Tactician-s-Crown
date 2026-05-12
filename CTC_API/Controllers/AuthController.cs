using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using CTC_API.Data;
using CTC_API.Models;
using CTC_API.DTOs;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace CTC_API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;

        public AuthController(AppDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterDto request)
        {
            // Kiểm tra Email hoặc RiotId đã tồn tại chưa
            if (await _context.Accounts.AnyAsync(a => a.Email == request.Email))
                return BadRequest(new { message = "Email này đã được sử dụng!" });

            if (await _context.Accounts.AnyAsync(a => a.RiotId == request.RiotId))
                return BadRequest(new { message = "Riot ID này đã được sử dụng!" });

            // Tạo tài khoản mới (Mặc định là Player nhưng chưa được duyệt)
            var newAccount = new Account
            {
                Email = request.Email,
                RiotId = request.RiotId,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password), // Mã hóa mật khẩu
                Role = "Player", 
                IsApproved = false, // Phải chờ Admin duyệt mới được thi đấu
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now
            };

            _context.Accounts.Add(newAccount);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Đăng ký thành công! Vui lòng chờ Admin phê duyệt." });
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto request)
        {
            var account = await _context.Accounts.FirstOrDefaultAsync(a => a.Email == request.Email);

            // Kiểm tra tài khoản và mật khẩu
            if (account == null || !BCrypt.Net.BCrypt.Verify(request.Password, account.PasswordHash))
            {
                return Unauthorized(new { message = "Email hoặc mật khẩu không chính xác!" });
            }

            if (account.IsDeleted) return Unauthorized(new { message = "Tài khoản đã bị khóa!" });

            // Gói thông tin vào Token (Thẻ căn cước ảo)
            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, account.Id.ToString()),
                new Claim(ClaimTypes.Name, account.RiotId),
                new Claim(ClaimTypes.Email, account.Email),
                new Claim(ClaimTypes.Role, account.Role),
                new Claim("IsApproved", account.IsApproved.ToString())
            };

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]!));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: claims,
                expires: DateTime.Now.AddDays(7), // Token sống 7 ngày
                signingCredentials: creds
            );

            var jwt = new JwtSecurityTokenHandler().WriteToken(token);

            return Ok(new { 
                token = jwt, 
                user = new { id = account.Id, email = account.Email, riotId = account.RiotId, role = account.Role, isApproved = account.IsApproved } 
            });
        }
        // Lấy danh sách Tuyển thủ để Admin chọn (KHÔNG lấy Admin)
        [Authorize(Roles = "Admin")]
        [HttpGet("players")]
        public async Task<IActionResult> GetPlayers()
        {
            var players = await _context.Accounts
                .Where(a => a.Role == "Player" && a.IsDeleted == false)
                .Select(a => new {
                    id = a.Id,
                    riotId = a.RiotId
                })
                .ToListAsync();

            return Ok(players);
        }

        // ==========================================
        // QUẢN LÝ TÀI KHOẢN (Admin only)
        // ==========================================

        // Lấy danh sách tài khoản chờ duyệt
        [Authorize(Roles = "Admin")]
        [HttpGet("pending")]
        public async Task<IActionResult> GetPendingAccounts()
        {
            var pending = await _context.Accounts
                .Where(a => a.IsApproved == false && a.IsDeleted == false)
                .OrderByDescending(a => a.CreatedAt)
                .Select(a => new {
                    id = a.Id,
                    riotId = a.RiotId,
                    email = a.Email,
                    rank = a.Rank,
                    createdAt = a.CreatedAt
                })
                .ToListAsync();

            return Ok(pending);
        }

        // Phê duyệt tài khoản
        [Authorize(Roles = "Admin")]
        [HttpPut("approve/{id}")]
        public async Task<IActionResult> ApproveAccount(int id)
        {
            var account = await _context.Accounts.FindAsync(id);
            if (account == null) return NotFound(new { message = "Không tìm thấy tài khoản!" });

            account.IsApproved = true;
            account.UpdatedAt = DateTime.Now;

            // GHI LOG
            var adminId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            _context.AdminAuditLogs.Add(new AdminAuditLog {
                AdminId = adminId,
                ActionType = "Phê duyệt tài khoản",
                Description = $"Admin {User.Identity?.Name} đã phê duyệt cho {account.RiotId} ({account.Email})",
                Timestamp = DateTime.Now
            });

            await _context.SaveChangesAsync();

            return Ok(new { message = $"Đã phê duyệt tài khoản {account.RiotId}!" });
        }

        // Khóa tài khoản (Soft Delete)
        [Authorize(Roles = "Admin")]
        [HttpPut("ban/{id}")]
        public async Task<IActionResult> BanAccount(int id)
        {
            var account = await _context.Accounts.FindAsync(id);
            if (account == null) return NotFound(new { message = "Không tìm thấy tài khoản!" });

            account.IsDeleted = true;
            account.UpdatedAt = DateTime.Now;

            // GHI LOG
            var adminId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            _context.AdminAuditLogs.Add(new AdminAuditLog {
                AdminId = adminId,
                ActionType = "Khóa tài khoản",
                Description = $"Admin {User.Identity?.Name} đã khóa tài khoản của {account.RiotId} ({account.Email})",
                Timestamp = DateTime.Now
            });

            await _context.SaveChangesAsync();

            return Ok(new { message = $"Đã khóa tài khoản {account.RiotId}!" });
        }

        // Lấy tất cả tài khoản (cho trang quản lý)
        [Authorize(Roles = "Admin")]
        [HttpGet("all")]
        public async Task<IActionResult> GetAllAccounts()
        {
            var accounts = await _context.Accounts
                .Where(a => a.IsDeleted == false)
                .OrderByDescending(a => a.CreatedAt)
                .Select(a => new {
                    id = a.Id,
                    riotId = a.RiotId,
                    email = a.Email,
                    role = a.Role,
                    rank = a.Rank,
                    isApproved = a.IsApproved,
                    createdAt = a.CreatedAt
                })
                .ToListAsync();

            return Ok(accounts);
        }

        // Lấy lịch sử hành động Admin
        [Authorize(Roles = "Admin")]
        [HttpGet("audit-logs")]
        public async Task<IActionResult> GetAuditLogs()
        {
            var logs = await _context.AdminAuditLogs
                .Include(l => l.Admin)
                .OrderByDescending(l => l.Timestamp)
                .Take(100) // Giới hạn 100 bản ghi mới nhất
                .Select(l => new {
                    id = l.Id,
                    adminName = l.Admin.RiotId,
                    actionType = l.ActionType,
                    description = l.Description,
                    timestamp = l.Timestamp
                })
                .ToListAsync();

            return Ok(logs);
        }
    }
}