using CTC_API.Models;
using Microsoft.EntityFrameworkCore;

namespace CTC_API.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        // Khai báo các bảng sẽ có trong Database
        public DbSet<Account> Accounts { get; set; }= null!;
        public DbSet<Tournament> Tournaments { get; set; }= null!;
        public DbSet<MatchLobby> MatchLobbies { get; set; }= null!;
        public DbSet<MatchResult> MatchResults { get; set; }= null!;
        public DbSet<AdminAuditLog> AdminAuditLogs { get; set; } = null!;
        public DbSet<MatchEvidence> MatchEvidences { get; set; } = null!;
        
        protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // 1. Chặn xóa dây chuyền (Cascade Delete) cho bảng MatchEvidence
        modelBuilder.Entity<MatchEvidence>()
            .HasOne(m => m.MatchLobby)
            .WithMany(l => l.Evidences)
            .HasForeignKey(m => m.MatchLobbyId)
            .OnDelete(DeleteBehavior.Restrict); // <--- CHỐT CHẶN Ở ĐÂY

        modelBuilder.Entity<MatchEvidence>()
            .HasOne(m => m.UploadedBy)
            .WithMany(a => a.MatchEvidences)
            .HasForeignKey(m => m.UploadedById)
            .OnDelete(DeleteBehavior.Restrict);

        // 2. Chặn xóa dây chuyền cho bảng AdminAuditLog
        modelBuilder.Entity<AdminAuditLog>()
            .HasOne(a => a.Admin)
            .WithMany(acc => acc.AdminAuditLogs)
            .HasForeignKey(a => a.AdminId)
            .OnDelete(DeleteBehavior.Restrict);
            
        // 3. Chặn xóa dây chuyền cho bảng MatchResult (Nếu trước đó chưa làm)
        modelBuilder.Entity<MatchResult>()
            .HasOne(m => m.Account)
            .WithMany(a => a.MatchResults)
            .HasForeignKey(m => m.AccountId)
            .OnDelete(DeleteBehavior.Restrict);
    }
    }
}