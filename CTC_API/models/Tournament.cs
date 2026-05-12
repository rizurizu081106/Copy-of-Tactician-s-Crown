#nullable enable 
using System.ComponentModel.DataAnnotations;

namespace CTC_API.Models
{
    public class Tournament : BaseEntity
    {
        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = string.Empty;

        // Trạng thái: Upcoming, Ongoing, Completed
        public string Status { get; set; } = "Active"; 

        // Các thông số cấu hình mềm
        public int CheckmateThreshold { get; set; } = 20;
        public int AdvanceCount { get; set; } = 8;
        public string? WinnerRiotId { get; set; }
    }
}