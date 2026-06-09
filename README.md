# Orion

Orion es una plataforma web para productividad personal y colaborativa: proyectos, tareas, notas, notebooks, calendario, conexiones sociales y utilidades de administracion en una sola aplicacion.

Esta construida con Next.js (App Router), TypeScript, Prisma y PostgreSQL.

## Que incluye el sistema

- Autenticacion con sesion y flujo de setup inicial de administrador.
- Dashboard con actividad, agenda y resumen general.
- Gestion de proyectos (detalle, miembros, documentacion, tareas, ajustes).
- Modulo de notebooks y documentos.
- Calendario y eventos.
- Modulo social (perfil, conexiones, solicitudes).
- Area de administracion.
- Endpoints API para cada modulo bajo `src/app/api`.

## Stack tecnico

- `Next.js 16` + `React 19`
- `TypeScript`
- `Prisma ORM`
- `PostgreSQL 15`
- `Tailwind CSS 4`
- `Vitest` para pruebas unitarias
- `Docker` y `Docker Compose` para despliegue/contenedorizacion

## Requisitos

- Node.js 20+
- npm 10+
- Docker y Docker Compose (opcional, recomendado para server)

## Variables de entorno

Crea un archivo `.env` en la raiz del proyecto.

Ejemplo minimo para local:

```env
DATABASE_URL="postgresql://orion_admin:orion_password@localhost:5432/orion_db?schema=public"
JWT_SECRET="cambia_este_valor_por_uno_largo_y_seguro"
APP_ENCRYPTION_KEY="cambia_esta_clave_por_una_larga_y_segura"
INTERNAL_APP_URL="http://127.0.0.1:3000"
COOKIE_SECURE="false"
```

Para entorno con Docker Compose tambien se usan (opcionales con defaults):

```env
POSTGRES_USER=orion_admin
POSTGRES_PASSWORD=orion_password
POSTGRES_DB=orion_db
APP_PORT=3000
DB_PORT=5432
```

## Inicio rapido en desarrollo (sin contenedor de app)

1) Clonar e instalar dependencias

```bash
git clone https://github.com/rober26/orion.git
cd orion
npm install
```

2) Levantar solo la base de datos

```bash
docker compose up -d db
```

3) Preparar Prisma

```bash
npx prisma generate
npx prisma db push
```

4) Iniciar la aplicacion

```bash
npm run dev
```

5) Abrir en navegador

- `http://localhost:3000/setup` (primer arranque)
- `http://localhost:3000/login`

## Inicio con Docker Compose (app + db)

Levanta todo en modo produccion:

```bash
docker compose up -d --build
```

Parar servicios:

```bash
docker compose down
```

Ver logs:

```bash
docker compose logs -f app
docker compose logs -f db
```

Nota: el contenedor `app` ejecuta `npx prisma db push` al iniciar (definido en `Dockerfile`).

## Scripts disponibles

```bash
npm run dev          # desarrollo
npm run build        # build de produccion
npm run start        # ejecutar build
npm run lint         # lint
npm run test:unit    # pruebas unitarias
```

## Estructura del proyecto

```text
src/
  app/
    (dashboard)/      rutas de interfaz principal
    api/              endpoints backend
  components/         componentes UI
  lib/                auth, permisos, prisma, utilidades

prisma/
  schema.prisma       modelo de datos

docker-compose.yml    stack de app + postgres
Dockerfile            build/ejecucion de app en contenedor
```

## Despliegue en servidor (flujo recomendado)

```bash
git pull
docker compose down
docker compose up -d --build
docker compose ps
docker compose logs -f app
```

## Solucion de problemas comunes

### Error de build por tipos de Prisma

Si aparece un error de tipo tras cambios en `schema.prisma`:

```bash
npx prisma generate
npm run build
```

Si usas contenedores, reconstruye la imagen:

```bash
docker compose up -d --build
```

### Error de conexion a BD

- Revisa `DATABASE_URL`.
- Verifica que `db` este healthy: `docker compose ps`.
- Comprueba puertos `APP_PORT` y `DB_PORT`.

### Setup inicial no disponible

Si ya existe un admin, la ruta de setup puede cambiar de comportamiento. Usa login normal en `/login`.

## Seguridad y buenas practicas

- No subas `.env` al repositorio.
- Usa secretos fuertes para `JWT_SECRET` y `APP_ENCRYPTION_KEY`.
- En produccion, usa `COOKIE_SECURE=true` y publica Orion detras de HTTPS.
- Realiza backups periodicos de PostgreSQL.

## Estado del proyecto

Orion esta en evolucion continua. El repositorio contiene una base funcional amplia y se siguen iterando mejoras de UX, modulos y estabilidad.
