import express from 'express';
import { authGuard } from '../utils/auth.js';
import { createIncome, listIncomes, deleteIncome } from '../controllers/income.controller.js';
import { validate, incomeCreateSchema } from '../utils/validators.js';

const router = express.Router();

router.use(authGuard);

router.post('/', validate(incomeCreateSchema), createIncome);
router.get('/', listIncomes);
router.delete('/:id', deleteIncome);

export default router;
