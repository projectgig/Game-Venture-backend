-- CreateEnum
CREATE TYPE "Status" AS ENUM ('ACTIVE', 'BLOCK');

-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "lastLoggedIn" TIMESTAMP(3),
ADD COLUMN     "status" "Status" DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE "CompanyActivity" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "ip" TEXT,
    "device" JSONB,
    "location" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyActivity_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CompanyActivity" ADD CONSTRAINT "CompanyActivity_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
