# 📜 Reglas de Migración de Base de Datos y Flujo de Trabajo — ReportARG

## 🔄 Flujo de Git y Entornos

1. **Ramas principales**:
   - `develop` ➔ Conectada a la API e instancia de Base de Datos de **Staging** (`dbReportARG_staging`).
   - `main` ➔ Conectada a la API e instancia de Base de Datos de **Producción** (`dbReportARG_production`).

2. **Desarrollo de Historias de Usuario (HUs)**:
   - Crear rama desde `develop`.
   - Crear script de migración versionado en `/migrations`.
   - Probar y ejecutar en **Staging**.
   - Validar aplicación y tests.
   - Al promover el PR a `main`, ejecutar **LA MISMA** migración en **Producción**.
   - NUNCA editar una migración que ya fue aplicada en Producción. Si hay un error, crear una NUEVA migración de corrección.
   - NUNCA modificar la base de datos manualmente y luego intentar adivinar los cambios.

---

## 🗄️ Baseline y Estado Actual

Actualmente, las bases de datos de **Staging y Production se encuentran idénticas y sincronizadas**. 

El **Baseline** de las bases de datos actuales está conformado por un historial de **Migraciones Válidas**. 

**Importante:** Estas 7 migraciones representan el *baseline histórico reconocido de las bases actuales*. No se garantiza que, por sí solas y sin una inicialización previa de estructura, reconstruyan una base de datos vacía desde cero.

Las numeraciones `005`, `007` y `010` correspondieron a scripts históricos de limpieza/prueba retirados del repositorio actual. Sus antecedentes permanecen disponibles en el historial de Git y estas numeraciones no deben reutilizarse. La próxima migración debe ser la `011`.

Las **Migraciones Válidas** que componen el baseline histórico son:
- `001_sprint4_schema_reclamos.sql` (Esquema y Backfill)
- `002_insert_muni_viale.sql` (Dato Maestro)
- `003_seed_catalogo_categorias.sql` (Dato Maestro)
- `004_viale_city_context_backfill.sql` (Backfill)
- `006_nuevas_instituciones_responsables.sql` (Dato Maestro)
- `008_notificaciones_sprint4.sql` (Esquema)
- `009_comunicados_imagen.sql` (Esquema)

### Registro de Migraciones (`schema_migrations`)

Para saber exactamente qué migraciones válidas ya fueron aplicadas, el proyecto utilizará la tabla de auditoría `schema_migrations`.

**Separación de responsabilidades:** 
Los scripts SQL en `/migrations` **solo** deben contener los comandos propios de la migración (creación de tablas, alteración, datos maestros). **No** deben incluir comandos `INSERT INTO schema_migrations` dentro del propio archivo, ya que el archivo no debe responsabilizarse de su propio registro exitoso.

Por el momento (y hasta que se implemente el runner), el registro es **manual**:
1. Ejecutar el script SQL de la migración en la base de datos.
2. Si (y solo si) fue exitoso, ejecutar manualmente:
   `INSERT INTO schema_migrations (migration_name) VALUES ('011_nueva_tabla.sql');`

#### 🚀 Mejora Futura: Runner Automático
En el futuro, se implementará un runner (ej: `npm run migrate`) que automatice este proceso:
1. Lea las migraciones ordenadas en `/migrations`.
2. Consulte `schema_migrations` para determinar cuáles están pendientes.
3. Ejecute únicamente las pendientes.
4. Registre en `schema_migrations` solo si la migración finalizó sin errores.
5. Se detenga automáticamente ante el primer error para evitar corrupción.

---

## 🏗️ Convención para Nuevas Migraciones

1. **Nomenclatura**:
   `011_descripcion_corta.sql` (Secuencial y descriptivo).
2. **Idempotencia**:
   Intentar usar `CREATE TABLE IF NOT EXISTS` cuando sea posible, aunque el control real lo lleva la tabla `schema_migrations`.
3. **Contenido Permitido**:
   - Cambios de estructura (DDL: Tablas, Columnas, Índices).
   - Datos Maestros (Ciudades, Categorías, Instituciones Principales, asignaciones formales).
   - Backfills (Transformación de datos existentes para adaptarse a un nuevo esquema).
4. **Contenido PROHIBIDO**:
   - Datos de prueba (Usuarios ficticios, reclamos de prueba, notificaciones, contraseñas hardcodeadas).
   - Tokens de sesión o credenciales.
   *(Cualquier script con datos de prueba debe vivir en una carpeta separada de testing, nunca en `/migrations`).*

---

## 🛠️ Ejecución de Cambios Estructurales o Riesgosos

1. Revisar los scripts de `/migrations` existentes.
2. Escribir el nuevo script.
3. Si el cambio destruye columnas o altera tablas críticas, **realizar un dump/backup** de la base de datos afectada antes de aplicar. *(Guardar los dumps en la carpeta local `/backups/` que está ignorada en Git).*
4. Ejecutar el script SQL de forma manual en el cliente de base de datos correspondiente (Staging primero, Producción después del merge).
