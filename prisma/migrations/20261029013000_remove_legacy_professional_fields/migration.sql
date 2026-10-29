DROP INDEX "Professional_mpSubscriptionId_idx";

ALTER TABLE "Professional"
DROP COLUMN "mpSubscriptionId",
DROP COLUMN "passwordHash";
