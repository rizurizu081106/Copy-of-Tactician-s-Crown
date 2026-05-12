using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization; // Để tránh lỗi vòng lặp JSON sau này

namespace CTC_API.Models
{
    // Đảm bảo file BaseEntity của bạn ĐÃ CÓ: Id, CreatedAt, UpdatedAt, IsDeleted nhé!
    public class Account : BaseEntity
    {
        [Required]
        [MaxLength(100)]
        public string RiotId { get; set; } = string.Empty; // Ví dụ: Kudo#VN1

        [Required]
        [EmailAddress(ErrorMessage = "Định dạng Email không hợp lệ")] // Bắt buộc phải đúng chuẩn @...
        [MaxLength(150)]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string PasswordHash { get; set; } = string.Empty;

        [MaxLength(20)]
        public string Role { get; set; } = "Player"; // Player, Admin, Host (Referee)
        
        [MaxLength(50)]
        public string Rank { get; set; } = "Unranked";
        
        // Phê duyệt tài khoản từ Admin (Chống spam clone đăng ký ảo)
        public bool IsApproved { get; set; } = false; 

        // ==========================================
        // VÙNG QUAN TRỌNG: CÁC MỐI QUAN HỆ (NAVIGATION PROPERTIES)
        // Bắt buộc phải có để Entity Framework biết cách nối bảng (JOIN)
        // ==========================================
        
        [JsonIgnore] // Bỏ qua khi trả API về React để tránh lỗi vòng lặp vô tận
        public ICollection<MatchResult> MatchResults { get; set; }

        [JsonIgnore]
        public ICollection<MatchEvidence> MatchEvidences { get; set; }

        [JsonIgnore]
        public ICollection<AdminAuditLog> AdminAuditLogs { get; set; }
    }
}