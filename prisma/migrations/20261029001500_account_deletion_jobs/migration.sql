CREATE TYPE "AccountDeletionJobStatus" AS ENUM ('PENDING', 'PROCESSING');

CREATE TABLE "AccountDeletionJob" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "firebaseUid" TEXT NOT NULL,
    "cloudinaryPublicId" TEXT,
    "status" "AccountDeletionJobStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedUntil" TIMESTAMP(3),
    "lastErrorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountDeletionJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AccountDeletionJob_professionalId_key"
ON "AccountDeletionJob"("professionalId");

CREATE UNIQUE INDEX "AccountDeletionJob_firebaseUid_key"
ON "AccountDeletionJob"("firebaseUid");

CREATE INDEX "AccountDeletionJob_status_nextAttemptAt_idx"
ON "AccountDeletionJob"("status", "nextAttemptAt");

CREATE INDEX "AccountDeletionJob_status_lockedUntil_idx"
ON "AccountDeletionJob"("status", "lockedUntil");
