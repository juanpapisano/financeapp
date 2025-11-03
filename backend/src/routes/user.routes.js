import express from 'express';
import { registerUser, loginUser, googleAuth } from '../controllers/user.controller.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/google', googleAuth);

export default router;
