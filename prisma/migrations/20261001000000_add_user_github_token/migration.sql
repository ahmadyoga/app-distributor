-- AlterTable
ALTER TABLE "User" ADD COLUMN "githubTokenEncrypted" TEXT,
ADD COLUMN "githubLogin" TEXT,
ADD COLUMN "githubTokenSetAt" TIMESTAMP(3);
