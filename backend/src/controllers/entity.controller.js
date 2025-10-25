import { Prisma } from '@prisma/client';
import prisma from '../prismaClient.js';
import {
  entityCreateSchema,
  entityMemberAddSchema,
  entityMemberShareSchema,
  entityExpenseCreateSchema,
} from '../utils/validators.js';

const SHARE_TOTAL = 100;
const SHARE_TOLERANCE = 0.01;

function isShareTotalValid(members, targetTotal = SHARE_TOTAL) {
  const sum = members.reduce((acc, member) => acc + Number(member.share ?? member.shareValue ?? 0), 0);
  return Math.abs(sum - targetTotal) <= SHARE_TOLERANCE;
}

function toDecimal(value) {
  return new Prisma.Decimal(value.toFixed(2));
}

function mapEntity(entity) {
  return {
    id: entity.id,
    name: entity.name,
    createdAt: entity.createdAt,
    createdById: entity.createdById,
    members: entity.members.map((member) => ({
      id: member.id,
      share: Number(member.share),
      user: {
        id: member.user.id,
        name: member.user.name,
        email: member.user.email,
      },
    })),
  };
}

function mapEntityExpense(entityExpense, includePersonalExpenses = true) {
  const totalAmount = entityExpense.amount || 0;
  return {
    id: entityExpense.id,
    amount: entityExpense.amount,
    description: entityExpense.description,
    date: entityExpense.date,
    addedBy: {
      id: entityExpense.addedBy.id,
      name: entityExpense.addedBy.name,
      email: entityExpense.addedBy.email,
    },
    entity: {
      id: entityExpense.entity.id,
      name: entityExpense.entity.name,
    },
    personalExpenses: !includePersonalExpenses
      ? []
      : entityExpense.personalExpenses.map((expense) => ({
          id: expense.id,
          amount: expense.amount,
          description: expense.description,
          date: expense.date,
          user: {
            id: expense.user.id,
            name: expense.user.name,
            email: expense.user.email,
          },
          categoryId: expense.categoryId,
          share:
            expense.sharePercentage == null
              ? null
              : Number(expense.sharePercentage.toFixed(2)),
          isPayer: expense.isPayer,
        })),
  };
}

async function getEntityForOwner(entityId, userId, extraInclude = {}) {
  const entity = await prisma.entity.findUnique({
    where: { id: entityId },
    include: {
      members: { include: { user: true } },
      ...extraInclude,
    },
  });
  if (!entity) {
    const err = new Error('Entidad no encontrada');
    err.status = 404;
    throw err;
  }
  if (entity.createdById !== userId) {
    const err = new Error('No tenés permisos para modificar esta entidad');
    err.status = 403;
    throw err;
  }
  return entity;
}

async function getEntityForMember(entityId, userId, extraInclude = {}) {
  const entity = await prisma.entity.findUnique({
    where: { id: entityId },
    include: {
      members: { include: { user: true } },
      ...extraInclude,
    },
  });
  if (!entity) {
    const err = new Error('Entidad no encontrada');
    err.status = 404;
    throw err;
  }
  const isMember =
    entity.createdById === userId || entity.members.some((member) => member.userId === userId);
  if (!isMember) {
    const err = new Error('No pertenecés a esta entidad');
    err.status = 403;
    throw err;
  }
  return entity;
}

export const createEntity = async (req, res, next) => {
  try {
    const { name, members } = entityCreateSchema.parse(req.body);

    const normalizedMembers = members.map((member) => ({
      email: member.email.toLowerCase(),
      share: member.share,
    }));

    const uniqueEmails = new Set(normalizedMembers.map((member) => member.email));
    if (uniqueEmails.size !== normalizedMembers.length) {
      return res.status(400).json({ message: 'No se permiten emails duplicados en la entidad' });
    }

    if (!isShareTotalValid(normalizedMembers)) {
      return res
        .status(400)
        .json({ message: 'La suma de los porcentajes debe ser exactamente 100' });
    }

    const users = await prisma.user.findMany({
      where: { email: { in: Array.from(uniqueEmails) } },
    });

    if (users.length !== uniqueEmails.size) {
      return res
        .status(400)
        .json({ message: 'Alguno de los emails no pertenece a un usuario registrado' });
    }

    const userByEmail = new Map(users.map((user) => [user.email.toLowerCase(), user]));

    if (![...userByEmail.values()].some((user) => user.id === req.userId)) {
      return res
        .status(400)
        .json({ message: 'El creador debe estar incluido como miembro de la entidad' });
    }

    const entity = await prisma.$transaction(async (tx) => {
      const created = await tx.entity.create({
        data: {
          name,
          createdById: req.userId,
        },
      });

      await Promise.all(
        normalizedMembers.map((member) =>
          tx.entityMember.create({
            data: {
              entityId: created.id,
              userId: userByEmail.get(member.email).id,
              share: toDecimal(member.share),
            },
          }),
        ),
      );

      return tx.entity.findUnique({
        where: { id: created.id },
        include: { members: { include: { user: true } } },
      });
    });

    res.status(201).json(mapEntity(entity));
  } catch (err) {
    next(err);
  }
};

export const listEntities = async (req, res, next) => {
  try {
    const entities = await prisma.entity.findMany({
      where: {
        OR: [
          { createdById: req.userId },
          { members: { some: { userId: req.userId } } },
        ],
      },
      include: {
        members: {
          include: { user: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(entities.map(mapEntity));
  } catch (err) {
    next(err);
  }
};

export const addEntityMember = async (req, res, next) => {
  try {
    const entityId = Number(req.params.id);
    if (Number.isNaN(entityId)) {
      return res.status(400).json({ message: 'ID de entidad inválido' });
    }

    const { email, share } = entityMemberAddSchema.parse(req.body);
    const entity = await getEntityForOwner(entityId, req.userId);

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    if (entity.members.some((member) => member.userId === user.id)) {
      return res.status(400).json({ message: 'El usuario ya es miembro de esta entidad' });
    }

    const updatedTotal =
      entity.members.reduce((sum, member) => sum + Number(member.share), 0) + share;

    if (Math.abs(updatedTotal - 100) > SHARE_TOLERANCE) {
      return res
        .status(400)
        .json({ message: 'La suma de los porcentajes debe mantenerse en 100' });
    }

    await prisma.entityMember.create({
      data: {
        entityId,
        userId: user.id,
        share: toDecimal(share),
      },
    });

    const refreshed = await prisma.entity.findUnique({
      where: { id: entityId },
      include: { members: { include: { user: true } } },
    });

    res.status(201).json(mapEntity(refreshed));
  } catch (err) {
    next(err);
  }
};

export const updateEntityMemberShare = async (req, res, next) => {
  try {
    const entityId = Number(req.params.id);
    const memberId = Number(req.params.memberId);
    if (Number.isNaN(entityId) || Number.isNaN(memberId)) {
      return res.status(400).json({ message: 'IDs inválidos' });
    }

    const { share } = entityMemberShareSchema.parse(req.body);

    const member = await prisma.entityMember.findUnique({
      where: { id: memberId },
      include: {
        entity: {
          include: { members: { include: { user: true } } },
        },
      },
    });

    if (!member || member.entityId !== entityId) {
      return res.status(404).json({ message: 'Miembro no encontrado' });
    }

    if (member.entity.createdById !== req.userId) {
      return res
        .status(403)
        .json({ message: 'Solo el creador puede modificar los porcentajes' });
    }

    const total = member.entity.members.reduce((sum, current) => {
      if (current.id === memberId) {
        return sum + share;
      }
      return sum + Number(current.share);
    }, 0);

    if (Math.abs(total - 100) > SHARE_TOLERANCE) {
      return res
        .status(400)
        .json({ message: 'La suma de los porcentajes debe mantenerse en 100' });
    }

    await prisma.entityMember.update({
      where: { id: memberId },
      data: { share: toDecimal(share) },
    });

    const refreshed = await prisma.entity.findUnique({
      where: { id: entityId },
      include: { members: { include: { user: true } } },
    });

    res.json(mapEntity(refreshed));
  } catch (err) {
    next(err);
  }
};

export const removeEntityMember = async (req, res, next) => {
  try {
    const entityId = Number(req.params.id);
    const memberId = Number(req.params.memberId);
    if (Number.isNaN(entityId) || Number.isNaN(memberId)) {
      return res.status(400).json({ message: 'IDs inválidos' });
    }

    const entity = await getEntityForOwner(entityId, req.userId);

    if (entity.members.length <= 1) {
      return res
        .status(400)
        .json({ message: 'La entidad debe tener al menos un miembro' });
    }

    const memberToRemove = entity.members.find((member) => member.id === memberId);
    if (!memberToRemove) {
      return res.status(404).json({ message: 'Miembro no encontrado' });
    }

    const remainingMembers = entity.members.filter((member) => member.id !== memberId);
    const remainingTotal = remainingMembers.reduce(
      (sum, member) => sum + Number(member.share),
      0,
    );

    const equalShare =
      remainingTotal === 0
        ? SHARE_TOTAL / remainingMembers.length
        : null;

    await prisma.$transaction(async (tx) => {
      await tx.entityMember.delete({ where: { id: memberId } });

      let assignedTotal = 0;
      for (let index = 0; index < remainingMembers.length; index += 1) {
        const member = remainingMembers[index];
        let adjustedShare;
        if (index === remainingMembers.length - 1) {
          adjustedShare = Math.max(
            0,
            Number((SHARE_TOTAL - assignedTotal).toFixed(2)),
          );
        } else {
          const baseShare =
            equalShare !== null
              ? equalShare
              : (Number(member.share) / remainingTotal) * SHARE_TOTAL;
          adjustedShare = Number(baseShare.toFixed(2));
          assignedTotal += adjustedShare;
        }

        await tx.entityMember.update({
          where: { id: member.id },
          data: { share: toDecimal(adjustedShare) },
        });
      }
    });

    const refreshed = await prisma.entity.findUnique({
      where: { id: entityId },
      include: { members: { include: { user: true } } },
    });

    res.json(mapEntity(refreshed));
  } catch (err) {
    next(err);
  }
};

export const createEntityExpense = async (req, res, next) => {
  try {
    const entityId = Number(req.params.id);
    if (Number.isNaN(entityId)) {
      return res.status(400).json({ message: 'ID de entidad inválido' });
    }

    const { amount, description, date } = entityExpenseCreateSchema.parse(req.body);

    const entity = await getEntityForMember(entityId, req.userId);

    if (entity.members.length === 0) {
      return res.status(400).json({ message: 'La entidad no tiene miembros para dividir gastos' });
    }

    if (!isShareTotalValid(entity.members)) {
      return res
        .status(400)
        .json({
          message:
            'Los porcentajes de los miembros deben sumar 100 para registrar un gasto compartido',
        });
    }

    const entityExpense = await prisma.$transaction(async (tx) => {
      const amountDecimal = new Prisma.Decimal(amount);
      let accumulated = new Prisma.Decimal(0);

      const createdSharedExpense = await tx.entityExpense.create({
        data: {
          amount,
          description: description ?? null,
          date,
          entityId,
          addedById: req.userId,
        },
      });

      await tx.expense.create({
        data: {
          amount,
          description: description ?? null,
          date,
          userId: req.userId,
          categoryId: null,
          entityExpenseId: createdSharedExpense.id,
          sharePercentage: null,
          isPayer: true,
        },
      });

      await Promise.all(
        entity.members.map((member, index) => {
          const percentageDecimal = new Prisma.Decimal(
            Number(member.share).toFixed(2),
          );
          let memberAmountDecimal = amountDecimal.mul(percentageDecimal).div(100);

          if (index === entity.members.length - 1) {
            memberAmountDecimal = amountDecimal.sub(accumulated);
          } else {
            accumulated = accumulated.add(memberAmountDecimal);
          }

          return tx.expense.create({
            data: {
              amount: memberAmountDecimal.toNumber(),
              description: description ?? null,
              date,
              userId: member.userId,
              categoryId: null,
              entityExpenseId: createdSharedExpense.id,
              sharePercentage: Number(member.share),
              isPayer: member.userId === req.userId,
            },
          });
        }),
      );

      return tx.entityExpense.findUnique({
        where: { id: createdSharedExpense.id },
        include: {
          entity: true,
          addedBy: true,
          personalExpenses: {
            include: { user: true },
          },
        },
      });
    });

    res.status(201).json(mapEntityExpense(entityExpense));
  } catch (err) {
    next(err);
  }
};

export const listEntityExpenses = async (req, res, next) => {
  try {
    const entityId = Number(req.params.id);
    if (Number.isNaN(entityId)) {
      return res.status(400).json({ message: 'ID de entidad inválido' });
    }

    await getEntityForMember(entityId, req.userId);

    const expenses = await prisma.entityExpense.findMany({
      where: { entityId },
      include: {
        entity: true,
        addedBy: true,
        personalExpenses: {
          include: { user: true },
        },
      },
      orderBy: { date: 'desc' },
    });

    res.json(expenses.map((item) => mapEntityExpense(item)));
  } catch (err) {
    next(err);
  }
};
