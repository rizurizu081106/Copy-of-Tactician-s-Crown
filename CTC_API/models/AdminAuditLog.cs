using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
namespace CTC_API.Models
{
    public class AdminAuditLog
    {
       [Key]
        public int Id { get; set; }

        [ForeignKey("Account")]
        public int AdminId { get; set; }
        public Account Admin { get; set; }

       [Required]
        public string ActionType { get; set; } = string.Empty; // Ví dụ: "Duyệt kết quả", "Sửa điểm", "Khóa tài khoản"

        public string Description { get; set; } = string.Empty; // Chi tiết hành động

        public DateTime Timestamp { get; set; } = DateTime.Now;
    }
}