CREATE TYPE "PixDepositMode" AS ENUM ('MANUAL', 'AUTOMATIC');

ALTER TABLE "Professional"
ADD COLUMN "pixDepositMode" "PixDepositMode";

UPDATE "Professional" AS professional
SET "pixDepositMode" = CASE
    WHEN EXISTS (
        SELECT 1
        FROM "MercadoPagoConnection" AS connection
        WHERE connection."professionalId" = professional."id"
    ) THEN 'AUTOMATIC'::"PixDepositMode"
    ELSE 'MANUAL'::"PixDepositMode"
END;

ALTER TABLE "Professional"
ALTER COLUMN "pixDepositMode" SET DEFAULT 'MANUAL',
ALTER COLUMN "pixDepositMode" SET NOT NULL;
