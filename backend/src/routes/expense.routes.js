import express from 'express';
import { authGuard } from '../utils/auth.js';
import { createExpense, listExpenses, deleteExpense } from '../controllers/expense.controller.js';
import { validate, expenseCreateSchema } from '../utils/validators.js';

const router = express.Router();

router.use(authGuard);

router.post('/', validate(expenseCreateSchema), createExpense);
router.get('/', listExpenses);
router.delete('/:id', deleteExpense);

export default router;
