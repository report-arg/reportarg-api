# 📜 Reglas de Migración de Base de Datos y Flujo de Trabajo — ReportARG

## 🔄 Flujo de Git y Entornos

1. **Ramas principales**:
   - `develop` ➔ Conectada a la API e instancia de Base de Datos de **Staging** (nombre del servicio en Railway: `dbReportARG_staging`).
   - `main` ➔ Conectada a la API e instancia de Base de Datos de **Producción** (nombre del servicio en Railway: `dbReportARG_production`).
   Nombre de ambas BD en Railway: `railway`

2. **Desarrollo de Historias de Usuario (HUs)**:
   - Cada desarrolladora crea su rama desde `develop` (ej: `feature/HU-01-reclamos-publicos`).
   - Los cambios de backend y scripts de migración se prueban primero en **Staging**.
   - Al finalizar y aprobar el PR hacia `develop`, Staging se despliega automáticamente.
   - Una vez validado en Staging por QA/equipo, el PR se promueve hacia `main` (Producción).

---

## 🗄️ Reglas de Migración de Base de Datos

1. **Archivos de Migración en `/migrations`**:
   - Cada cambio de esquema (nuevas tablas, columnas o índices) debe guardarse como un archivo SQL numerado cronológicamente dentro de `reportarg-api/migrations/`.
   - Ejemplo: `001_sprint4_schema_reclamos.sql`.

2. **Principios de Ejecución**:
   - **Idempotencia**: Usar `CREATE TABLE IF NOT EXISTS` y `ADD COLUMN IF NOT EXISTS` o consultas defensivas para evitar errores en ejecuciones repetidas.
   - **No destructivo**: No eliminar tablas ni columnas existentes en producción sin un respaldo explícito.
   - **Secuencia de Promoción**:
     1. Probar la migración en la base de datos de **Staging** (`MySQL Copy`).
     2. Validar que la API funcione correctamente en `develop`.
     3. Ejecutar la misma migración en la base de datos de **Producción** (`MySQL`) al promocionar a `main`.

---

## 🛠️ Ejecución para el Sprint 4 (Reclamos)

El archivo [`001_sprint4_schema_reclamos.sql`](./001_sprint4_schema_reclamos.sql) contiene todas las definiciones estructurales del Sprint 4:
- Creación de tablas: `ciudades`, `institucion_categorias`, `reclamos_afectados`, `reclamos_actualizaciones`, `reclamos_historial`.
- Actualización de columnas en `usuarios`, `instituciones` y `reclamos`.
- Transición del ENUM de estados: `Pendiente` → `En revisión` → `En proceso` → `Resuelto` y `Cancelado`.
