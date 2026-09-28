-- CreateIndex
CREATE UNIQUE INDEX "Build_applicationId_number_key" ON "Build"("applicationId", "number");

-- CreateIndex
CREATE INDEX "Build_storageConnectionId_storageObjectKey_idx" ON "Build"("storageConnectionId", "storageObjectKey");
