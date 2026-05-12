using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CTC_API.Migrations
{
    /// <inheritdoc />
    public partial class AddEvidenceUrlToMatchResult : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "EvidenceUrl",
                table: "MatchResults",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "EvidenceUrl",
                table: "MatchResults");
        }
    }
}
