# Instrucciones para agentes — ReportARG API

Este archivo se aplica a todo el repositorio. Antes de editar, revisá la solicitud, el estado de la rama, los archivos relacionados y la documentación de dominio. No ejecutes migraciones o cambios sobre una base de datos compartida como parte de una comprobación rutinaria.

## Contexto y fuentes

La API usa Express, CommonJS y MySQL mediante `mysql2`. El recorrido habitual de una petición es `src/routes/` → `src/controllers/` → `src/services/` cuando hay lógica de dominio → `src/models/` para persistencia.

Consultá según el cambio:

- `docs/arquitectura_y_reglas.md`: ciudad, instituciones y reglas generales.
- `docs/sprint4_reclamos.md`: alcance y decisiones del módulo de reclamos; verificá el estado real en código antes de dar una historia por implementada.
- `migrations/REGLAS_MIGRACIONES.md`: flujo de esquemas y entornos.
- `src/app.js`: montaje de rutas y protección del prefijo `/api/admin`.
- `src/middlewares/authMiddleware.js` y `src/constants/roles.js`: autenticación y roles.
- `src/constants/publication.js`: constantes de publicaciones, categorías, estados y eventos.
- El frontend de ReportARG: consumidores de los contratos de la API.

## Reglas de implementación

1. Trabajá en la rama indicada y preservá cambios ajenos. No mezcles una modificación de dominio con una refactorización general innecesaria.
2. Protegé cada endpoint según su operación. Aplicá `verifyToken` y la autorización de rol correspondiente en las rutas; comprobá además propiedad, institución asignada y visibilidad donde corresponda. Un control en el frontend no sustituye la autorización del backend.
3. Derivá identidad, rol, ciudad e institución del contexto autenticado (`req.user`) y de consultas confiables. No aceptes `id_usuario`, `id_ciudad` o `id_institucion` enviados por el cliente como autoridad para acceder o modificar datos.
4. Mantené el aislamiento por ciudad en feed, reclamos, comunicados, mapa y consultas institucionales. No fijes Viale ni `id_ciudad = 1` en la lógica de ejecución; el backfill histórico no es una regla de negocio.
5. Conservá la separación entre reclamos y comunicados. Los reclamos privados no deben aparecer en consultas públicas, mapas ni respuestas para usuarios sin permiso.
6. Para reclamos, respetá la máquina de estados, las reglas de edición, cancelación, reapertura e historial que estén implementadas y documentadas. Consultá el código actual antes de modificar una transición. No inventes permisos o estados nuevos.
7. La asignación de una institución depende de ciudad y categoría, con respaldo en la institución principal de esa misma ciudad. Reutilizá `src/services/assignmentService.js`; no dupliques la búsqueda en controladores.
8. Usá consultas parametrizadas. Si una operación modifica varias tablas que deben permanecer consistentes, evaluá una transacción y asegurá rollback ante error. Registrá los eventos de historial exigidos por el flujo.
9. Conservá los contratos de respuesta existentes o actualizá de forma coordinada sus consumidores. No cambies nombres de campos, rutas o semántica de errores sin revisar frontend, pruebas y documentación.
10. Validá entradas en el servidor y devolvé mensajes adecuados sin exponer credenciales, tokens, detalles SQL ni datos privados en respuestas o logs.
11. **Consistencia de firmas:** Si modificás la firma de un método en `src/models/` (por ejemplo, agregando un nuevo filtro o parámetro), es obligatorio que revises todos los `src/controllers/` que lo invocan para asegurarte de que estén enviando los argumentos correctamente. Un parámetro olvidado en el controlador puede romper silenciosamente la consulta.

## Base de datos y pruebas

Los cambios de esquema van en un archivo SQL nuevo y secuencial bajo `migrations/`, siguiendo `migrations/REGLAS_MIGRACIONES.md`. No edites una migración ya aplicada para representar un cambio nuevo. Prepará y verificá el script, pero ejecutalo en Staging o Producción solo cuando la tarea incluya expresamente ese paso y el entorno esté identificado.

Para cambios de comportamiento, agregá o ajustá pruebas significativas, especialmente de permisos, privacidad, ciudad y transiciones de reclamos. El comando disponible es:

```bash
npm test
```

`npm test` ejecuta primero la generación de documentación y luego Jest. Informá si una prueba necesita servicios o variables de entorno que no están disponibles. Al entregar, detallá el contrato afectado, las pruebas ejecutadas, las migraciones preparadas o ejecutadas y cualquier cambio que deba coordinarse con el frontend.

## Idioma y comunicación

- Escribí siempre en español los comentarios de código, mensajes de commit, descripciones de PR, respuestas, documentación y cualquier otra redacción.
- Conservá en inglés los nombres técnicos, APIs, comandos, archivos e identificadores cuando lo requiera la tecnología o sea la convención existente del proyecto. No renombres elementos solo para traducirlos.
- Explicá las decisiones relevantes y las limitaciones con lenguaje claro. Distinguí lo implementado, lo verificado y lo pendiente.

## Documentación

- Revisá si los cambios requieren actualizar el `README.md` y hacelo cuando cambien la instalación, configuración, comandos, rutas principales o funcionamiento descrito.
- Actualizá `docs/arquitectura_y_reglas.md` del backend cuando cambien decisiones de arquitectura, reglas generales, permisos o contratos entre frontend y backend.
- Actualizá `docs/sprint4_reclamos.md` cuando el cambio afecte reglas o comportamientos del módulo de reclamos.
- Evitá duplicar explicaciones en varios documentos: mantené una fuente principal y enlazala desde los demás.
- Si la documentación contradice el código, identificá la diferencia y resolvela según la tarea y las decisiones confirmadas. No cambies una regla de negocio solo para hacerla coincidir con una implementación.
- No describas como implementada una funcionalidad que todavía sea una propuesta.

## Calidad y mantenimiento

- Reutilizá componentes, servicios, constantes y utilidades existentes antes de crear otros equivalentes.
- Separá responsabilidades y extraé código compartido cuando exista repetición real. Evitá abstracciones innecesarias.
- Conservá las convenciones del proyecto y evitá cambios masivos de formato o nombres ajenos a la tarea.
- Agregá dependencias únicamente cuando aporten una solución necesaria y no exista una alternativa adecuada en el proyecto.
- Revisá el diff final: eliminá imports sin uso, código temporal, logs de depuración y archivos generados que no deban versionarse.
- No incluyas secretos, credenciales ni contenido de archivos `.env` en commits, documentación o respuestas.
- Antes de entregar, comprobá que los cambios no rompan otros roles, consumidores de la API o flujos relacionados.

## Consistencia de operaciones y contratos

- Considerá concurrencia y solicitudes repetidas cuando una operación tenga límites, cambie estados o cree relaciones únicas. Una validación previa aislada puede no ser suficiente.
- Si una operación debe actualizar datos e historial de manera conjunta, asegurá su consistencia mediante una transacción cuando corresponda.
- Al modificar una respuesta de API, revisá todos sus consumidores y las pruebas relacionadas. Documentá cualquier cambio incompatible.
- Las pruebas deben usar datos controlados y un entorno de prueba identificado. No utilices datos reales de Producción ni ejecutes operaciones destructivas sobre una base compartida para verificar código.