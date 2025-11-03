import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const googleSignInSchema = z.object({
  credential: z.string().min(1, 'Token de Google requerido'),
});

// Conviene coercer number y date para aceptar strings del JSON
export const incomeCreateSchema = z.object({
  amount: z.coerce.number().positive(),
  description: z.string().optional(),
  date: z.coerce.date(),            // acepta "2025-10-05T..." o timestamp
  categoryId: z.coerce.number().int().positive().optional(),
});

export const expenseCreateSchema = z.object({
  amount: z.coerce.number().positive(),
  description: z.string().optional(),
  date: z.coerce.date(),
  categoryId: z.coerce.number().int().positive().optional(),
  entityId: z.coerce.number().int().positive().optional(),
  isSettled: z.coerce.boolean().default(true),
  paidByUserId: z.coerce.number().int().positive().optional(),
});

const memberShareSchema = z.object({
  email: z.string().email(),
  share: z.coerce.number().min(0).max(100),
});

export const entityCreateSchema = z.object({
  name: z.string().min(1),
  members: z.array(memberShareSchema).min(1),
});

export const entityMemberAddSchema = memberShareSchema;

export const entityMemberShareSchema = z.object({
  share: z.coerce.number().min(0).max(100),
});

export const entityExpenseCreateSchema = z.object({
  amount: z.coerce.number().positive(),
  description: z.string().optional(),
  date: z.coerce.date(),
});

export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: 'Datos inválidos', issues: result.error.issues });
    }
    req.body = result.data;  // ahora incluye categoryId y date ya convertidos
    next();
  };
}
