ALTER TABLE "Appointment"
ADD COLUMN "depositPaymentExpiresAt" TIMESTAMP(3);

CREATE TABLE "MercadoPagoConnection" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "accessTokenEncrypted" TEXT NOT NULL,
    "refreshTokenEncrypted" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "liveMode" BOOLEAN NOT NULL,
    "scopes" TEXT,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MercadoPagoConnection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AppointmentDepositPayment" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "providerPaymentId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'creating',
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "qrCode" TEXT,
    "qrCodeBase64" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppointmentDepositPayment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MercadoPagoConnection_professionalId_key"
ON "MercadoPagoConnection"("professionalId");

CREATE UNIQUE INDEX "MercadoPagoConnection_accountId_key"
ON "MercadoPagoConnection"("accountId");

CREATE INDEX "MercadoPagoConnection_tokenExpiresAt_idx"
ON "MercadoPagoConnection"("tokenExpiresAt");

CREATE UNIQUE INDEX "AppointmentDepositPayment_appointmentId_key"
ON "AppointmentDepositPayment"("appointmentId");

CREATE UNIQUE INDEX "AppointmentDepositPayment_appointmentId_professionalId_key"
ON "AppointmentDepositPayment"("appointmentId", "professionalId");

CREATE UNIQUE INDEX "AppointmentDepositPayment_providerPaymentId_key"
ON "AppointmentDepositPayment"("providerPaymentId");

CREATE INDEX "AppointmentDepositPayment_professionalId_status_expiresAt_idx"
ON "AppointmentDepositPayment"("professionalId", "status", "expiresAt");

ALTER TABLE "MercadoPagoConnection"
ADD CONSTRAINT "MercadoPagoConnection_professionalId_fkey"
FOREIGN KEY ("professionalId") REFERENCES "Professional"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AppointmentDepositPayment"
ADD CONSTRAINT "AppointmentDepositPayment_professionalId_fkey"
FOREIGN KEY ("professionalId") REFERENCES "Professional"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AppointmentDepositPayment"
ADD CONSTRAINT "AppointmentDepositPayment_appointmentId_professionalId_fkey"
FOREIGN KEY ("appointmentId", "professionalId")
REFERENCES "Appointment"("id", "professionalId")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Transaction"
ADD COLUMN "depositPaymentId" TEXT;

CREATE UNIQUE INDEX "Transaction_depositPaymentId_key"
ON "Transaction"("depositPaymentId");

ALTER TABLE "Transaction"
ADD CONSTRAINT "Transaction_depositPaymentId_fkey"
FOREIGN KEY ("depositPaymentId") REFERENCES "AppointmentDepositPayment"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
