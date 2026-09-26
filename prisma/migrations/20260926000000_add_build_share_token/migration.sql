-- AlterTable
ALTER TABLE "Build" ADD COLUMN "shareToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Build_shareToken_key" ON "Build"("shareToken");
