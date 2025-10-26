# JWT_ManagamentDB

Proyecto para gestión de usuarios con autenticación JWT.

Este repositorio contiene una API en Express que gestiona autenticación (registro/login) y un CRUD de personas, además de una interfaz front-end creada con Vite + React para interactuar con la API. El frontend incluye la opción de seleccionar la base de datos (MongoDB o Postgres) en la UI, aunque el backend principal está configurado para MongoDB.

## Estructura del repositorio

- `Express-server/` - Backend en Node/Express. Contiene:
	- `server.js`, `model.js`, `user.js`, `db_pg.js`, `init_db.sql` y `Dockerfile`.
- `ReactWithForm/` - Frontend en React (Vite) con formularios y componentes para autenticación y CRUD.
- `docker-compose.yml` - Orquesta servicios (API, frontend y base de datos). El stack incluido levanta un servicio `mongo` (imagen oficial `mongo:6`) y exporta `MONGODB_URI` al backend.

## Requisitos

- Docker & Docker Compose 

## Levantar el proyecto (con Docker, recomendado)

1. Desde la raíz del proyecto, construye y levanta los servicios:

```bash
docker-compose up -d --build
```

2. Esto debería levantar la base de datos, el servidor Express y la aplicación React.

3. Abre el frontend en `http://localhost:5173` (o el puerto que indique Vite).

## Endpoints principales (resumen)

- `POST /auth/register` - registrar usuario (devuelve token JWT)
- `POST /auth/login` - iniciar sesión (devuelve token JWT)
- Rutas protegidas para CRUD de personas.

Revisa los archivos en `Express-server` para ver los paths exactos y las validaciones.