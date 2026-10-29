import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { decimalToCents } from "@/lib/money";
import { getPrismaClient } from "@/lib/prisma";

export async function sumScheduledMaterialCosts(
  professionalId: string,
  from: Date,
  to: Date,
): Promise<number> {
  const result = await getPrismaClient().$queryRaw<
    Array<{ total: Prisma.Decimal }>
  >`
    SELECT COALESCE(SUM(service."materialCost"), 0) AS "total"
    FROM "Appointment" AS appointment
    INNER JOIN "Service" AS service
      ON service."id" = appointment."serviceId"
      AND service."professionalId" = appointment."professionalId"
    WHERE appointment."professionalId" = ${professionalId}
      AND appointment."status" IN (
        'PENDING'::"AppointmentStatus",
        'CONFIRMED'::"AppointmentStatus"
      )
      AND appointment."startsAt" >= ${from}
      AND appointment."startsAt" < ${to}
  `;

  return decimalToCents(result[0]?.total ?? "0");
}
