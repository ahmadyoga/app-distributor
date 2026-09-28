-- AlterTable
ALTER TABLE "Application" DROP COLUMN "environment";

-- AlterTable
ALTER TABLE "Build" ADD COLUMN     "environment" "Environment" NOT NULL DEFAULT 'PRODUCTION';
