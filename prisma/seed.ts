import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ─── MenuCategory master data ──────────────────────────
  const categories = [
    { name: 'Makanan', type: 'FOOD' as const },
    { name: 'Minuman', type: 'DRINK' as const },
    { name: 'Snack', type: 'SNACK' as const },
  ];

  for (const cat of categories) {
    await prisma.menuCategory.upsert({
      where: { id: categories.indexOf(cat) + 1 },
      update: {},
      create: cat,
    });
  }
  console.log('MenuCategory seeded');

  // ─── Admin accounts ────────────────────────────────────
  const emails = (process.env.ADMIN_SEED_EMAILS ?? '').split(',').map(s => s.trim());
  const passwords = (process.env.ADMIN_SEED_PASSWORDS ?? '').split(',').map(s => s.trim());
  const names = (process.env.ADMIN_SEED_NAMES ?? '').split(',').map(s => s.trim());

  if (emails.length === 0 || emails[0] === '') {
    console.warn('ADMIN_SEED_EMAILS tidak diset, skip seed admin');
    return;
  }

  for (let i = 0; i < emails.length; i++) {
    const email = emails[i];
    const password = passwords[i];
    const name = names[i];

    if (!email || !password || !name) {
      console.warn(`ADMIN_SEED_EMAILS tidak diset, skip seed admin`);
      continue;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.user.upsert({
      where: { email },
      update: { passwordHash, name }, // update password kalau sudah ada
      create: {
        email,
        passwordHash,
        name,
        whatsappNumber: '000000000000', // placeholder, admin tidak butuh WA
        role: Role.ADMIN,
        isVerified: true,
      },
    });

    console.log(`✅ Admin seeded: ${email}`);
  }

  console.log('🎉 Seeding selesai!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });