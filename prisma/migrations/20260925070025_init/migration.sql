-- CreateEnum
CREATE TYPE "Role" AS ENUM ('PUBLISHER', 'VIEWER');

-- CreateEnum
CREATE TYPE "StorageProvider" AS ENUM ('GOOGLE_DRIVE', 'S3_COMPATIBLE');

-- CreateEnum
CREATE TYPE "BuildStatus" AS ENUM ('PROCESSING', 'PUBLISHED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'PUBLISHER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'Android, APK',
    "initials" TEXT NOT NULL,
    "defaultStorageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StorageConnection" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" "StorageProvider" NOT NULL,
    "accountLabel" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "encryptedCredentials" TEXT NOT NULL,
    "usedBytesApprox" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StorageConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Build" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "githubIssue" TEXT,
    "releaseNotes" TEXT,
    "developerId" TEXT NOT NULL,
    "status" "BuildStatus" NOT NULL DEFAULT 'PROCESSING',
    "storageConnectionId" TEXT,
    "storageObjectKey" TEXT,
    "apkFileName" TEXT,
    "apkSizeBytes" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Build_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Application_slug_key" ON "Application"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Build_applicationId_number_key" ON "Build"("applicationId", "number");

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_defaultStorageId_fkey" FOREIGN KEY ("defaultStorageId") REFERENCES "StorageConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Build" ADD CONSTRAINT "Build_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Build" ADD CONSTRAINT "Build_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Build" ADD CONSTRAINT "Build_storageConnectionId_fkey" FOREIGN KEY ("storageConnectionId") REFERENCES "StorageConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
