-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ProfessionalRole" AS ENUM ('PROFESSIONAL', 'ADMIN');

-- CreateTable
CREATE TABLE "Professional" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firebaseUid" TEXT,
    "cpf" TEXT,
    "phone" TEXT,
    "specialty" TEXT,
    "pixKey" TEXT,
    "logoUrl" TEXT,
    "subscriptionStatus" TEXT NOT NULL DEFAULT 'TRIAL',
    "planType" TEXT NOT NULL DEFAULT 'FREE',
    "expiresAt" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '3 days'),
    "hasSeenWelcome" BOOLEAN NOT NULL DEFAULT false,
    "role" "ProfessionalRole" NOT NULL DEFAULT 'PROFESSIONAL',
    "mpSubscriptionId" TEXT,
    "passwordHash" TEXT,
    "slug" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Professional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "preferredServiceId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "materialCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "depositAmount" DECIMAL(10,2) DEFAULT 0,
    "durationMinutes" INTEGER NOT NULL,
    "onlineBookingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'PENDING',
    "priceAtBooking" DECIMAL(10,2) NOT NULL,
    "materialCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "depositAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkingHours" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,
    "interval" INTEGER NOT NULL DEFAULT 15,
    "blockedSlots" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "WorkingHours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarBlock" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalendarBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "type" "TransactionType" NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(10,2) NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT,
    "dueAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionPayment" (
    "id" TEXT NOT NULL,
    "mercadoPagoPaymentId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "planType" TEXT NOT NULL,
    "amount" DECIMAL(10,2),
    "currency" TEXT,
    "paymentMethod" TEXT,
    "paymentType" TEXT,
    "status" TEXT NOT NULL DEFAULT 'approved',
    "statusDetail" TEXT,
    "refundedAmount" DECIMAL(10,2),
    "paidAt" TIMESTAMP(3),
    "appliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "actorProfessionalId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Professional_email_key" ON "Professional"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Professional_firebaseUid_key" ON "Professional"("firebaseUid");

-- CreateIndex
CREATE UNIQUE INDEX "Professional_cpf_key" ON "Professional"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "Professional_phone_key" ON "Professional"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Professional_slug_key" ON "Professional"("slug");

-- CreateIndex
CREATE INDEX "Professional_createdAt_idx" ON "Professional"("createdAt");

-- CreateIndex
CREATE INDEX "Professional_mpSubscriptionId_idx" ON "Professional"("mpSubscriptionId");

-- CreateIndex
CREATE INDEX "Client_professionalId_name_idx" ON "Client"("professionalId", "name");

-- CreateIndex
CREATE INDEX "Client_professionalId_whatsapp_idx" ON "Client"("professionalId", "whatsapp");

-- CreateIndex
CREATE INDEX "Client_professional_whatsapp_digits_idx"
ON "Client" (
    "professionalId",
    (regexp_replace("whatsapp", '[^0-9]', '', 'g')) text_pattern_ops
);

-- CreateIndex
CREATE INDEX "Client_professional_name_normalized_idx"
ON "Client" (
    "professionalId",
    (lower(regexp_replace(btrim("name"), '[[:space:]]+', ' ', 'g'))) text_pattern_ops,
    "id"
);

-- CreateIndex
CREATE UNIQUE INDEX "Client_id_professionalId_key" ON "Client"("id", "professionalId");

-- CreateIndex
CREATE INDEX "Service_professionalId_isActive_idx" ON "Service"("professionalId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Service_id_professionalId_key" ON "Service"("id", "professionalId");

-- CreateIndex
CREATE INDEX "Appointment_professionalId_startsAt_idx" ON "Appointment"("professionalId", "startsAt");

-- CreateIndex
CREATE INDEX "Appointment_professionalId_status_startsAt_idx" ON "Appointment"("professionalId", "status", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_id_professionalId_key" ON "Appointment"("id", "professionalId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkingHours_professionalId_weekday_key" ON "WorkingHours"("professionalId", "weekday");

-- CreateIndex
CREATE INDEX "CalendarBlock_professionalId_startsAt_idx" ON "CalendarBlock"("professionalId", "startsAt");

-- CreateIndex
CREATE INDEX "Transaction_professionalId_type_status_idx" ON "Transaction"("professionalId", "type", "status");

-- CreateIndex
CREATE INDEX "Transaction_professionalId_dueAt_idx" ON "Transaction"("professionalId", "dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_appointmentId_type_key" ON "Transaction"("appointmentId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPayment_mercadoPagoPaymentId_key" ON "SubscriptionPayment"("mercadoPagoPaymentId");

-- CreateIndex
CREATE INDEX "SubscriptionPayment_professionalId_status_paidAt_idx" ON "SubscriptionPayment"("professionalId", "status", "paidAt");

-- CreateIndex
CREATE INDEX "SubscriptionPayment_status_paidAt_idx" ON "SubscriptionPayment"("status", "paidAt");

-- CreateIndex
CREATE INDEX "AdminAuditLog_actorProfessionalId_createdAt_idx" ON "AdminAuditLog"("actorProfessionalId", "createdAt");

-- CreateIndex
CREATE INDEX "AdminAuditLog_action_createdAt_idx" ON "AdminAuditLog"("action", "createdAt");

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "Professional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_preferredServiceId_professionalId_fkey" FOREIGN KEY ("preferredServiceId", "professionalId") REFERENCES "Service"("id", "professionalId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "Professional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "Professional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_clientId_professionalId_fkey" FOREIGN KEY ("clientId", "professionalId") REFERENCES "Client"("id", "professionalId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_serviceId_professionalId_fkey" FOREIGN KEY ("serviceId", "professionalId") REFERENCES "Service"("id", "professionalId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkingHours" ADD CONSTRAINT "WorkingHours_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "Professional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarBlock" ADD CONSTRAINT "CalendarBlock_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "Professional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "Professional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_appointmentId_professionalId_fkey" FOREIGN KEY ("appointmentId", "professionalId") REFERENCES "Appointment"("id", "professionalId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionPayment" ADD CONSTRAINT "SubscriptionPayment_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "Professional"("id") ON DELETE CASCADE ON UPDATE CASCADE;
