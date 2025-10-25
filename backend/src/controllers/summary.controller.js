import prisma from '../prismaClient.js';
import { startOfMonth, endOfMonth } from "date-fns";

export const getSummary = async (req, res, next) => {
  try {
    const userId = req.userId;

    // Totales simples
    const [incomeTotal, expenseTotal] = await Promise.all([
      prisma.income.aggregate({
        _sum: { amount: true },
        where: { userId },
      }),
      prisma.expense.aggregate({
        _sum: { amount: true },
        where: { userId },
      }),
    ]);

    const totalIncome = incomeTotal._sum.amount || 0;
    const totalExpense = expenseTotal._sum.amount || 0;
    const balance = totalIncome - totalExpense;

    // Totales por categoría
    const [byIncomeCategory, byExpenseCategory] = await Promise.all([
      prisma.income.groupBy({
        by: ['categoryId'],
        _sum: { amount: true },
        where: { userId },
      }),
      prisma.expense.groupBy({
        by: ['categoryId'],
        _sum: { amount: true },
        where: { userId },
      }),
    ]);

    // Buscar nombres de categorías
    const categories = await prisma.category.findMany({
      where: { userId },
      select: { id: true, name: true, type: true },
    });

    const incomeCategories = byIncomeCategory.map(item => {
      const cat = categories.find(c => c.id === item.categoryId);
      return { category: cat?.name || 'Sin categoría', total: item._sum.amount || 0 };
    });

    const expenseCategories = byExpenseCategory.map(item => {
      const cat = categories.find(c => c.id === item.categoryId);
      return { category: cat?.name || 'Sin categoría', total: item._sum.amount || 0 };
    });

    res.json({
      totalIncome,
      totalExpense,
      balance,
      incomeByCategory: incomeCategories,
      expenseByCategory: expenseCategories,
    });
  } catch (err) {
    next(err);
  }
};
export const getMonthlySummary = async (req, res) => {
  try {
    const userId = req.user.id; // suponiendo que el middleware auth ya está activo
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);

    const incomes = await prisma.income.aggregate({
      _sum: { amount: true },
      where: {
        userId,
        createdAt: { gte: start, lte: end },
      },
    });

    const expenses = await prisma.expense.aggregate({
      _sum: { amount: true },
      where: {
        userId,
        createdAt: { gte: start, lte: end },
      },
    });

    const totalIncome = incomes._sum.amount || 0;
    const totalExpense = expenses._sum.amount || 0;
    const balance = totalIncome - totalExpense;

    res.json({ month: now.toLocaleString("es-AR", { month: "long" }), totalIncome, totalExpense, balance });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al obtener resumen mensual" });
  }
};
