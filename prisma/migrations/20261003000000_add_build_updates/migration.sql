-- CreateTable
CREATE TABLE "BuildUpdate" (
    "id" TEXT NOT NULL,
    "buildId" TEXT NOT NULL,
    "note" TEXT,
    "apkFileName" TEXT NOT NULL,
    "apkSizeBytes" BIGINT NOT NULL,
    "previousApkFileName" TEXT,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BuildUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BuildUpdate_buildId_createdAt_idx" ON "BuildUpdate"("buildId", "createdAt");

-- AddForeignKey
ALTER TABLE "BuildUpdate" ADD CONSTRAINT "BuildUpdate_buildId_fkey" FOREIGN KEY ("buildId") REFERENCES "Build"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildUpdate" ADD CONSTRAINT "BuildUpdate_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
