-- CreateEnum
CREATE TYPE "Environment" AS ENUM ('PRODUCTION', 'STAGING');

-- DropIndex
DROP INDEX "Build_applicationId_number_key";

-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "environment" "Environment" NOT NULL DEFAULT 'PRODUCTION';

-- AlterTable
ALTER TABLE "Build" ADD COLUMN     "hasInspector" BOOLEAN NOT NULL DEFAULT false;
