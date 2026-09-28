-- CreateIndex
CREATE INDEX "Build_applicationId_createdAt_idx" ON "Build"("applicationId", "createdAt");

-- CreateIndex
CREATE INDEX "Build_createdAt_idx" ON "Build"("createdAt");

-- CreateIndex
CREATE INDEX "Build_status_createdAt_idx" ON "Build"("status", "createdAt");
