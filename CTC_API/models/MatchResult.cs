using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using System.ComponentModel.DataAnnotations.Schema;

namespace CTC_API.Models
{
    // Đảm bảo BaseEntity đã có Id, CreatedAt, UpdatedAt, IsDeleted
#nullable enable
    public class MatchResult : BaseEntity 
    {
        public int MatchLobbyId { get; set; }
        [JsonIgnore]
        public MatchLobby MatchLobby { get; set; } = null!; 

        public int AccountId { get; set; }
        [ForeignKey("AccountId")]
        [JsonIgnore]
        public Account Player { get; set; } = null!;
        
        [JsonIgnore]
        public Account Account { get; set; } = null!; 

        public int PointsEarned { get; set; }
        public int Rank { get; set; }
        public string? EvidenceUrl { get; set; }
    }
#nullable disable
}
