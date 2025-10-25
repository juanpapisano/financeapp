import prisma from '../prismaClient.js';

export const createIncome = async (req, res, next) => {
  try {
    let { amount, description, date, categoryId } = req.body;

    // Convertir a número si existe
    categoryId = categoryId ? Number(categoryId) : null;

      if (categoryId) {
      const category = await prisma.category.findUnique({ where: { id: categoryId } });
      if (!category) {
        return res.status(400).json({ message: 'La categoría especificada no existe' });
      }
      if (category.type !== 'INCOME') {
        return res.status(400).json({ message: 'La categoría no es válida para ingresos' });
      }
      // asegurar que la categoría sea del usuario o global (si usás globales con userId null)
      if (category.userId && category.userId !== req.userId) {
        return res.status(403).json({ message: 'No tenés permisos para usar esta categoría' });
      }
    }

    const data = {
      amount,
      description: description ?? null,
      date,
      userId: req.userId,
      categoryId: categoryId ?? null,
    };

    const income = await prisma.income.create({
      data,
      include: { category: true },
    });

    res.status(201).json(income);
  } catch (err) {
    next(err);
  }
};

export const listIncomes = async (req, res, next) => {
  try {
    const { page = 1, pageSize = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(pageSize);

    const [items, total] = await Promise.all([
      prisma.income.findMany({
        where: { userId: req.userId },
        include: { category: true },
        orderBy: { date: 'desc' },
        skip,
        take: Number(pageSize),
      }),
      prisma.income.count({ where: { userId: req.userId } }),
    ]);

    res.json({ items, total, page: Number(page), pageSize: Number(pageSize) });
  } catch (err) {
    next(err);
  }
};

export const deleteIncome = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const income = await prisma.income.findUnique({ where: { id } });

    if (!income || income.userId !== req.userId) {
      return res.status(404).json({ message: 'Ingreso no encontrado o no pertenece al usuario' });
    }

    await prisma.income.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
