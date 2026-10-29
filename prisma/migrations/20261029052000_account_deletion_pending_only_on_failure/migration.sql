ALTER TABLE "Professional"
ADD COLUMN "deletionRequestedAt" TIMESTAMP(3);

UPDATE "Professional" AS professional
SET "deletionRequestedAt" = COALESCE(
      professional."deletionPendingAt",
      job."createdAt"
    ),
    "deletionPendingAt" = CASE
      WHEN job."lastErrorCode" IS NULL THEN NULL
      ELSE professional."deletionPendingAt"
    END
FROM "AccountDeletionJob" AS job
WHERE job."professionalId" = professional."id";
