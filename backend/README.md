# Backend – Finance App

Aplicación API para el manejo de finanzas personales construida con Express y Prisma.

## Requisitos
- Node.js 18+
- PostgreSQL 15 (puede levantarse con `docker-compose` en la raíz del monorepo)

## Variables de entorno
Definí un archivo `.env` en `backend/` con las claves necesarias:

```ini
PORT=3000
DATABASE_URL="postgresql://admin:admin123@localhost:5432/finance?schema=public"
JWT_SECRET="cambia-esto-por-un-secreto-seguro"
```

- `PORT`: puerto donde escuchará la API (por defecto 3000).
- `DATABASE_URL`: cadena de conexión para Prisma; debe apuntar a la base Postgres que uses localmente o en producción.
- `JWT_SECRET`: secreto usado para firmar y validar los tokens JWT; elegí un valor largo y aleatorio.

Si se agregan nuevas variables, documentalas en esta misma sección.

## Scripts disponibles
```bash
npm install        # instala dependencias
npm run dev        # levanta la API con nodemon (hot reload)
```

## Prisma
- Generar el cliente: `npx prisma generate`
- Aplicar migraciones: `npx prisma migrate dev`
- Poblar datos iniciales: `npx prisma db seed`

Cada vez que modifiques `schema.prisma`, recordá regenerar el cliente.

## Flujo de desarrollo
1. Asegurate de que Postgres esté corriendo (`docker compose up db -d` desde la raíz, si usás el compose provisto).
2. Configurá `.env` con la URL de base y el secreto JWT.
3. Ejecutá `npm run dev` y consumí la API desde el frontend (`frontend/`) o herramientas como Postman.

