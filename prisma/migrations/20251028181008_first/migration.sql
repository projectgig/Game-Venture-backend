-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'SUB_DISTRIBUTOR', 'STORE', 'PLAYER');

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "contactNumber" TEXT,
    "remarks" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "role" "Role" NOT NULL DEFAULT 'PLAYER',
    "parentId" TEXT,
    "rechargePerm" BOOLEAN NOT NULL DEFAULT false,
    "withdrawPerm" BOOLEAN NOT NULL DEFAULT false,
    "agentProtect" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "companies_username_key" ON "companies"("username");

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
