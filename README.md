# ORION

**Orion** es un sistema de **gestión de proyectos y biblioteca de apuntes**, desarrollado para el **TFG de DAM**.  
Integra organización de proyectos, notas jerárquicas, calendario y colaboración básica, con una arquitectura moderna basada en **Next.js + TypeScript + Prisma**.

---

## Objetivo del proyecto (TFG)

El objetivo de Orion es ofrecer un entorno unificado donde un usuario pueda:

- Gestionar proyectos y tareas
- Organizar apuntes y conocimiento en formato jerárquico
- Planificar eventos mediante calendario
- Centralizar documentos y archivos dentro de un mismo sistema

---

## Tecnologias utilizadas

- **Next.js (App Router)**
- **TypeScript**
- **Prisma ORM**
- **PostgreSQL**
- **TailwindCSS**
- **JWT Auth (cookies)**
- **Docker Compose** (para BD y sistema en un futuro)

---

## Funcionalidades principales (prototipo)

### Autenticación

- Login con JWT + cookies
- Setup inicial de admin

### Proyectos

- Crear proyectos
- Listado de proyectos
- Vista de detalle

### Notebooks (apuntes)

- Crear notebooks
- Crear documentos
- Carpetas jerárquicas

### Calendario

- Vista calendario (base)
- Endpoints de eventos iniciales

---

## Limitaciones actuales del prototipo

- CRUD completo de calendario y tareas aún no implementado
- Módulo social/conexiones definido a nivel de BD pero sin UI completa
- Módulo de tareas no implementado

---

## Instalación rápida (Docker Compose)

### 1. Clonar repositorio

```bash
git clone https://github.com/rober26/orion.git
cd orion
```

### 2. Crear archivo .env

Crea un archivo .env en la raíz:

```env
DATABASE_URL="postgresql://orion_admin:orion_password@localhost:5432/orion_db?schema=public"
JWT_SECRET="orion_jwt_secret_super_seguro"
```

### 3. Levantar base de datos

```bash
docker compose up -d
```

### 4. Instalar dependencias

```bash
npm install
```

### 5. Ejecutar migraciones de Prisma

```bash
npx prisma migrate dev --name init
```

### 6. Iniciar aplicación

```bash
npm run dev
```

## Primer acceso (Setup admin)

Cuando ejecutes el proyecto por primera vez:

Abre en el navegador:

```URL
http://localhost:3000/setup
```

Crea el usuario administrador.

Luego podrás iniciar sesión en:

```URL
http://localhost:3000/login
```

Estructura del proyecto (resumen)
src/
  app/
    (auth)/         # login, setup
    (dashboard)/    # proyectos, notebooks, calendar
    api/            # endpoints API (auth, notebooks, projects)
  components/       # componentes UI
  lib/              # utilidades y prisma

prisma/
  schema.prisma
Estado actual (TFG)

 Prototipo funcional

 Arquitectura sólida

 Base de datos completa

 Algunas funcionalidades en progreso
