using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace CTC_API.Models
{
#nullable enable
    public class MatchLobby : BaseEntity
    {
        public int TournamentId { get; set; }
        public Tournament Tournament { get; set; } = null!;

        [Required]
        [MaxLength(50)]
        public string LobbyName { get; set; } = string.Empty; // Ví dụ: Lobby 1

        public int RoundNumber { get; set; }

        // Trạng thái: Playing, WaitingVote, Disputed (Đóng băng/Tranh chấp), Completed
        public string Status { get; set; } = "Playing"; 

        // Ai là Host phòng này (Người chịu trách nhiệm báo cáo kết quả)
        public int HostId { get; set; }
        
        [ForeignKey("HostId")]
        public Account Host { get; set; } = null!;

        [JsonIgnore]
        public ICollection<MatchEvidence> Evidences { get; set; } = new List<MatchEvidence>();
        public ICollection<MatchResult>? MatchResults { get; set; }
    }
#nullable disable
}
