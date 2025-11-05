-- CreateEnum
CREATE TYPE "GameType" AS ENUM ('BLACKJACK', 'POKER', 'ROULETTE', 'OTHER');

-- CreateEnum
CREATE TYPE "GameResult" AS ENUM ('WIN', 'LOSS', 'DRAW', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GameControlMode" AS ENUM ('FAIR', 'CONTROLLED');

-- CreateEnum
CREATE TYPE "LedgerType" AS ENUM ('RECHARGE', 'WITHDRAW', 'BET', 'WIN', 'COMMISSION', 'ADJUSTMENT');

-- CreateTable
CREATE TABLE "CompanyConfig" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "winRate" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "maxBetLimit" DECIMAL(65,30) NOT NULL DEFAULT 1000,
    "minBetLimit" DECIMAL(65,30) NOT NULL DEFAULT 1,
    "gameControlMode" "GameControlMode" NOT NULL DEFAULT 'FAIR',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameSession" (
    "id" TEXT NOT NULL,
    "gameType" "GameType" NOT NULL,
    "playerId" TEXT NOT NULL,
    "storeId" TEXT,
    "betAmount" DECIMAL(65,30) NOT NULL,
    "winAmount" DECIMAL(65,30) DEFAULT 0,
    "result" "GameResult" NOT NULL,
    "playedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "balance" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ledger" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "type" "LedgerType" NOT NULL,
    "referenceId" TEXT,
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "targetId" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompanyConfig_companyId_key" ON "CompanyConfig"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_companyId_key" ON "Wallet"("companyId");

-- CreateIndex
CREATE INDEX "Ledger_companyId_createdAt_idx" ON "Ledger"("companyId", "createdAt");

-- AddForeignKey
ALTER TABLE "CompanyConfig" ADD CONSTRAINT "CompanyConfig_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ledger" ADD CONSTRAINT "Ledger_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
