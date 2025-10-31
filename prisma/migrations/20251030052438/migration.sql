/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `companies` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "email" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "companies_email_key" ON "companies"("email");
