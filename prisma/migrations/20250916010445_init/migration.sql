-- CreateEnum
CREATE TYPE "public"."FriendRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."GameInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('FRIEND_REQUEST', 'FRIEND_REQUEST_ACCEPTED', 'FRIEND_REQUEST_DECLINED', 'MESSAGE', 'GAME_INVITE', 'SYSTEM');

-- CreateEnum
CREATE TYPE "public"."GameVariantEnum" AS ENUM ('AMERICAN', 'BRAZILIAN', 'INTERNATIONAL');

-- CreateEnum
CREATE TYPE "public"."PlayModeEnum" AS ENUM ('CASUAL', 'TOURNAMENT');

-- CreateEnum
CREATE TYPE "public"."TournamentStatus" AS ENUM ('REGISTRATION', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."TournamentFormat" AS ENUM ('SWISS', 'ROUND_ROBIN', 'ELIMINATION', 'DOUBLE_ELIMINATION');

-- CreateTable
CREATE TABLE "public"."Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "username" TEXT NOT NULL,
    "password" TEXT,
    "name" TEXT,
    "image" TEXT,
    "avatarKey" TEXT,
    "lastActive" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "public"."PasswordResetToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Friendship" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Friendship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FriendRequest" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "status" "public"."FriendRequestStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FriendRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Block" (
    "id" TEXT NOT NULL,
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Block_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Message" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GameInvite" (
    "id" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "inviteeId" TEXT,
    "inviteToken" TEXT NOT NULL,
    "gameId" TEXT,
    "status" "public"."GameInviteStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "gameMode" TEXT NOT NULL DEFAULT 'online',
    "variant" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "public"."NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "metadata" TEXT,
    "relatedEntityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Game" (
    "id" TEXT NOT NULL,
    "board" TEXT NOT NULL,
    "currentPlayer" TEXT NOT NULL,
    "moveCount" INTEGER NOT NULL DEFAULT 0,
    "gameMode" TEXT NOT NULL,
    "gameStartTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSaved" TIMESTAMP(3) NOT NULL,
    "winner" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "syncMetadata" TEXT,
    "player1Id" TEXT,
    "player2Id" TEXT,
    "variant" "public"."GameVariantEnum",
    "playMode" "public"."PlayModeEnum",
    "boardSize" INTEGER,
    "gameConfig" TEXT,
    "timeControl" TEXT,
    "timeRemaining" TEXT,
    "notation" TEXT,
    "tournamentId" TEXT,
    "roundNumber" INTEGER,
    "tableNumber" INTEGER,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GameMove" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "moveIndex" INTEGER NOT NULL,
    "fromRow" INTEGER NOT NULL,
    "fromCol" INTEGER NOT NULL,
    "toRow" INTEGER NOT NULL,
    "toCol" INTEGER NOT NULL,
    "captures" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameMove_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GameEvent" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventData" TEXT NOT NULL,
    "tabId" TEXT,
    "userId" TEXT,
    "gameVersion" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GameNotes" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameNotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlayerRating" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "variant" "public"."GameVariantEnum" NOT NULL,
    "playMode" "public"."PlayModeEnum" NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 1200,
    "gamesPlayed" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "draws" INTEGER NOT NULL DEFAULT 0,
    "provisional" BOOLEAN NOT NULL DEFAULT true,
    "lastGameDate" TIMESTAMP(3),
    "peakRating" INTEGER NOT NULL DEFAULT 1200,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerRating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Tournament" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "variant" "public"."GameVariantEnum" NOT NULL,
    "timeControl" TEXT NOT NULL,
    "maxPlayers" INTEGER NOT NULL,
    "currentPlayers" INTEGER NOT NULL DEFAULT 0,
    "status" "public"."TournamentStatus" NOT NULL DEFAULT 'REGISTRATION',
    "format" "public"."TournamentFormat" NOT NULL DEFAULT 'SWISS',
    "rounds" INTEGER NOT NULL DEFAULT 3,
    "currentRound" INTEGER NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "registrationEnd" TIMESTAMP(3),
    "prize" TEXT,
    "creatorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tournament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TournamentEntry" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tiebreak1" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tiebreak2" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "withdrawn" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TournamentEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "public"."Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "public"."Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "public"."Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "public"."Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "public"."User"("username");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "User_username_idx" ON "public"."User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "public"."VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "public"."VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "public"."PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "public"."PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "Friendship_senderId_idx" ON "public"."Friendship"("senderId");

-- CreateIndex
CREATE INDEX "Friendship_receiverId_idx" ON "public"."Friendship"("receiverId");

-- CreateIndex
CREATE UNIQUE INDEX "Friendship_senderId_receiverId_key" ON "public"."Friendship"("senderId", "receiverId");

-- CreateIndex
CREATE INDEX "FriendRequest_receiverId_status_idx" ON "public"."FriendRequest"("receiverId", "status");

-- CreateIndex
CREATE INDEX "FriendRequest_senderId_idx" ON "public"."FriendRequest"("senderId");

-- CreateIndex
CREATE UNIQUE INDEX "FriendRequest_senderId_receiverId_key" ON "public"."FriendRequest"("senderId", "receiverId");

-- CreateIndex
CREATE INDEX "Block_blockerId_idx" ON "public"."Block"("blockerId");

-- CreateIndex
CREATE INDEX "Block_blockedId_idx" ON "public"."Block"("blockedId");

-- CreateIndex
CREATE UNIQUE INDEX "Block_blockerId_blockedId_key" ON "public"."Block"("blockerId", "blockedId");

-- CreateIndex
CREATE INDEX "Message_senderId_idx" ON "public"."Message"("senderId");

-- CreateIndex
CREATE INDEX "Message_receiverId_idx" ON "public"."Message"("receiverId");

-- CreateIndex
CREATE INDEX "Message_createdAt_idx" ON "public"."Message"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GameInvite_inviteToken_key" ON "public"."GameInvite"("inviteToken");

-- CreateIndex
CREATE INDEX "GameInvite_inviterId_idx" ON "public"."GameInvite"("inviterId");

-- CreateIndex
CREATE INDEX "GameInvite_inviteeId_idx" ON "public"."GameInvite"("inviteeId");

-- CreateIndex
CREATE INDEX "GameInvite_inviteToken_idx" ON "public"."GameInvite"("inviteToken");

-- CreateIndex
CREATE INDEX "GameInvite_status_idx" ON "public"."GameInvite"("status");

-- CreateIndex
CREATE INDEX "GameInvite_expiresAt_idx" ON "public"."GameInvite"("expiresAt");

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "public"."Notification"("userId", "read");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "public"."Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Game_lastSaved_idx" ON "public"."Game"("lastSaved");

-- CreateIndex
CREATE INDEX "Game_player1Id_idx" ON "public"."Game"("player1Id");

-- CreateIndex
CREATE INDEX "Game_player2Id_idx" ON "public"."Game"("player2Id");

-- CreateIndex
CREATE INDEX "Game_version_idx" ON "public"."Game"("version");

-- CreateIndex
CREATE INDEX "Game_variant_idx" ON "public"."Game"("variant");

-- CreateIndex
CREATE INDEX "Game_playMode_idx" ON "public"."Game"("playMode");

-- CreateIndex
CREATE INDEX "Game_tournamentId_idx" ON "public"."Game"("tournamentId");

-- CreateIndex
CREATE INDEX "GameMove_gameId_idx" ON "public"."GameMove"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX "GameMove_gameId_moveIndex_key" ON "public"."GameMove"("gameId", "moveIndex");

-- CreateIndex
CREATE INDEX "GameEvent_gameId_createdAt_idx" ON "public"."GameEvent"("gameId", "createdAt");

-- CreateIndex
CREATE INDEX "GameEvent_eventType_idx" ON "public"."GameEvent"("eventType");

-- CreateIndex
CREATE INDEX "GameEvent_createdAt_idx" ON "public"."GameEvent"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GameNotes_gameId_key" ON "public"."GameNotes"("gameId");

-- CreateIndex
CREATE INDEX "GameNotes_gameId_idx" ON "public"."GameNotes"("gameId");

-- CreateIndex
CREATE INDEX "PlayerRating_variant_playMode_rating_idx" ON "public"."PlayerRating"("variant", "playMode", "rating");

-- CreateIndex
CREATE INDEX "PlayerRating_userId_idx" ON "public"."PlayerRating"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerRating_userId_variant_playMode_key" ON "public"."PlayerRating"("userId", "variant", "playMode");

-- CreateIndex
CREATE INDEX "Tournament_status_idx" ON "public"."Tournament"("status");

-- CreateIndex
CREATE INDEX "Tournament_variant_idx" ON "public"."Tournament"("variant");

-- CreateIndex
CREATE INDEX "Tournament_creatorId_idx" ON "public"."Tournament"("creatorId");

-- CreateIndex
CREATE INDEX "Tournament_startDate_idx" ON "public"."Tournament"("startDate");

-- CreateIndex
CREATE INDEX "TournamentEntry_tournamentId_score_idx" ON "public"."TournamentEntry"("tournamentId", "score");

-- CreateIndex
CREATE INDEX "TournamentEntry_userId_idx" ON "public"."TournamentEntry"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentEntry_tournamentId_userId_key" ON "public"."TournamentEntry"("tournamentId", "userId");

-- AddForeignKey
ALTER TABLE "public"."Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Friendship" ADD CONSTRAINT "Friendship_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Friendship" ADD CONSTRAINT "Friendship_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FriendRequest" ADD CONSTRAINT "FriendRequest_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FriendRequest" ADD CONSTRAINT "FriendRequest_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Block" ADD CONSTRAINT "Block_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Block" ADD CONSTRAINT "Block_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Message" ADD CONSTRAINT "Message_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GameInvite" ADD CONSTRAINT "GameInvite_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GameInvite" ADD CONSTRAINT "GameInvite_inviteeId_fkey" FOREIGN KEY ("inviteeId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GameInvite" ADD CONSTRAINT "GameInvite_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "public"."Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Game" ADD CONSTRAINT "Game_player1Id_fkey" FOREIGN KEY ("player1Id") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Game" ADD CONSTRAINT "Game_player2Id_fkey" FOREIGN KEY ("player2Id") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Game" ADD CONSTRAINT "Game_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "public"."Tournament"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GameMove" ADD CONSTRAINT "GameMove_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "public"."Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GameEvent" ADD CONSTRAINT "GameEvent_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "public"."Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GameEvent" ADD CONSTRAINT "GameEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GameNotes" ADD CONSTRAINT "GameNotes_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "public"."Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerRating" ADD CONSTRAINT "PlayerRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Tournament" ADD CONSTRAINT "Tournament_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TournamentEntry" ADD CONSTRAINT "TournamentEntry_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "public"."Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TournamentEntry" ADD CONSTRAINT "TournamentEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
