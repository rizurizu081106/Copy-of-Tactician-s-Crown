using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CTC_API.Migrations
{
    /// <inheritdoc />
    public partial class RemoveDuplicatePlayerProperty : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_AdminAuditLog_Accounts_AdminId",
                table: "AdminAuditLog");

            migrationBuilder.DropForeignKey(
                name: "FK_MatchEvidence_Accounts_UploadedById",
                table: "MatchEvidence");

            migrationBuilder.DropForeignKey(
                name: "FK_MatchEvidence_MatchLobbies_MatchLobbyId",
                table: "MatchEvidence");

            migrationBuilder.DropForeignKey(
                name: "FK_MatchResults_Accounts_PlayerId",
                table: "MatchResults");

            migrationBuilder.DropIndex(
                name: "IX_MatchResults_PlayerId",
                table: "MatchResults");

            migrationBuilder.DropPrimaryKey(
                name: "PK_MatchEvidence",
                table: "MatchEvidence");

            migrationBuilder.DropPrimaryKey(
                name: "PK_AdminAuditLog",
                table: "AdminAuditLog");

            migrationBuilder.DropColumn(
                name: "PlayerId",
                table: "MatchResults");

            migrationBuilder.RenameTable(
                name: "MatchEvidence",
                newName: "MatchEvidences");

            migrationBuilder.RenameTable(
                name: "AdminAuditLog",
                newName: "AdminAuditLogs");

            migrationBuilder.RenameIndex(
                name: "IX_MatchEvidence_UploadedById",
                table: "MatchEvidences",
                newName: "IX_MatchEvidences_UploadedById");

            migrationBuilder.RenameIndex(
                name: "IX_MatchEvidence_MatchLobbyId",
                table: "MatchEvidences",
                newName: "IX_MatchEvidences_MatchLobbyId");

            migrationBuilder.RenameIndex(
                name: "IX_AdminAuditLog_AdminId",
                table: "AdminAuditLogs",
                newName: "IX_AdminAuditLogs_AdminId");

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "Tournaments",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "MatchLobbies",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AddPrimaryKey(
                name: "PK_MatchEvidences",
                table: "MatchEvidences",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_AdminAuditLogs",
                table: "AdminAuditLogs",
                column: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_AdminAuditLogs_Accounts_AdminId",
                table: "AdminAuditLogs",
                column: "AdminId",
                principalTable: "Accounts",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_MatchEvidences_Accounts_UploadedById",
                table: "MatchEvidences",
                column: "UploadedById",
                principalTable: "Accounts",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_MatchEvidences_MatchLobbies_MatchLobbyId",
                table: "MatchEvidences",
                column: "MatchLobbyId",
                principalTable: "MatchLobbies",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_AdminAuditLogs_Accounts_AdminId",
                table: "AdminAuditLogs");

            migrationBuilder.DropForeignKey(
                name: "FK_MatchEvidences_Accounts_UploadedById",
                table: "MatchEvidences");

            migrationBuilder.DropForeignKey(
                name: "FK_MatchEvidences_MatchLobbies_MatchLobbyId",
                table: "MatchEvidences");

            migrationBuilder.DropPrimaryKey(
                name: "PK_MatchEvidences",
                table: "MatchEvidences");

            migrationBuilder.DropPrimaryKey(
                name: "PK_AdminAuditLogs",
                table: "AdminAuditLogs");

            migrationBuilder.RenameTable(
                name: "MatchEvidences",
                newName: "MatchEvidence");

            migrationBuilder.RenameTable(
                name: "AdminAuditLogs",
                newName: "AdminAuditLog");

            migrationBuilder.RenameIndex(
                name: "IX_MatchEvidences_UploadedById",
                table: "MatchEvidence",
                newName: "IX_MatchEvidence_UploadedById");

            migrationBuilder.RenameIndex(
                name: "IX_MatchEvidences_MatchLobbyId",
                table: "MatchEvidence",
                newName: "IX_MatchEvidence_MatchLobbyId");

            migrationBuilder.RenameIndex(
                name: "IX_AdminAuditLogs_AdminId",
                table: "AdminAuditLog",
                newName: "IX_AdminAuditLog_AdminId");

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "Tournaments",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AddColumn<int>(
                name: "PlayerId",
                table: "MatchResults",
                type: "int",
                nullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "MatchLobbies",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AddPrimaryKey(
                name: "PK_MatchEvidence",
                table: "MatchEvidence",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_AdminAuditLog",
                table: "AdminAuditLog",
                column: "Id");

            migrationBuilder.CreateIndex(
                name: "IX_MatchResults_PlayerId",
                table: "MatchResults",
                column: "PlayerId");

            migrationBuilder.AddForeignKey(
                name: "FK_AdminAuditLog_Accounts_AdminId",
                table: "AdminAuditLog",
                column: "AdminId",
                principalTable: "Accounts",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_MatchEvidence_Accounts_UploadedById",
                table: "MatchEvidence",
                column: "UploadedById",
                principalTable: "Accounts",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_MatchEvidence_MatchLobbies_MatchLobbyId",
                table: "MatchEvidence",
                column: "MatchLobbyId",
                principalTable: "MatchLobbies",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_MatchResults_Accounts_PlayerId",
                table: "MatchResults",
                column: "PlayerId",
                principalTable: "Accounts",
                principalColumn: "Id");
        }
    }
}
