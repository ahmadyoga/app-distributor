-- Remove githubIssue column from Build
ALTER TABLE "Build" DROP COLUMN IF EXISTS "githubIssue";

-- CreateTable BuildTicket
CREATE TABLE "BuildTicket" (
    "id" TEXT NOT NULL,
    "buildId" TEXT NOT NULL,
    "repo" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "htmlUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BuildTicket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BuildTicket_buildId_repo_number_key" ON "BuildTicket"("buildId", "repo", "number");

-- AddForeignKey
ALTER TABLE "BuildTicket" ADD CONSTRAINT "BuildTicket_buildId_fkey" FOREIGN KEY ("buildId") REFERENCES "Build"("id") ON DELETE CASCADE ON UPDATE CASCADE;
