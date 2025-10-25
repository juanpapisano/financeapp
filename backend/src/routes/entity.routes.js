import express from 'express';
import { authGuard } from '../utils/auth.js';
import {
  createEntity,
  listEntities,
  addEntityMember,
  updateEntityMemberShare,
  removeEntityMember,
  createEntityExpense,
  listEntityExpenses,
} from '../controllers/entity.controller.js';

const router = express.Router();

router.use(authGuard);

router.post('/', createEntity);
router.get('/', listEntities);

router.post('/:id/members', addEntityMember);
router.patch('/:id/members/:memberId', updateEntityMemberShare);
router.delete('/:id/members/:memberId', removeEntityMember);

router.post('/:id/expenses', createEntityExpense);
router.get('/:id/expenses', listEntityExpenses);

export default router;
