import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const defaultCategories = [
  { name: 'Food', type: 'EXPENSE', icon: 'utensils' },
  { name: 'Transport', type: 'EXPENSE', icon: 'bus' },
  { name: 'Medicine', type: 'EXPENSE', icon: 'pill' },
  { name: 'Groceries', type: 'EXPENSE', icon: 'shopping-basket' },
  { name: 'Gifts', type: 'EXPENSE', icon: 'gift' },
  { name: 'Rent', type: 'EXPENSE', icon: 'home' },
  { name: 'Entertainment', type: 'EXPENSE', icon: 'clapperboard' },
  { name: 'Savings', type: 'EXPENSE', icon: 'piggy-bank' },
  { name: 'Salary', type: 'INCOME', icon: 'badge-dollar-sign' },
  { name: 'Investments', type: 'INCOME', icon: 'line-chart' },
];

async function main() {
  for (const category of defaultCategories) {
    const existing = await prisma.category.findFirst({
      where: {
        name: category.name,
        userId: null,
      },
    });

    if (existing) {
      await prisma.category.update({
        where: { id: existing.id },
        data: { icon: category.icon, type: category.type },
      });
    } else {
      await prisma.category.create({
        data: {
          name: category.name,
          type: category.type,
          icon: category.icon,
          userId: null,
        },
      });
    }
  }
}

main()
  .catch((error) => {
    console.error('Seed error', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
