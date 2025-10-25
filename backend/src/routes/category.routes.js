import express from 'express';
import { authGuard } from '../utils/auth.js';
import { createCategory, listCategories, updateCategory, deleteCategory } from '../controllers/category.controller.js';

const router = express.Router();
router.use(authGuard);

router.post('/', createCategory);
router.get('/', listCategories);
router.put('/:id', updateCategory);
router.delete('/:id', deleteCategory);

export default router;
