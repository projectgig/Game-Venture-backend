-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('ADMIN', 'SUB_DISTRIBUTOR', 'STORE', 'PLAYER');

-- AlterTable
ALTER TABLE "public"."companies" ADD COLUMN     "agentProtect" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parentId" TEXT,
ADD COLUMN     "rechargePerm" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "role" "public"."Role" NOT NULL DEFAULT 'PLAYER',
ADD COLUMN     "withdrawPerm" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "public"."companies" ADD CONSTRAINT "companies_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
