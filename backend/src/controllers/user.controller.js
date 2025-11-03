import prisma from '../prismaClient.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { registerSchema, loginSchema, googleSignInSchema } from '../utils/validators.js';

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleOAuthClient = googleClientId ? new OAuth2Client(googleClientId) : null;

export const registerUser = async (req, res, next) => {
  try {
    const { name, email, password } = registerSchema.parse(req.body);

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(400).json({ message: 'El usuario ya existe' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hashed, provider: 'LOCAL' },
    });

    res.status(201).json({ message: 'Usuario registrado', user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    next(err);
  }
};

export const loginUser = async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    if (user.provider !== 'LOCAL') {
      return res.status(400).json({ message: 'Iniciá sesión con Google para esta cuenta' });
    }
    if (!user.password) {
      return res.status(400).json({ message: 'La cuenta no tiene contraseña asociada' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: 'Credenciales inválidas' });

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.status(200).json({
      message: "Login ok",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const googleAuth = async (req, res, next) => {
  try {
    const { credential } = googleSignInSchema.parse(req.body);

    if (!googleOAuthClient) {
      return res.status(500).json({ message: 'Google OAuth no está configurado' });
    }

    const ticket = await googleOAuthClient.verifyIdToken({
      idToken: credential,
      audience: googleClientId,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      return res.status(400).json({ message: 'Token de Google inválido' });
    }

    const { sub, email, name } = payload;

    if (!email) {
      return res.status(400).json({ message: 'Google no devolvió un email válido' });
    }

    let user = await prisma.user.findUnique({ where: { email } });

    if (user && user.provider !== 'GOOGLE') {
      return res.status(400).json({
        message: 'Ya existe una cuenta con email y contraseña. Iniciá sesión por ese método.',
      });
    }

    if (!user) {
      user = await prisma.user.create({
        data: {
          name: name || email,
          email,
          provider: 'GOOGLE',
          providerId: sub,
        },
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: name || user.name,
          provider: 'GOOGLE',
          providerId: user.providerId || sub,
        },
      });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.json({
      message: 'Login ok',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        provider: user.provider,
      },
    });
  } catch (err) {
    next(err);
  }
};
