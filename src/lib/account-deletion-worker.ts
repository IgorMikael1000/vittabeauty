import "server-only";

import { v2 as cloudinary } from "cloudinary";
import { getFirebaseAdminAuth } from "@/lib/firebase-admin-auth";
import { getPrismaClient } from "@/lib/prisma";
import { getAccountDeletionRetryDelayMs } from "@/lib/account-deletion-retry";

const jobLeaseMs = 5 * 60 * 1000;
const deletionBatchSize = 5;

function getSafeErrorCode(error: unknown): string {
  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
      ? error.code
      : error instanceof Error
        ? error.message
        : "UNKNOWN_ERROR";
  return /^[A-Za-z0-9_/-]{1,80}$/.test(code) ? code : "UNKNOWN_ERROR";
}

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

export async function processAccountDeletionJob(
  jobId: string,
): Promise<AccountDeletionResult> {
  return processJob(jobId, new Date());
}

async function processJob(
  jobId: string,
  now: Date,
): Promise<AccountDeletionResult> {
  const prisma = getPrismaClient();
  const claim = await prisma.accountDeletionJob.updateMany({
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
  if (claim.count !== 1) return "already_processing";

  const job = await prisma.accountDeletionJob.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      professionalId: true,
      firebaseUid: true,
      cloudinaryPublicId: true,
      attempts: true,
    },
  });
  if (!job) return "already_processing";

  try {
    await removeFirebaseUser(job.firebaseUid);
    await removeCloudinaryImage(job.cloudinaryPublicId);
    await deleteDatabaseRecords(job.professionalId, job.id);
    console.info("[account-deletion] Deletion completed.", {
      correlationId: job.id,
      outcome: "success",
    });
    return "completed";
  } catch (error) {
    const errorCode = getSafeErrorCode(error);
    const retryAt = new Date(
      now.getTime() + getAccountDeletionRetryDelayMs(job.attempts),
    );
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
          lastErrorCode: errorCode,
        },
      });
    });
    console.error("[account-deletion] Deletion retry scheduled.", {
      correlationId: job.id,
      attempt: job.attempts,
      retryAt: retryAt.toISOString(),
      code: errorCode,
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

  let completed = 0;
  for (const job of jobs) {
    if ((await processJob(job.id, now)) === "completed") completed += 1;
  }

  return { processed: jobs.length, completed };
}
