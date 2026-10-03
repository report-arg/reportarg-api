# reportarg-api

**ReportARG** es un sistema de información que busca mejorar la comunicación y la participación ciudadana en los barrios, conectando a vecinos e instituciones locales. 

Este repositorio contiene la **API Backend**, responsable de gestionar la lógica de negocio, reglas de seguridad, orquestación de operaciones y la persistencia de datos en la base de datos relacional.

---

## 🚀 Tecnologías (Stack)

- **Entorno:** [Node.js](https://nodejs.org/)
- **Framework:** [Express](https://expressjs.com/)
- **Base de Datos:** MySQL (con paquete `mysql2`)
- **Autenticación:** JSON Web Tokens (`jsonwebtoken`, `bcryptjs`)
- **Almacenamiento (Archivos):** Cloudinary / Multer
- **Testing:** [Jest](https://jestjs.io/) y Supertest
- **Documentación API:** Swagger (`swagger-ui-express`, `swagger-autogen`)

---

## 📋 Requisitos Previos

- **Node.js**: v18 o superior.
- **MySQL**: Servidor local o remoto.

---

## 🛠️ Instalación y Configuración

1. **Clonar e instalar dependencias:**
   ```bash
   git clone <repo_url>
   cd reportarg-api
   npm install
   ```

2. **Variables de Entorno (`.env`):**
   Duplica el archivo `.env.example` y nómbralo `.env`. Completa las variables necesarias.
   *(No modifiques el `.env.example` con secretos reales ni subas el `.env` al repositorio)*.
   
   Ejemplo conceptual de `.env`:
   ```env
   # Base de Datos
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=tu_password
   DB_NAME=reportarg_db

   # Servidor y Seguridad
   PORT=3001
   JWT_SECRET=tu_secreto_jwt_largo
   JWT_REFRESH_SECRET=tu_secreto_jwt_refresh

   # Proveedores Externos
   CLOUDINARY_CLOUD_NAME=tu_cloud_name
   CLOUDINARY_API_KEY=tu_api_key
   CLOUDINARY_API_SECRET=tu_api_secret
   ```

3. **Base de Datos:**
   Ejecuta los scripts que se encuentran en `/migrations` siguiendo la guía [Reglas de Migraciones](migrations/REGLAS_MIGRACIONES.md).

---

## 💻 Ejecución Local y Scripts Principales

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Inicia el servidor en modo desarrollo con recarga automática (`nodemon`). Genera Swagger previamente. |
| `npm start` | Inicia el servidor para entornos de producción. |
| `npm test` | Ejecuta la suite de pruebas unitarias y de integración de Jest. |
| `npm run docs` | Genera o actualiza el archivo JSON de Swagger de forma manual. |

La API normalmente se levanta en `http://localhost:3001`.
Puedes visualizar la documentación interactiva en `http://localhost:3001/api/docs`.

---

## 📁 Estructura General

```
/
├── docs/                 # Documentación técnica extendida.
├── migrations/           # Scripts SQL y reglas de despliegue.
├── src/
│   ├── config/           # Configuraciones generales (CORS, Base de datos).
│   ├── constants/        # Roles, reglas de negocio y enumeradores.
│   ├── middlewares/      # Interceptores (auth, error handler).
│   ├── modules/          # Código separado por dominio de negocio.
│   │   ├── <modulo>/
│   │   │   ├── controllers/
│   │   │   ├── models/
│   │   │   ├── routes.js
│   │   │   └── services/ (cuando aplica)
│   ├── services/         # Servicios transversales (Notificaciones, Auth general).
│   └── app.js            # Montaje principal de Express.
├── tests/                # Pruebas automatizadas (Auth, Reclamos, Comunicados, etc.).
└── package.json
```

---

## 📚 Documentación Adicional Disponible

Antes de modificar comportamientos, por favor lee las definiciones arquitectónicas:

- **[Arquitectura y Reglas Generales](docs/arquitectura_y_reglas.md)**: Flujos de información, modelo territorial multi-ciudad, patrón de arquitectura en capas y decisiones de diseño.
- **[Módulo de Reclamos - Sprint 4](docs/sprint4_reclamos.md)**: Reglas, transiciones de estado, permisos y privacidad de los reclamos.
- **[Reglas de Migraciones](migrations/REGLAS_MIGRACIONES.md)**: Cómo crear y desplegar bases de datos y scripts de mutación.
- **[AGENTS.md](AGENTS.md)**: Reglas directas para agentes/IA que modifiquen el código del proyecto.