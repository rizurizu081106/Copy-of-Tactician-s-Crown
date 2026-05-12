using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
namespace CTC_API.Models
{
    public class MatchEvidence
    {
        [Key]
        public int Id { get; set; }

        [ForeignKey("MatchLobby")]
        public int MatchLobbyId { get; set; }
        public MatchLobby MatchLobby { get; set; }

        [ForeignKey("Account")]
        public int UploadedById { get; set; } // ID của Player up ảnh
        public Account UploadedBy { get; set; }

        [Required]
        public string ImageUrl { get; set; } = string.Empty; // Đường dẫn ảnh minh chứng

        public DateTime UploadedAt { get; set; } = DateTime.Now;
    }
}