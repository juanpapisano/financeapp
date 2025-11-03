import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

import userRoutes from './routes/user.routes.js';
import incomeRoutes from './routes/income.routes.js';
import expenseRoutes from './routes/expense.routes.js';
import { errorHandler } from './utils/errorHandler.js';
import categoryRoutes from './routes/category.routes.js';
import summaryRoutes from './routes/summary.routes.js';
import entityRoutes from './routes/entity.routes.js';


dotenv.config();

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://192.168.1.41:5173", // ejemplo: IP de tu PC en la red local
  "http://172.31.208.1:5173", // otra compu de tu LAN, si sabés la IP
];

const app = express();
app.use(cors({
    origin: (origin, callback) => {
      // Permitir requests sin origin (por ejemplo Postman)
      if (!origin) return callback(null, true);

      // Si el origin está en la lista, permitir
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Caso contrario, rechazar
      console.warn(`CORS bloqueado para origen: ${origin}`);
      return callback(new Error("CORS not allowed for this origin"), false);
    },
    credentials: true,
  }));
app.use(express.json());

// Rate limit solo para auth
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api/users', authLimiter);

// Rutas
app.use('/api/users', userRoutes);
app.use('/api/incomes', incomeRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/summary', summaryRoutes);
app.use('/api/entities', entityRoutes);


// Healthcheck
app.get('/health', (_req, res) => res.json({ ok: true }));

// Errores
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0",  () => console.log(`✅ API escuchando en puerto ${PORT}`));
