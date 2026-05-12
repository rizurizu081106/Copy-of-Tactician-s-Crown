using System;

namespace CTC_API.Models
{
    public abstract class BaseEntity
    {
        public int Id { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
        
        // CƠ CHẾ XÓA MỀM (Soft Delete) theo đúng đặc tả SRS
        public bool IsDeleted { get; set; } = false; 
    }
}