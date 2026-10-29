import "server-only";

import { v2 as cloudinary } from "cloudinary";
import { getFirebaseAdminAuth } from "@/lib/firebase-admin-auth";
import { getPrismaClient } from "@/lib/prisma";
import { getAccountDeletionRetryDelayMs } from "@/lib/account-deletion-retry";
import {
  getAccountDeletionErrorDetails,
  logAccountDeletionEvent,
} from "@/lib/account-deletion-logger";

const jobLeaseMs = 5 * 60 * 1000;
const deletionBatchSize = 5;

async function removeFirebaseUser(firebaseUid: string): Promise<void> {
  try {
    await getFirebaseAdminAuth().deleteUser(firebaseUid);
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "auth/user-not-found"
    ) {
      return;
    }
    throw error;
  }
}

async function removeCloudinaryImage(publicId: string | null): Promise<void> {
  if (!publicId) return;

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("CLOUDINARY_CREDENTIALS_NOT_CONFIGURED");
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
  const result = await cloudinary.uploader.destroy(publicId, {
    resource_type: "image",
    invalidate: true,
  });
  if (result.result !== "ok" && result.result !== "not found") {
    throw new Error("CLOUDINARY_PROFILE_IMAGE_DELETION_FAILED");
  }
}

async function deleteDatabaseRecords(
  professionalId: string,
  jobId: string,
): Promise<void> {
  const prisma = getPrismaClient();
  await prisma.$transaction(async (transaction) => {
    await transaction.adminAuditLog.deleteMany({
      where: { actorProfessionalId: professionalId },
    });
    await transaction.transaction.deleteMany({ where: { professionalId } });
    await transaction.appointment.deleteMany({ where: { professionalId } });
    await transaction.client.deleteMany({ where: { professionalId } });
    await transaction.service.deleteMany({ where: { professionalId } });
    await transaction.workingHours.deleteMany({ where: { professionalId } });
    await transaction.calendarBlock.deleteMany({ where: { professionalId } });
    await transaction.subscriptionPayment.deleteMany({
      where: { professionalId },
    });
    await transaction.professional.deleteMany({ where: { id: professionalId } });
    await transaction.accountDeletionJob.deleteMany({ where: { id: jobId } });
  });
}

type AccountDeletionResult = "completed" | "failed" | "already_processing";

async function processJob(
  jobId: string,
  now: Date,
): Promise<AccountDeletionResult> {
  const prisma = getPrismaClient();
  let claim;
  try {
    claim = await prisma.accountDeletionJob.updateMany({
      where: {
        id: jobId,
        OR: [
          { status: "PENDING", nextAttemptAt: { lte: now } },
          { status: "PROCESSING", lockedUntil: { lte: now } },
        ],
      },
      data: {
        status: "PROCESSING",
        lockedUntil: new Date(now.getTime() + jobLeaseMs),
        attempts: { increment: 1 },
      },
    });
  } catch (error) {
    logAccountDeletionEvent("job.claim_failed", {
      outcome: "failed",
      stage: "job_claim",
      correlationId: jobId,
      ...getAccountDeletionErrorDetails(error),
    });
    throw error;
  }
  if (claim.count !== 1) {
    logAccountDeletionEvent("job.claim_skipped", {
      outcome: "skipped",
      stage: "job_claim",
      correlationId: jobId,
      code: "JOB_NOT_CLAIMABLE",
    });
    return "already_processing";
  }

  let job;
  try {
    job = await prisma.accountDeletionJob.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        professionalId: true,
        firebaseUid: true,
        cloudinaryPublicId: true,
        attempts: true,
      },
    });
  } catch (error) {
    logAccountDeletionEvent("job.load_failed", {
      outcome: "failed",
      stage: "job_lookup",
      correlationId: jobId,
      ...getAccountDeletionErrorDetails(error),
    });
    throw error;
  }
  if (!job) {
    const error = new Error("Claimed account deletion job was not found.");
    logAccountDeletionEvent("job.load_failed", {
      outcome: "failed",
      stage: "job_lookup",
      correlationId: jobId,
      ...getAccountDeletionErrorDetails(error),
    });
    throw error;
  }

  logAccountDeletionEvent("job.started", {
    outcome: "started",
    stage: "external_deletions",
    correlationId: job.id,
    attempt: job.attempts,
  });

  let stage = "firebase_user_deletion";
  try {
    await removeFirebaseUser(job.firebaseUid);
    logAccountDeletionEvent("stage.completed", {
      outcome: "success",
      stage,
      correlationId: job.id,
      attempt: job.attempts,
    });

    stage = "cloudinary_image_deletion";
    await removeCloudinaryImage(job.cloudinaryPublicId);
    logAccountDeletionEvent("stage.completed", {
      outcome: "success",
      stage,
      correlationId: job.id,
      attempt: job.attempts,
    });

    stage = "database_record_deletion";
    await deleteDatabaseRecords(job.professionalId, job.id);
    logAccountDeletionEvent("stage.completed", {
      outcome: "success",
      stage,
      correlationId: job.id,
      attempt: job.attempts,
    });
    logAccountDeletionEvent("job.completed", {
      outcome: "success",
      stage: "complete",
      correlationId: job.id,
      attempt: job.attempts,
    });
    return "completed";
  } catch (error) {
    const errorDetails = getAccountDeletionErrorDetails(error);
    const retryAt = new Date(
      now.getTime() + getAccountDeletionRetryDelayMs(job.attempts),
    );
    try {
      await prisma.$transaction(async (transaction) => {
        await transaction.professional.updateMany({
          where: {
            id: job.professionalId,
            deletionPendingAt: null,
          },
          data: { deletionPendingAt: now },
        });
        await transaction.accountDeletionJob.updateMany({
          where: { id: job.id, status: "PROCESSING" },
          data: {
            status: "PENDING",
            nextAttemptAt: retryAt,
            lockedUntil: null,
            lastErrorCode: errorDetails.errorCode,
          },
        });
      });
    } catch (retryError) {
      logAccountDeletionEvent("retry_schedule.failed", {
        outcome: "failed",
        stage: "retry_persistence",
        correlationId: job.id,
        attempt: job.attempts,
        failedStage: stage,
        ...getAccountDeletionErrorDetails(retryError),
      });
      throw retryError;
    }
    logAccountDeletionEvent("job.retry_scheduled", {
      outcome: "failed",
      stage,
      correlationId: job.id,
      attempt: job.attempts,
      retryAt: retryAt.toISOString(),
      ...errorDetails,
    });
    return "failed";
  }
}

export async function processPendingAccountDeletions(): Promise<{
  processed: number;
  completed: number;
}> {
  const prisma = getPrismaClient();
  const now = new Date();
  const jobs = await prisma.accountDeletionJob.findMany({
    where: {
      OR: [
        { status: "PENDING", nextAttemptAt: { lte: now } },
        { status: "PROCESSING", lockedUntil: { lte: now } },
      ],
    },
    orderBy: { nextAttemptAt: "asc" },
    take: deletionBatchSize,
    select: { id: true },
  });

  logAccountDeletionEvent("worker.batch_started", {
    outcome: "started",
    stage: "job_selection",
    processed: jobs.length,
  });

  let completed = 0;
  let failed = 0;
  let skipped = 0;
  for (const job of jobs) {
    const result = await processJob(job.id, now);
    if (result === "completed") completed += 1;
    if (result === "failed") failed += 1;
    if (result === "already_processing") skipped += 1;
  }

  logAccountDeletionEvent("worker.batch_completed", {
    outcome: "success",
    stage: "job_processing",
    processed: jobs.length,
    completed,
    failed,
    skipped,
  });

  return { processed: jobs.length, completed };
}
