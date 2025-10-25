# Finance App Monorepo

Proyecto que reúne el backend (Express + Prisma) y el frontend (React + Vite) para la aplicación de gestión financiera.

## Estructura
- `backend/`: API REST en Node.js. Incluye Prisma, controladores y rutas (`backend/README.md` tiene el detalle completo).
- `frontend/`: SPA en React con Vite y Tailwind. Consume la API expuesta por el backend.
- `docker-compose.yml`: stack de Postgres + pgAdmin para desarrollo local.

## Primeros pasos
1. **Instalación**  
   ```bash
   npm install          # dependencias del root (vacío hoy, pero mantiene lockfile)
   npm install --prefix backend
   npm install --prefix frontend
   ```
2. **Configurar variables de entorno**  
   - Backend: crear `backend/.env` siguiendo `backend/README.md`.
   - Frontend: duplicar `frontend/.env.example` (ver sección siguiente) a `frontend/.env`.
3. **Levantar servicios**  
   - Base de datos: `docker compose up db -d`
   - Backend: `npm run dev --prefix backend`
   - Frontend: `npm run dev --prefix frontend`

## Variables de entorno
### Frontend
Duplicá el archivo `frontend/.env.example` y ajustá la URL de la API según corresponda:

```ini
VITE_API_URL=http://localhost:3000/api
```

### Backend
Consultá `backend/README.md` para la lista completa (`PORT`, `DATABASE_URL`, `JWT_SECRET`, etc.).

## Scripts útiles
- `npm run dev --prefix backend`: inicia la API con nodemon.
- `npm run dev --prefix frontend`: inicia el cliente Vite.
- `docker compose up -d`: sube Postgres y pgAdmin.

## Próximos pasos sugeridos
- Configurar CI (lint/tests) para PRs.
- Añadir documentación de endpoints (Swagger o similar).
- Agregar seeds/migraciones adicionales según evolucione el modelo.

