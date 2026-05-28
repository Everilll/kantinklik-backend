import { Prisma } from '@prisma/client';

type PrismaTransactionClient = Omit<
  Prisma.TransactionClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

export async function generateOrderCode(
  tx: PrismaTransactionClient,
): Promise<string> {
  // Timezone Asia/Jakarta
  const now = new Date();
  const jakartaDate = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);

  // Ubah format DD/MM/YYYY → YYYYMMDD
  const [day, month, year] = jakartaDate.split('/');
  const dateStr = `${year}${month}${day}`;

  // Start & end of day di Jakarta timezone
  const startOfDay = new Date(`${year}-${month}-${day}T00:00:00+07:00`);
  const endOfDay = new Date(`${year}-${month}-${day}T23:59:59+07:00`);

  const count = await tx.order.count({
    where: {
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  const sequence = String(count + 1).padStart(3, '0');
  return `KK-${dateStr}-${sequence}`;
}