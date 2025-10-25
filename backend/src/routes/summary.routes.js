import express from 'express';
import { authGuard } from '../utils/auth.js';
import { getSummary } from '../controllers/summary.controller.js';

const router = express.Router();
router.use(authGuard);

router.get('/', getSummary);


export default router;
