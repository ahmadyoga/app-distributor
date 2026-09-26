-- CreateEnum
CREATE TYPE "CommentStatus" AS ENUM ('PENDING', 'POSTED', 'FAILED');

-- AlterTable
ALTER TABLE "BuildTicket"
  ADD COLUMN "commentStatus" "CommentStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "commentError" TEXT;
