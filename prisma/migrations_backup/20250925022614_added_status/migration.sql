-- AlterTable
ALTER TABLE "public"."companies" ADD COLUMN     "contactNumber" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "remarks" TEXT;
