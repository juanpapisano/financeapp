import prisma from '../prismaClient.js';

function mapEntityExpenseResponse(entityExpense, userId) {
  const totalAmount = entityExpense.amount || 0;
  return {
    id: entityExpense.id,
    amount: entityExpense.amount,
    description: entityExpense.description,
    date: entityExpense.date,
    entity: {
      id: entityExpense.entity.id,
      name: entityExpense.entity.name,
    },
    addedBy: {
      id: entityExpense.addedBy.id,
      name: entityExpense.addedBy.name,
      email: entityExpense.addedBy.email,
    },
    shares: entityExpense.personalExpenses.map((expense) => ({
      user: {
        id: expense.user.id,
        name: expense.user.name,
        email: expense.user.email,
      },
      amount: expense.amount,
      percentage:
        expense.sharePercentage == null
          ? null
          : Number(expense.sharePercentage.toFixed(2)),
      isPayer: expense.isPayer,
      isSettled: expense.isSettled,
      isCurrentUser: expense.user.id === userId,
    })),
    total: totalAmount,
  };
}

export const createExpense = async (req, res, next) => {
  try {
    let {
      amount,
      description,
      date,
      categoryId,
      entityId,
      isSettled = true,
      paidByUserId,
    } = req.body;

    // Convertir a número si existe
    categoryId = typeof categoryId === 'number' ? categoryId : null;
    entityId = typeof entityId === 'number' ? entityId : null;
    const settled = typeof isSettled === 'boolean' ? isSettled : Boolean(isSettled);
    const payerOverride = typeof paidByUserId === 'number' ? paidByUserId : null;

    if (categoryId) {
      const category = await prisma.category.findUnique({ where: { id: categoryId } });
      if (!category) {
        return res.status(400).json({ message: 'La categoría especificada no existe' });
      }
      if (category.type !== 'EXPENSE') {
        return res.status(400).json({ message: 'La categoría no es válida para gastos' });
      }
      if (category.userId && category.userId !== req.userId) {
        return res.status(403).json({ message: 'No tenés permisos para usar esta categoría' });
      }
    }

    if (!entityId) {
      const expense = await prisma.expense.create({
        data: {
          amount,
          description: description ?? null,
          date,
          userId: req.userId,
          categoryId: categoryId ?? null,
          isSettled: settled,
        },
        include: {
          category: true,
          entityExpense: {
            include: { entity: true },
          },
        },
      });

      return res.status(201).json(expense);
    }

    const entity = await prisma.entity.findUnique({
      where: { id: entityId },
      include: {
        members: true,
      },
    });

    if (!entity) {
      return res.status(404).json({ message: 'Entidad no encontrada' });
    }

    const memberIds = new Set(entity.members.map((member) => member.userId));
    const payerUserId = payerOverride ?? req.userId;

    const isMember = memberIds.has(req.userId) || entity.createdById === req.userId;
    if (!isMember) {
      return res.status(403).json({ message: 'No pertenecés a esta entidad' });
    }

    if (entity.members.length === 0) {
      return res.status(400).json({ message: 'La entidad no tiene miembros para dividir gastos' });
    }

    if (!memberIds.has(payerUserId)) {
      return res.status(400).json({ message: 'El pagador debe ser miembro de la entidad' });
    }

    const totalShare = entity.members.reduce(
      (sum, member) => sum + Number(member.share),
      0,
    );

    if (Math.abs(totalShare - 100) > 0.01) {
      return res.status(400).json({
        message:
          'Los porcentajes de los miembros deben sumar 100 para registrar un gasto compartido',
      });
    }

    const entityExpense = await prisma.$transaction(async (tx) => {
      const sharedExpense = await tx.entityExpense.create({
        data: {
          amount,
          description: description ?? null,
          date,
          entityId,
          addedById: req.userId,
        },
      });

      // Crear gasto personal completo para quien pagó
      await tx.expense.create({
        data: {
          amount,
          description: description ?? null,
          date,
          userId: payerUserId,
          categoryId: categoryId ?? null,
          entityExpenseId: sharedExpense.id,
          sharePercentage: null,
          isPayer: true,
          isSettled: settled,
        },
      });

      // Crear gastos proporcionales para cada miembro
      await Promise.all(
        entity.members.map((member, index) => {
          const percentage = Number(member.share);
          const isMemberPayer = member.userId === payerUserId;
          let memberAmount = Number(((amount * percentage) / 100).toFixed(2));

          if (index === entity.members.length - 1) {
            const alreadyAssigned = entity.members
              .slice(0, -1)
              .reduce(
                (sum, previous) =>
                  sum + Number(((amount * Number(previous.share)) / 100).toFixed(2)),
                0,
              );
            memberAmount = Number((amount - alreadyAssigned).toFixed(2));
          }

          return tx.expense.create({
            data: {
              amount: memberAmount,
              description: description ?? null,
              date,
              userId: member.userId,
              categoryId: categoryId ?? null,
              entityExpenseId: sharedExpense.id,
              sharePercentage: percentage,
              isPayer: isMemberPayer,
              isSettled: isMemberPayer && settled,
            },
          });
        }),
      );

      return tx.entityExpense.findUnique({
        where: { id: sharedExpense.id },
        include: {
          entity: true,
          addedBy: true,
          personalExpenses: {
            include: {
              user: true,
              category: true,
            },
          },
        },
      });
    });

    res.status(201).json({
      message: 'Gasto compartido registrado',
      sharedExpense: mapEntityExpenseResponse(entityExpense, req.userId),
    });
  } catch (err) {
    next(err);
  }
};

export const listExpenses = async (req, res, next) => {
  try {
    const { page = 1, pageSize = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(pageSize);

    const [items, total] = await Promise.all([
      prisma.expense.findMany({
        where: { userId: req.userId },
        include: {
          category: true,
          entityExpense: {
            include: {
              entity: true,
            },
          },
        },
        orderBy: { date: 'desc' },
        skip,
        take: Number(pageSize),
      }),
      prisma.expense.count({ where: { userId: req.userId } }),
    ]);

    res.json({ items, total, page: Number(page), pageSize: Number(pageSize) });
  } catch (err) {
    next(err);
  }
};

export const deleteExpense = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const expense = await prisma.expense.findUnique({ where: { id } });

    if (!expense || expense.userId !== req.userId) {
      return res.status(404).json({ message: 'Gasto no encontrado o no pertenece al usuario' });
    }

    await prisma.expense.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
