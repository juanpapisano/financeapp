import prisma from '../prismaClient.js';

const ALLOWED_TYPES = ['INCOME', 'EXPENSE'];

export const createCategory = async (req, res, next) => {
  try {
    const { name, type, icon } = req.body;

    if (!ALLOWED_TYPES.includes(type)) {
      return res.status(400).json({ message: 'Tipo inválido. Use INCOME o EXPENSE.' });
    }

    const duplicate = await prisma.category.findFirst({
      where: {
        name,
        userId: req.userId,
      },
    });

    if (duplicate) {
      return res.status(400).json({ message: 'Ya existe una categoría con ese nombre.' });
    }

    const category = await prisma.category.create({
      data: {
        name,
        type,
        userId: req.userId,
        icon: icon || null,
      },
    });

    res.status(201).json(category);
  } catch (err) {
    next(err);
  }
};

export const listCategories = async (req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      where: {
        OR: [
          { userId: req.userId },
          { userId: null }, // categorías globales (opcional)
        ],
      },
      orderBy: { name: 'asc' },
    });
    res.json(categories);
  } catch (err) {
    next(err);
  }
};

export const updateCategory = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { name, type, icon } = req.body;

    const category = await prisma.category.findUnique({ where: { id } });

    if (!category) {
      return res.status(404).json({ message: 'Categoría no encontrada' });
    }

    if (!category.userId) {
      return res.status(403).json({ message: 'No podés editar categorías por defecto' });
    }

    if (category.userId !== req.userId) {
      return res.status(403).json({ message: 'No tenés permisos para editar esta categoría' });
    }

    if (type && !ALLOWED_TYPES.includes(type)) {
      return res.status(400).json({ message: 'Tipo inválido. Use INCOME o EXPENSE.' });
    }

    const duplicate = await prisma.category.findFirst({
      where: {
        id: { not: id },
        name,
        userId: req.userId,
      },
    });

    if (duplicate) {
      return res.status(400).json({ message: 'Ya existe una categoría con ese nombre.' });
    }

    const updated = await prisma.category.update({
      where: { id },
      data: {
        name,
        type,
        icon: icon || null,
      },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
};

export const deleteCategory = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const category = await prisma.category.findUnique({ where: { id } });

    if (!category) {
      return res.status(404).json({ message: 'Categoría no encontrada' });
    }

    if (!category.userId) {
      return res.status(403).json({ message: 'No podés eliminar categorías por defecto' });
    }

    if (category.userId !== req.userId) {
      return res.status(403).json({ message: 'No tenés permisos para eliminar esta categoría' });
    }

    await prisma.category.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
