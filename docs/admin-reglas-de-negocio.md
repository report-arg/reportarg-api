# ReportARG — Reglas de negocio y especificación del Panel Admin

> Documento vivo para orientar ADMIN-01 y su integración con CITY01–CITY05.
> Distingue decisiones acordadas de propuestas pendientes. No implica que todo esté implementado ni autoriza a desarrollar todo de una vez.

## 1. Propósito del sistema

ReportARG conecta ciudadanos con instituciones de sus localidades. Centraliza la comunicación comunitaria, la difusión de información oficial y la creación y gestión de reclamos. La ciudad es una entidad central: reclamos, instituciones y contenido local deben estar asociados a una ciudad. El sistema debe poder crecer desde una localidad inicial a múltiples ciudades de Argentina.

## 2. Enfoque del Panel Admin

El panel `/admin` administra la plataforma: usuarios, instituciones, ciudades, solicitudes, categorías, configuración y supervisión. No es un segundo panel institucional ni debe reemplazar la gestión cotidiana de reclamos.

### Métricas y reclamos

El total global de reclamos no debe ser un KPI principal del administrador. La cantidad por sí sola no indica si la plataforma está bien administrada.

Sí son útiles, como indicadores secundarios:
- Reclamos asignados, pendientes, en proceso y resueltos por institución.
- Antigüedad del reclamo pendiente más antiguo.
- Actividad institucional reciente.
- Cantidad de reclamos creados por usuario, como contexto para detectar actividad atípica, nunca como sanción automática.
- Reclamos que requieren intervención administrativa.

El panel institucional es el lugar principal para la gestión operativa y las estadísticas detalladas de reclamos.

### Acceso a Comunidad

El administrador puede entrar a la experiencia de Comunidad (`/ciudadano`) desde la interfaz administrativa, sin perder ni degradar su rol administrativo ni alterar su sesión.
- **Selección de ciudad al ingresar (Confirmado):** Como el administrador tiene alcance global pero la comunidad y la creación de reclamos operan sobre una localidad específica, al ingresar a `/ciudadano` debe mostrarse un modal para elegir a qué ciudad activa ingresar (pudiendo cambiarla luego desde el selector de ciudad de la vista comunitaria).
- **Creación de reclamos (Confirmado):** El administrador no crea reclamos desde `/admin` (se elimina `/admin/reclamos/nuevo`); puede crear reclamos dentro de la experiencia de Comunidad (`/ciudadano`) en la ciudad activa que haya seleccionado.
- La moderación comunitaria debe permanecer conceptualmente separada de la gestión de usuarios, instituciones y ciudades. Las acciones destructivas deben tener confirmación y trazabilidad. El alcance exacto de moderación está pendiente de definición.

## 3. Roles

Roles actuales del dominio:
- `admin`: administra la plataforma.
- `ciudadano`: utiliza las comunidades.
- `institucion`: opera como institución dentro de una ciudad.

No crear roles ficticios como `moderador`, `editor` o `super_admin`, ni RBAC granular dinámico sin decisión y soporte real. Una pantalla de roles simulada no debe presentarse como funcionalidad real.

El backend debe validar permisos; ocultar botones en frontend no es autorización.

## 4. Modelo de ciudades

La ciudad tiene estado activo/inactivo. Este estado es independiente de la verificación, habilitación, operaciones, categorías y designación de institución principal.

### Institución principal

Para que una ciudad exista como comunidad operativa debe tener una institución principal válida, seleccionada explícitamente por el administrador al activar la ciudad. Puede ser, por ejemplo, una municipalidad.

La institución principal:
- Es responsable general de la comunidad.
- Debe poder cubrir todas las categorías como respaldo.
- Recibe reclamos cuando no existe una institución especializada elegible.
- No desplaza a una institución especializada autorizada para la categoría correspondiente.

Si la institución principal deja de ser válida, la ciudad no debe continuar operando normalmente hasta resolverlo. No asignar responsabilidades a una institución inválida.

### Ciudad inactiva

Si un ciudadano intenta entrar a una ciudad inactiva, debe ver una pantalla reutilizable que explique la situación, permita solicitar activación/reactivación y ofrezca continuar como visitante hacia otra ciudad activa.

El modo visitante es solo lectura: permite consultar información pública, pero no crear reclamos, publicar, comentar ni consultar datos privados o de auditoría. Las instituciones no tienen modo visitante.

## 5. Ciudadanos y ciudades vinculadas

Cada ciudadano tiene:
- Una ciudad de residencia.
- Hasta tres ciudades adicionales de interés.

Puede agregar o quitar ciudades de interés y seleccionar cuál consultar, según las reglas de acceso. No implementar ahora el cambio de ciudad de residencia. Una ciudad de interés no implica residencia ni permisos institucionales.

## 6. Instituciones

### Registro y estados

La institución se registra con datos identificatorios y de contacto y requiere validación administrativa antes de operar oficialmente.

Deben distinguirse los conceptos de:
- Estado de solicitud: pendiente, aprobada/activa o rechazada, según el modelo definitivo.
- Verificación (`verificada`), si se mantiene como atributo separado.
- Habilitación/suspensión operativa.
- Ciudad de operación.
- Designación como institución principal.
- Operaciones autorizadas.
- Categorías autorizadas por operación.

No asumir que `status`, `verificada` y `activo` significan lo mismo. Inspeccionar el esquema real antes de modificarlo.

### Rechazo y Suspensión

El rechazo requiere motivo obligatorio y persistido. La institución debe poder consultar ese motivo. Debe conservarse el historial de solicitudes y decisiones. Una institución rechazada no debe reaparecer como pendiente por una inconsistencia de estado.

- **Ventana de gracia tras rechazo y acciones disponibles (Confirmado):** Cuando se rechaza una institución (`status = 'rejected'`), se persiste `motivo_rechazo` y `fecha_rechazo = NOW()`. La cuenta permanece activa sin permisos operativos durante **7 días** desde la fecha de rechazo (vencido ese plazo sin acción, la cuenta se desactiva automáticamente al intentar operar o iniciar sesión). Mientras esté dentro de los 7 días, en la vista institucional de estado (`verificada = 0`) visualiza:
  - Si `status = 'pending'`: estado **"Pendiente de verificación"** con los datos enviados.
  - Si `status = 'rejected'`: estado **"Solicitud rechazada"**, el **`motivo_rechazo`** y la alerta de cierre en 7 días, con dos acciones principales:
    1. **Corregir datos y volver a solicitar como institución:** actualiza los datos sobre la misma fila de `instituciones`, restablece `status = 'pending'` y limpia `fecha_rechazo = NULL` (conservando el rechazo previo en `admin_auditoria`).
    2. **Continuar como ciudadano:** permite convertir la cuenta actual (`id_usuario`) en ciudadano pidiendo únicamente `nombre` y `apellido` (reutilizando `email`, `provincia`, `ciudad` y `zona` sin duplicar el usuario ni chocar con el `UNIQUE` de `email`, creando el perfil en `ciudadanos`, cambiando `usuarios.tipo_usuario = 'ciudadano'` y eliminando/archivando en auditoría la solicitud institucional rechazada), o bien cerrar sesión y registrarse desde cero con otro correo electrónico.
- **Suspensión de institución principal (Confirmado):** Se bloquea la suspensión/inhabilitación de una institución que sea `es_principal = 1` de una ciudad activa, dado que una ciudad activa no puede existir sin institución principal válida. El administrador debe designar primero otra institución principal o desactivar la ciudad.
- **Reclamos abiertos al suspender una institución especializada (Confirmado):** Cuando se suspende/inhabilita una institución no principal, sus reclamos abiertos (`Pendiente`, `En revisión`, `En proceso`) se reasignan automáticamente a la institución principal de esa ciudad dentro de la misma transacción, dejando trazabilidad en el historial.

### Operaciones y categorías

> **Alcance en `ADMIN-01` (Confirmado):** El modelo de catálogo de **operaciones** y las **solicitudes de ampliación de operaciones/categorías** quedan documentados para una etapa/ticket posterior. En `ADMIN-01` se trabaja con la asignación directa de categorías por institución (`institucion_categorias`) y la designación de institución principal (`es_principal`).

Reglas conceptuales para su implementación futura:
Las operaciones y las categorías son conceptos diferentes:
- Una institución no puede solicitar categorías de una operación que no tiene habilitada.
- Si solo tiene una operación compatible, no mostrar un selector innecesario.
- Si tiene varias, permitir seleccionar la operación.
- Mostrar solo categorías pertinentes que todavía no estén autorizadas.
- Las solicitudes requieren aprobación administrativa explícita.
- El panel institucional debe tener una sección para consultar y gestionar solicitudes de operaciones y categorías.

Las instituciones especializadas solo reciben reclamos de las operaciones y categorías aprobadas para su ciudad. No tienen modo visitante ni pueden cambiar libremente de ciudad. Toda ampliación requiere aprobación.

Para el alcance actual se mantiene una cuenta por institución. Múltiples usuarios por institución quedan para una etapa futura.

## 7. Asignación de reclamos

Regla acordada: para cada combinación de ciudad y categoría debe existir una única institución responsable efectiva.

Al crear un reclamo:
1. Identificar ciudad y categoría.
2. Buscar una institución especializada habilitada y autorizada para esa ciudad, operación y categoría.
3. Si existe, asignar a la especializada.
4. Si no existe, asignar a la institución principal válida.
5. Si no existe institución principal válida, no aceptar una asignación inválida ni dejar el reclamo sin responsable. La ciudad debe considerarse no operativa hasta corregir su configuración.

La regla se implementa y prueba en backend. El administrador puede supervisar y, si el flujo actual lo permite, reasignar reclamos entre instituciones de la misma ciudad con motivo obligatorio y auditoría. El administrador no reemplaza a la institución en los cambios cotidianos de estado del reclamo.

## 8. Solicitudes administrativas

La bandeja debe contemplar:
- Verificación de instituciones.
- Activación/reactivación de ciudades.
- Solicitudes de operaciones.
- Solicitudes de categorías.
- Otros tipos futuros, cuando estén definidos.

Cada solicitud debe mostrar quién la presentó, entidad/ciudad, fecha, antigüedad, estado, información relevante, acciones permitidas e historial. No inventar datos ni mostrar botones sin respaldo de backend. Los módulos pendientes deben mostrar estados vacíos informativos.

## 9. Módulos del Panel Admin

### Dashboard
Debe responder: “¿Qué requiere atención administrativa?”. Priorizar:
- Usuarios totales, activos e inactivos.
- Nuevos registros en un período.
- Solicitudes pendientes por tipo.
- Instituciones pendientes de validación.
- Instituciones activas, suspendidas o rechazadas, según datos disponibles.
- Ciudades activas/inactivas.
- Ciudades sin institución principal válida.
- Solicitudes de operaciones y categorías pendientes.
- Alertas de posible inactividad institucional, si se aprueba.

Los indicadores de reclamos son secundarios y deben aportar contexto. No mostrar gráficos decorativos ni métricas sin fuente real.

### Usuarios
Listar (incluyendo ciudad asociada y cantidad de reclamos creados), buscar, filtrar por rol/estado, consultar datos administrativos pertinentes, crear nuevos usuarios (`/admin/users/new`), cambiar rol e inhabilitar/rehabilitar con confirmación. **Confirmado:** no se incluye edición de datos personales de usuarios existentes (`/admin/users/[id]/edit` queda fuera del flujo). Preservar integridad e historial mediante baja lógica cuando corresponda. Evitar que un administrador se auto-inhabilite o se quite sus propios permisos. Los cambios de rol y el alta de usuarios deben mantener consistencia entre `usuarios` y su tabla de perfil (`ciudadanos`/`instituciones`) y realizarse transaccionalmente.

### Instituciones
Listar y filtrar por ciudad/estado; consultar contacto, estado, verificación, habilitación, institución principal, operaciones y categorías autorizadas cuando CITY esté integrado; aprobar/rechazar con motivo e historial. No mostrar capacidades aún no soportadas por backend.

### Ciudades
Consultar estado, institución principal, solicitudes de activación/reactivación, instituciones y capacidades. Las acciones de activar/desactivar o cambiar institución principal deben estar respaldadas por backend, confirmarse y auditarse. No hardcodear Viale ni `id_ciudad = 1`.

### Solicitudes
Centralizar procesos administrativos y reutilizar la lógica de aprobación/rechazo institucional. No duplicar flujos entre `/admin/institutions` y `/admin/solicitudes`.

### Categorías
CRUD y baja lógica, respetando dependencias e historial. Distinguir categoría global de autorización institucional para atenderla en una ciudad/operación.

### Supervisión de reclamos
Lista paginada, filtros, detalle e historial, institución asignada, detección de asignaciones inconsistentes y reasignación con motivo cuando corresponda. No permitir al administrador operar estados cotidianos como si fuera la institución responsable.

### Comunidad
Acceso mediante la experiencia comunitaria. Moderación con permisos, confirmación, motivo e historial según política que se defina.

### Roles y configuración
No mostrar matrices de roles o switches falsos que solo cambien estado local. Toda configuración visible debe persistir y tener comportamiento real.

## 10. Inactividad institucional — propuesta

Se propone incorporar alertas de posible inactividad, no bajas automáticas. Posibles señales: falta de inicio de sesión, falta de gestión de reclamos, reclamos pendientes sin avances o falta de respuesta a solicitudes.

Antes de implementar hay que definir qué cuenta como actividad, umbrales, notificaciones, plazo de respuesta, consecuencias, tratamiento de reclamos abiertos y protección especial de la institución principal. Una alerta debe requerir revisión humana. No suspender automáticamente a la institución principal si deja a la ciudad sin responsable.

## 11. Auditoría

Registrar acciones sensibles: aprobar/rechazar institución, motivo, activar/desactivar ciudad, designar institución principal, aprobar/rechazar operaciones/categorías, inhabilitar/rehabilitar usuario, reasignar reclamos y moderar contenido.

Como mínimo: actor, acción, entidad afectada, fecha y motivo cuando corresponda. Verificar si existe infraestructura de auditoría antes de asumirlo.

## 12. Seguridad y consistencia

- Proteger todas las rutas administrativas en backend.
- Obtener el rol efectivo de una fuente confiable y permitir revocación inmediata.
- Verificar que la cuenta esté activa.
- No confiar en IDs, rol, ciudad, institución o permisos enviados por el cliente.
- Validar ciudad y capacidades en backend.
- Usar transacciones al modificar varias tablas relacionadas.
- Validar estado previo antes de aprobar, rechazar, suspender o reactivar.
- Evitar solicitudes duplicadas y transiciones incompatibles.
- No exponer información privada a visitantes.
- No hardcodear datos ni simular respuestas.

### Hallazgos previos para revalidar

Una auditoría anterior informó:
1. `authMiddleware.js` priorizaba el rol del JWT frente al rol de la base de datos.
2. La verificación institucional actualizaba varias tablas sin transacción.
3. El rechazo institucional no persistía correctamente `status = rejected` ni el motivo.
4. Había pantallas simuladas de roles/configuración.
5. Existía duplicación entre la bandeja de solicitudes y la tabla institucional.
6. Algunos componentes eran monolíticos y había CSS/componentes legacy.
7. Un formulario tenía ciudad hardcodeada.
8. Los tests unitarios usaban mocks SQL y convenía sumar integración con base de prueba.

Son antecedentes, no afirmaciones sobre el estado actual. Verificar en la rama de trabajo.

## 13. UX y arquitectura

- Layout administrativo unificado, navegación clara y componentes reutilizables.
- Reutilizar `ConfirmModal` si sigue siendo el componente establecido.
- Estados de carga, error, vacío y éxito.
- No cargar gráficos mediante scripts CDN y manipulación manual del DOM.
- No refactorizar masivamente fuera del objetivo.
- Backend como fuente de verdad; frontend consume contratos.
- Comentarios, commits, documentación y redacciones en español, salvo nombres técnicos o convenciones que deban mantenerse en inglés.
- Actualizar documentación cuando cambien reglas, modelos o endpoints.

## 14. Contexto técnico conocido

Según el diagnóstico previo: frontend Next.js/React/Tailwind, backend Node.js/Express y base MySQL; repositorios separados `report-arg` y `reportarg-api`; rutas administrativas bajo `/api/admin/*`. Verificar versiones, estructura y endpoints actuales antes de programar.

## 15. Tickets relacionados

| Ticket | Alcance |
|---|---|
| CITY01 | Seguridad |
| CITY02 | Ciudadanos: residencia y ciudades de interés |
| CITY03 | Instituciones: registro, ciudad operativa, operaciones y categorías |
| CITY04 | Administración: gestión territorial, institución principal y solicitudes |
| CITY05 | Pantalla reutilizable de estado de ciudad y solicitudes de activación/reactivación |

`ADMIN-01` desarrolla el panel y consume los contratos definidos por CITY. No duplicar ni contradecir reglas territoriales. Mientras una dependencia no exista, mostrar un estado pendiente honesto, sin simular operaciones.

## 16. Fuera del alcance actual / futuro

- Múltiples usuarios por institución.
- Roles administrativos granulares.
- Verificación de identidad por DNI o proveedores externos.
- IA para clasificación o moderación.
- Integraciones externas no aprobadas.
- SLA avanzado y penalizaciones automáticas.
- Analítica predictiva.
- Foros abiertos o chat en tiempo real.
- Baja automática de instituciones por inactividad.

---

# Propuestas y decisiones pendientes

## Propuestas recomendadas

1. **Dashboard centrado en pendientes:** instituciones por validar, solicitudes territoriales, operaciones/categorías, ciudades mal configuradas, alertas institucionales y contenido reportado.
2. **Ficha de actividad institucional:** asignados, pendientes, en proceso, resueltos en período, reclamo pendiente más antiguo y última actividad verificable. Comparar con contexto de ciudad, categoría y demanda.
3. **Ficha de actividad de usuario:** reclamos creados, publicaciones/comentarios si existen, reportes recibidos e historial de sanciones. Un volumen alto no debe sancionar automáticamente.
4. **Alertas de inactividad, sin baja automática:** notificar, dar oportunidad de respuesta y exigir decisión humana.
5. **Historial administrativo unificado:** cronología de acciones sobre usuario, institución o ciudad.
6. **Separar estado de solicitud y estado operativo:** una solicitud puede estar aprobada y la institución posteriormente suspendida.
7. **Moderación reversible:** preferir ocultar temporalmente antes de eliminar definitivamente, cuando sea viable, con motivo y auditoría.

## Decisiones ya confirmadas para `ADMIN-01`

1. **Rechazo institucional, ventana de 7 días, reintento y conversión a ciudadano:** La cuenta permanece activa sin permisos operativos durante 7 días tras el rechazo (`status = 'rejected'`, `motivo_rechazo`, `fecha_rechazo`). En la pantalla de estado institucional (`verificada = 0`) se informa el estado (pendiente o rechazado con motivo y alerta de 7 días), permitiendo: (a) corregir datos y reenviar la solicitud sobre la misma fila de `instituciones` (`status = 'pending'`), o (b) convertir la misma cuenta (`id_usuario`) a ciudadano ingresando `nombre` y `apellido` (creando perfil en `ciudadanos` y eliminando/auditando la fila en `instituciones` sin colisión de `email`), además de la opción de cerrar sesión para registrarse con otro correo.
2. **Operaciones y solicitudes de ampliación:** Quedan documentadas para una etapa posterior fuera de `ADMIN-01`. En `ADMIN-01` se administra la relación institución–categorías (`institucion_categorias`) y la institución principal (`es_principal`).
3. **Protección de institución principal ante suspensión:** Se bloquea la suspensión/inhabilitación de una institución mientras sea `es_principal = 1` de una ciudad activa.
4. **Reasignación automática al suspender una institución no principal:** Sus reclamos abiertos (`Pendiente`, `En revisión`, `En proceso`) pasan automáticamente a la institución principal de esa ciudad con registro en el historial.
5. **Alcance de `/admin/users`:** Se mantiene el alta de nuevo usuario (`/admin/users/new`), listado con ciudad y reclamos, cambio de rol y suspensión/rehabilitación; se descarta la edición de usuarios existentes (`/admin/users/[id]/edit`).
6. **Creación de reclamos por el administrador y modal de ciudad en Comunidad:** Se elimina `/admin/reclamos/nuevo`. El administrador crea reclamos desde `/ciudadano`, donde al ingresar se le solicita mediante un modal elegir a qué ciudad activa entrar.

## Decisiones pendientes

1. Período de métricas: 7, 30 o 90 días; ¿configurable?
2. Umbral y definición de inactividad institucional (propuesta futura).
3. Proceso para reemplazar institución principal con ciudad activa (designación directa de otra institución verificada y activa en `/admin/ciudades`).
4. Efectos de desactivar una ciudad sobre reclamos, instituciones y contenido.
5. Cómo conservar y distinguir solicitudes históricas y nuevas.
6. Qué contenido puede moderar el administrador y si se oculta, elimina o ambas.
7. Si habrá reportes ciudadanos de contenido y qué motivos/prioridades.
8. Diferencia entre inhabilitar, suspender y baja lógica de usuario.
9. Si las categorías son globales o configurables por ciudad.
10. Límites de la reasignación manual de reclamos.
11. Eventos auditables y tiempo de conservación.
12. Qué eventos generan notificaciones administrativas.
13. Cómo registrar y medir interés en ciudades inactivas.
14. Si se mantiene un único rol admin global en el alcance actual.

## Recomendación sobre reclamos

Mantenerlos como indicadores de supervisión y contexto, no como KPI central del administrador. Priorizar carga y actividad institucional, antigüedad de pendientes, resoluciones en período, actividad atípica de usuarios y casos que requieren intervención. El total global puede estar disponible como dato secundario.

---

# Instrucciones para el agente de IA

Al trabajar sobre `ADMIN-01`:

1. Leer este documento completo.
2. Inspeccionar `develop` en ambos repositorios y revisar el estado real del código.
3. Inspeccionar esquema MySQL, migraciones, relaciones y datos relevantes.
4. Crear una matriz que clasifique cada punto: implementado, parcial, ausente, inconsistente o pendiente de decisión.
5. Indicar archivos, endpoints, tablas, dependencias y riesgos afectados.
6. No implementar propuestas ni decisiones pendientes como si estuvieran aprobadas. Presentar alternativas cuando una definición afecte el modelo o comportamiento.
7. Mantener reglas de negocio en backend y evitar duplicarlas en frontend.
8. No hardcodear ciudades, IDs, roles, estados ni permisos.
9. Coordinar dependencias con CITY01–CITY05 y no simular funcionalidades aún no integradas.
10. Trabajar en etapas pequeñas, ramas feature y PR hacia `develop`. No modificar `main` sin autorización expresa.
11. Antes de tocar archivos compartidos, identificar conflictos con el trabajo paralelo.
12. Agregar pruebas de reglas, autorización, transacciones, estados inválidos y casos límite.
13. Actualizar este documento cuando se apruebe o modifique una decisión, separando lo confirmado de lo propuesto.
14. Informar en cada etapa qué se hizo, qué falta, qué decisiones se necesitan y qué pruebas se ejecutaron.
15. No realizar una refactorización general por estilo: priorizar seguridad, integridad de datos y comportamiento funcional.

**Este documento define el comportamiento esperado, pero no autoriza implementar todo en una sola entrega. ADMIN-01 se desarrollará progresivamente y respetando las dependencias de CITY.**

---

# Registro de avances de implementación (`ADMIN-01`)

## Etapa 1 — Seguridad, Base de Datos, Auditoría e Integridad de Asignación (Completada)

- **Rama (`reportarg-api`):** `feature/ADMIN-01-reglas-negocio`
- **Migración SQL aplicada en Staging:** `migrations/013_admin_auditoria_e_instituciones.sql` (registrada en `schema_migrations`):
  - Ampliación de `instituciones` con `motivo_rechazo`, `fecha_rechazo`, `cuit` y `nombre_contacto`.
  - Backfill de `instituciones.status = 'approved'` donde `verificada = 1`.
  - Flexibilización de `ciudadanos.provincia` y `ciudadanos.ciudad` a `NULL DEFAULT NULL` para altas administrativas o perfiles sin residencia aún definida.
  - Creación de la tabla `admin_auditoria` con índices y FK a `usuarios(id_usuario)`.
- **Módulo de Auditoría Administrativa:**
  - Implementación de `src/modules/admin/auditoriaModel.js`, `auditoriaController.js` y `auditoriaRoutes.js` (`/api/admin/auditoria` y `/api/admin/auditoria/:tipo/:id` bajo `verifyToken` y `requireAdmin`).
  - Registro automático de auditoría en verificación y rechazo institucional, designación de institución principal, reasignación de reclamos y cambio de rol/estado de usuarios.
- **Seguridad de Rutas y Ciclo de Rechazo de 7 Días:**
  - Protección de `/api/admin/upload` en `src/app.js` con `requireRole(ROLES.ADMIN, ROLES.CIUDADANO, ROLES.INSTITUCION)` para impedir que instituciones no verificadas o rechazadas suban archivos (`403 INSTITUCION_NO_VERIFICADA`).
  - Vencimiento automático de cuentas institucionales rechazadas tras **7 días** desde `fecha_rechazo` en `authMiddleware.js` y `authService.js`, y exposición de `institucion_status`, `motivo_rechazo` y `fecha_rechazo`.
  - Persistencia de `cuit` y `nombre_contacto` en `authService.registerInstitution` e `InstitutionModel.create`.
- **Integridad de Instituciones y Asignación/Reasignación de Reclamos:**
  - `InstitutionModel.verificar` y `InstitutionModel.rechazar` actualizados con transacciones atómicas, persistencia de `status` (`'approved'` / `'rejected'`), `motivo_rechazo` y `fecha_rechazo`, y filtros/métricas diferenciados por estado.
  - `InstitutionModel.getPrincipalDeCiudad` y `getPorCategoriaYCiudad` actualizados para exigir `verificada = 1`, `status = 'approved'` y `u.activo = 1`.
  - Bloqueo en `reclamoWorkflowService.crearReclamo` (`409`) cuando la ciudad no posee institución responsable o principal válida (evitando reclamos con `id_institucion = NULL`).
  - Validación en `ReclamoModel.reasignarInstitucion` para permitir reasignar únicamente a instituciones verificadas, aprobadas y con usuario activo.
- **Pruebas:** 19 suites y 229 tests pasando (`npm test`), incluyendo nuevas pruebas de seguridad, auditoría, reasignación y ciclo institucional.

## Próximas etapas planificadas

- **Etapa 2 (Siguiente):** Ciclo de vida de instituciones (suspensión/rehabilitación con protección de institución principal y reasignación automática de reclamos abiertos, gestión de `institucion_categorias`, endpoints de reenvío de solicitud o conversión a ciudadano dentro de los 7 días) y actualización de `/admin/institutions`, `/admin/solicitudes` y pantalla de estado en `/institucion` (`report-arg`).
- **Etapa 3:** Gestión administrativa de ciudades (`/admin/ciudades`, ciudades activas/inactivas, designación de institución principal única y validaciones de activación/desactivación).
- **Etapa 4:** Supervisión de reclamos (filtros completos y anomalías de asignación en `/admin/reclamos`), cobertura institucional en `/admin/categories` y retiro de `/admin/reclamos/nuevo` + modal selector de ciudad para el admin al ingresar a `/ciudadano`.
- **Etapa 5:** Gestión de usuarios (`/admin/users` con ciudad y conteo de reclamos, alta corregida, retiro de edición manual) y estandarización de controles UI (`@/components/ui`).
- **Etapa 6:** Rediseño del Dashboard administrativo (`/admin`) centrado en pendientes y salud de plataforma.

