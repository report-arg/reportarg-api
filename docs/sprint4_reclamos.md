# 📐 Análisis Técnico, Sprint Backlog y Desglose — Sprint 4: Reclamos (ReportARG)

---

## 🛠️ Resumen de Cambios de Base de Datos Ejecutados (Pre-Requisito Completado)

> [!IMPORTANT]
> **ESTADO DE LA BASE DE DATOS:** Los cambios estructurales en la base de datos requeridos para el Sprint 4 **ya han sido ejecutados e impactados exitosamente** tanto en el entorno de **Staging** (vía `schema_completo_inicial.sql`) como en el script de migración para **Producción** (`001_sprint4_schema_reclamos.sql`).

A continuación se resumen las modificaciones ya presentes en la base de datos que sirven como cimiento para el desarrollo de las Historias de Usuario:

1. **Tabla `ciudades` (Multi-Tenancy)**:
   * Creada la tabla `ciudades` con los campos necesarios para la gestión multi-tenant.
   * Creado el registro inicial por defecto para la ciudad principal.

2. **Ajustes en Tabla `usuarios`**:
   * Incorporada la columna de vinculación a la ciudad mediante clave foránea hacia la tabla de ciudades.

3. **Ajustes en Tabla `instituciones`**:
   * Incorporadas las columnas para asignación de ciudad e identificación de la institución principal de respaldo.
   * Configurada la institución principal por defecto para la ciudad inicial.

4. **Tabla `institucion_categorias`**:
   * Creada la tabla intermedia para asociar a cada institución las categorías que gestiona para la auto-asignación de reclamos.

5. **Ajustes en Tabla `reclamos`**:
   * **Nuevos campos de negocio**: Visibilidad (público/privado), marca de editado, ciudad, institución asignada, motivo de cancelación, tipo de autor de cancelación, mensaje de resolución, fecha de resolución y fecha de último cambio de estado.
   * **Refactor de Estados**: Adaptación del campo de estado a la máquina de estados del negocio (Pendiente, En revisión, En proceso, Resuelto y Cancelado).
   * Mapeados todos los registros históricos existentes al nuevo formato de estados sin pérdida de información.

6. **Nuevas Tablas Relacionales y Auditoría**:
   * **`reclamos_afectados`**: Tabla para la interacción comunitaria "A mí también me pasa".
   * **`reclamos_actualizaciones`**: Bitácora para novedades y notas agregadas por ciudadanos e instituciones.
   * **`reclamos_historial`**: Registro de auditoría inmutable para trazabilidad de eventos.

---

## 🚀 1. Sprint Backlog Completo

A continuación se presenta la tabla del **Sprint Backlog** para el Sprint 4 con las 22 Historias de Usuario desglosadas por Story Points (SP), Horas estimadas, Dependencias y Asignación entre las tres integrantes del equipo (**Julieta**, **Ludmila** y **Valentina**).

### Criterio de estimación de Story Points:
- **2 SP**: Funcionalidad simple (UI estática, filtro o criterio de ordenamiento).
- **3 SP**: Lógica media (interacción con estado local, validación media o dashboard específico).
- **5 SP**: Compleja (Backend + Frontend + Validaciones de seguridad + Base de datos).

| Persona asignada | Nro | HU descripción | Story Points | Horas | Dependencias |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Ludmila | **HU-01** | Crear reclamo público | 5 SP | 13 hs | HU-04 |
| Ludmila | **HU-02** | Crear reclamo privado | 5 SP | 11.5 hs | HU-01, HU-04 |
| Ludmila | **HU-03** | Crear reclamos como administrador | 3 SP | 7 hs | HU-01, HU-04 |
| Julieta | **HU-04** | Asignar institución automáticamente | 5 SP | 9.5 hs | HU-05 |
| Julieta | **HU-05** | Identificar institución principal | 3 SP | 9 hs | Ninguna |
| Ludmila | **HU-06** | Ver mis reclamos | 3 SP | 8.5 hs | HU-01, HU-04 |
| Valentina | **HU-07** | Ver reclamos públicos | 5 SP | 9 hs | HU-01, HU-04 |
| Valentina | **HU-08** | Ver detalle de reclamo | 5 SP | 13.5 hs | HU-01, HU-04, HU-18 |
| Valentina | **HU-09** | Consultar reclamos institucionales | 5 SP | 12.5 hs | HU-04 |
| Valentina | **HU-10** | Filtrar reclamos | 2 SP | 8.5 hs | HU-06, HU-07, HU-09 |
| Ludmila | **HU-11** | Editar reclamo pendiente | 5 SP | 9.5 hs | HU-01, HU-18 |
| Valentina | **HU-12** | Cancelar reclamo | 5 SP | 10.5 hs | HU-01, HU-09, HU-18 |
| Valentina | **HU-13** | Gestionar estados del reclamo | 5 SP | 9.5 hs | HU-09, HU-18 |
| Valentina | **HU-14** | Resolver reclamo | 5 SP | 10 hs | HU-13, HU-18 |
| Ludmila | **HU-15** | Reabrir reclamo | 5 SP | 10 hs | HU-12, HU-14, HU-18 |
| Ludmila | **HU-16** | Participar en un reclamo ("A mí también me pasa") | 3 SP | 10.5 hs | HU-01, HU-07 |
| Valentina | **HU-17** | Agregar actualizaciones al reclamo | 3 SP | 11 hs | HU-08 |
| Julieta | **HU-18** | Visualizar historial del reclamo | 5 SP | 12.5 hs | Ninguna (Core) |
| Julieta | **HU-19** | Seguimiento de tiempos de gestión | 3 SP | 8.5 hs | HU-09, HU-13 |
| Valentina | **HU-20** | Identificar reclamos con mayor impacto | 2 SP | 6 hs | HU-09, HU-16 |
| Julieta | **HU-21** | Administrar y reasignar reclamos | 3 SP | 9 hs | HU-04, HU-18 |
| Ludmila | **HU-22** | Notificaciones internas de cambio de estado | 3 SP | 9 hs | HU-13, HU-14 |
| **TOTAL** | **Sprint 4 (22 Historias de Usuario)** | **83 SP** | **217.5 hs** | **3 Desarrolladoras** |

---

## 📌 Diagnóstico del Estado de la Plataforma

1. **Base de Datos y Estructura Integrada**:
   * La estructura de base de datos ya cuenta con todas las tablas relacionales y campos requeridos para el Sprint 4.
   * Los servicios del backend se deben adaptar para consumir estas entidades y responder a las reglas del negocio.

2. **Secuencia de Estados del Negocio**:
   * La base de datos fue actualizada a la secuencia formal: Pendiente → En revisión → En proceso → Resuelto y Cancelado.

3. **Autenticación y Seguridad**:
   * La identidad del usuario se obtiene exclusivamente desde la sesión autenticada en el servidor para prevenir vulnerabilidades de manipulación de identidad.
   * Las restricciones de visibilidad de reclamos privados, la ocultación en mapas comunitarios y las reglas de edición, cancelación y reapertura se validan en el backend.

---

## 📋 Detalle de Historias de Usuario, Criterios de Aceptación y Subtareas

---

### HU-01 — Crear reclamo público

> **Descripción**: Como ciudadano, quiero registrar un reclamo público sobre una problemática que ocurre en mi ciudad, para informar la situación a la comunidad y solicitar atención institucional.

#### 📌 Criterios de Aceptación
1. Dado que el ciudadano se encuentra autenticado y accede al formulario de creación, cuando selecciona la opción de reclamo público, entonces el sistema permite completar los datos correspondientes al reclamo.
2. Dado que el ciudadano completa título, descripción, categoría y ubicación, cuando confirma la creación, entonces el sistema registra correctamente el reclamo como público.
3. Dado que el ciudadano intenta crear un reclamo sin completar alguno de los campos obligatorios, cuando confirma la creación, entonces el sistema no permite registrarlo e informa qué dato debe completar.
4. Dado que el ciudadano completa correctamente los datos obligatorios, cuando crea el reclamo, entonces el sistema establece automáticamente el estado inicial como "Pendiente".
5. Dado que el ciudadano crea un reclamo, cuando el sistema lo registra, entonces lo asocia automáticamente al ciudadano autenticado y a su ciudad.
6. Dado que el ciudadano desea adjuntar una imagen, cuando crea el reclamo, entonces el sistema permite agregarla de manera opcional.
7. Dado que el reclamo fue creado correctamente, cuando finaliza el registro, entonces el sistema informa al ciudadano que el reclamo fue creado exitosamente.
8. Dado que un ciudadano cuenta con 3 o más reclamos en estado "Pendiente", cuando intenta crear un nuevo reclamo, entonces el sistema no permite registrarlo e informa la restricción de límite de reclamos simultáneos.

#### 🛠️ Subtareas técnicas

- Implementar lógica backend para registro de reclamo público (obtención de usuario autenticado, validación de campos obligatorios con errores específicos, asignación de ciudad, auto-asignación institucional y registro en historial)
  + Rol: Dev
  + Hs estimadas: 7 hs

- Diseñar y desarrollar formulario frontend para la creación de reclamo público con selector de visibilidad, mensajes de error por campo, soporte de evidencia fotográfica opcional y notificación de confirmación exitosa
  + Rol: UX / Dev
  + Hs estimadas: 4 hs

- Pruebas integrales de creación de reclamos públicos, verificación de estado inicial Pendiente y asignación automática
  + Rol: QA
  + Hs estimadas: 2 hs

---

### HU-02 — Crear reclamo privado

> **Descripción**: Como ciudadano, quiero registrar un reclamo privado para informar situaciones sensibles sin exponer la ubicación ni datos al público.

#### 📌 Criterios de Aceptación
1. Dado que el ciudadano se encuentra autenticado y accede al formulario de creación, cuando selecciona la opción de reclamo privado, entonces el sistema permite registrar el reclamo como privado.
2. Dado que el ciudadano completa título, descripción, categoría y ubicación, cuando confirma la creación, entonces el sistema registra correctamente el reclamo privado.
3. Dado que el ciudadano intenta crear un reclamo privado sin completar alguno de los campos obligatorios, cuando confirma la creación, entonces el sistema no permite registrarlo e informa qué dato debe completar.
4. Dado que el ciudadano crea un reclamo privado, cuando el sistema lo registra, entonces establece automáticamente el estado "Pendiente".
5. Dado que existe un reclamo privado, cuando otro ciudadano consulta los reclamos públicos, entonces el reclamo privado no aparece en dichos resultados.
6. Dado que existe un reclamo privado, cuando un ciudadano distinto al creador intenta acceder a su detalle, entonces el sistema impide el acceso.
7. Dado que existe un reclamo privado, cuando la institución responsable o un administrador autorizado accede al sistema, entonces puede visualizar y gestionar el reclamo.
8. Dado que existe un reclamo privado, cuando un ciudadano consulta información pública de la ciudad, entonces la ubicación exacta del reclamo no se muestra públicamente.
9. Dado que existe un reclamo privado, cuando cualquier usuario visualiza el mapa de reclamos de la ciudad, entonces el sistema no incluye dicho reclamo privado en los marcadores del mapa.

#### 🛠️ Subtareas técnicas

- Implementar restricciones de consulta en backend para excluir reclamos privados de listados comunitarios y mapas públicos
  + Rol: Dev
  + Hs estimadas: 3.5 hs

- Implementar política de protección de datos en backend para resguardar la ubicación exacta y dirección de reclamos privados, restringiendo su lectura al autor, institución asignada y administradores
  + Rol: Dev
  + Hs estimadas: 3 hs

- Diseñar e implementar en el formulario frontend la opción de visibilidad privada con aclaraciones sobre el resguardo de la ubicación
  + Rol: UX / Dev
  + Hs estimadas: 3 hs

- Pruebas de seguridad para verificar la no exposición de datos sensibles de reclamos privados en respuestas públicas ni en el mapa
  + Rol: QA
  + Hs estimadas: 2 hs

---

### HU-03 — Crear reclamos como administrador

> **Descripción**: Como administrador, quiero crear reclamos públicos o privados para realizar pruebas del sistema.

#### 📌 Criterios de Aceptación
1. Dado que el usuario tiene rol de administrador, cuando accede a la funcionalidad de creación de reclamos, entonces el sistema le permite registrar un reclamo.
2. Dado que el administrador completa los datos obligatorios, cuando confirma la creación, entonces el sistema registra correctamente el reclamo.
3. Dado que el administrador crea un reclamo, cuando el sistema lo registra, entonces lo identifica como creado por el administrador y establece su estado inicial como "Pendiente".
4. Dado que el administrador crea un reclamo, cuando finaliza el registro, entonces se ejecuta el mismo proceso de asignación automática utilizado para los reclamos creados por ciudadanos.

#### 🛠️ Subtareas técnicas

- Crear funcionalidad backend para la generación administrativa de reclamos de prueba seleccionando cualquier usuario o ciudad destino e invocando la auto-asignación automática
  + Rol: Dev
  + Hs estimadas: 3 hs

- Desarrollar interfaz en el panel de administración para la creación y gestión rápida de reclamos de prueba
  + Rol: Dev
  + Hs estimadas: 3 hs

- Pruebas de generación de reclamos de prueba y verificación de etiquetado en el historial de auditoría
  + Rol: QA
  + Hs estimadas: 1 h

---

### HU-04 — Asignar institución automáticamente

> **Descripción**: Como sistema, quiero asignar automáticamente un reclamo a la institución responsable según la ciudad y la categoría del reclamo.

#### 📌 Criterios de Aceptación
1. Dado que se crea un reclamo con una ciudad y categoría determinadas, cuando el sistema realiza la asignación automática, entonces busca una institución responsable para esa combinación de ciudad y categoría.
2. Dado que existe una institución responsable para la ciudad y categoría del reclamo, cuando se realiza la asignación, entonces el sistema asigna el reclamo a dicha institución.
3. Dado que no existe una institución responsable para la categoría del reclamo, cuando se realiza la asignación, entonces el sistema asigna el reclamo a la institución principal de la ciudad.
4. Dado que el reclamo fue asignado a una institución, cuando el ciudadano consulta su detalle, entonces el sistema muestra la institución responsable.
5. Dado que se realiza una asignación automática, cuando finaliza la operación, entonces el sistema registra la institución asignada al reclamo.

#### 🛠️ Subtareas técnicas

- Desarrollar servicio backend de auto-asignación según categoría y ciudad, implementando el mecanismo de respaldo hacia la institución principal
  + Rol: Dev
  + Hs estimadas: 7.5 hs

- Pruebas unitarias e integrales del servicio de auto-asignación automática y registro de la institución asignada
  + Rol: QA
  + Hs estimadas: 2 hs

---

### HU-05 — Identificar institución principal

> **Descripción**: Como administrador, quiero marcar una institución como la "Principal" dentro de una ciudad, para usarla como respaldo.

#### 📌 Criterios de Aceptación
1. Dado que el administrador visualiza las instituciones de una ciudad, cuando selecciona una institución como principal, entonces el sistema la identifica como institución principal de esa ciudad.
2. Dado que una ciudad ya tiene una institución principal, cuando el administrador selecciona otra institución como principal, entonces el sistema garantiza que exista una única institución principal para esa ciudad.
3. Dado que una institución está configurada como principal, cuando se consulta la información de la ciudad, entonces el sistema permite identificarla visualmente como "Institución principal".
4. Dado que un ciudadano consulta las instituciones de su ciudad, cuando visualiza la institución principal, entonces el sistema muestra claramente cuál es la institución identificada como principal.
5. Dado que se crea un reclamo para una categoría que no tiene institución responsable, cuando el sistema realiza la asignación automática, entonces utiliza la institución principal configurada para la ciudad.

#### 🛠️ Subtareas técnicas

- Implementar lógica backend para definir la institución principal de una ciudad asegurando que solo exista una por municipio
  + Rol: Dev
  + Hs estimadas: 4.5 hs

- Desarrollar componente e indicador visual en frontend para identificar claramente la institución principal en el panel de administración y en el listado de instituciones de la ciudad visible al ciudadano
  + Rol: UX / Dev
  + Hs estimadas: 3 hs

- Pruebas de asignación y unicidad de la institución principal por ciudad
  + Rol: QA
  + Hs estimadas: 1.5 hs

---

### HU-06 — Ver mis reclamos

> **Descripción**: Como ciudadano, quiero visualizar mis reclamos creados para darles seguimiento.

#### 📌 Criterios de Aceptación
1. Dado que el ciudadano se encuentra autenticado, cuando accede a la sección "Mis reclamos", entonces el sistema muestra los reclamos creados por dicho ciudadano.
2. Dado que el ciudadano visualiza sus reclamos, cuando consulta el listado, entonces cada reclamo muestra como mínimo título, categoría, estado, fecha, tipo e institución responsable.
3. Dado que el ciudadano tiene reclamos públicos y privados, cuando accede a "Mis reclamos", entonces puede visualizar ambos tipos.
4. Dado que el ciudadano selecciona uno de sus reclamos, cuando accede a él, entonces el sistema muestra su detalle.
5. Dado que un reclamo fue reabierto, cuando el ciudadano consulta "Mis reclamos", entonces el reclamo continúa apareciendo como la misma instancia.

#### 🛠️ Subtareas técnicas

- Desarrollar servicio backend para consulta de reclamos propios del ciudadano autenticado incluyendo título, categoría, estado, fecha, visibilidad e institución responsable
  + Rol: Dev
  + Hs estimadas: 3 hs

- Diseñar e implementar la pantalla "Mis Reclamos" con tarjetas descriptivas, etiquetas de estado, tipo de visibilidad e indicador de reapertura conservando la misma instancia
  + Rol: UX / Dev
  + Hs estimadas: 4 hs

- Pruebas de visualización y filtrado de la lista personal de reclamos del ciudadano
  + Rol: QA
  + Hs estimadas: 1.5 hs

---

### HU-07 — Ver reclamos públicos

> **Descripción**: Como ciudadano, quiero visualizar los reclamos públicos de mi ciudad para conocer los problemas de la comunidad.

#### 📌 Criterios de Aceptación
1. Dado que un ciudadano se encuentra autenticado, cuando accede al listado de reclamos públicos, entonces el sistema muestra los reclamos públicos correspondientes a su ciudad.
2. Dado que existen reclamos privados en la ciudad, cuando el ciudadano consulta el listado público, entonces dichos reclamos no aparecen.
3. Dado que el ciudadano visualiza un reclamo público, cuando consulta su información resumida, entonces puede visualizar título, categoría, estado, fecha y ubicación general.
4. Dado que el ciudadano selecciona un reclamo público, cuando accede a su detalle, entonces el sistema muestra la información disponible para su consulta.
5. Dado que un reclamo público tiene ciudadanos afectados, cuando el ciudadano visualiza el reclamo, entonces puede consultar la cantidad de personas que indicaron que también les ocurre.

#### 🛠️ Subtareas técnicas

- Implementar consulta backend de reclamos públicos filtrados exclusivamente por la ciudad activa del usuario
  + Rol: Dev
  + Hs estimadas: 3 hs

- Integración en frontend del feed comunitario de reclamos públicos por ciudad, incluyendo el contador de personas afectadas ("A mí también me pasa")
  + Rol: UX / Dev
  + Hs estimadas: 4 hs

- Pruebas de filtrado por ciudad e inaccesibilidad a reclamos comunitarios de otros municipios o reclamos privados
  + Rol: QA
  + Hs estimadas: 2 hs

---

### HU-08 — Ver detalle de reclamo

> **Descripción**: Como ciudadano, quiero consultar el detalle completo de un reclamo: estado, institución responsable, tiempo transcurrido, actualizaciones e historial.

#### 📌 Criterios de Aceptación
1. Dado que el usuario tiene permiso para consultar un reclamo, cuando accede a su detalle, entonces el sistema muestra la información correspondiente al reclamo.
2. Dado que el usuario consulta un reclamo, cuando visualiza el detalle, entonces puede identificar su estado actual, categoría e institución responsable.
3. Dado que el reclamo es público, cuando un ciudadano consulta su detalle, entonces el sistema muestra la información pública correspondiente.
4. Dado que el reclamo es privado, cuando el usuario tiene autorización para consultarlo, entonces el sistema muestra la información privada correspondiente.
5. Dado que el reclamo posee actualizaciones e historial, cuando el usuario consulta su detalle, entonces puede visualizar dicha información.
6. Dado que el reclamo fue editado, cuando se consulta su detalle, entonces el sistema muestra un indicador que informa que fue editado.
7. Dado que el reclamo fue cancelado, cuando se consulta su detalle, entonces el sistema informa si fue cancelado por el ciudadano o por una institución.
8. Dado que el reclamo fue resuelto, cuando se consulta su detalle, entonces el sistema muestra el mensaje de resolución y la evidencia disponible.

#### 🛠️ Subtareas técnicas

- Implementar servicio backend para consulta detallada de reclamo incluyendo estado, categoría, institución asignada, mensajes de resolución/cancelación, indicador "Editado" e historial
  + Rol: Dev
  + Hs estimadas: 4 hs

- Implementar validaciones de seguridad en backend para restringir la consulta de detalles de reclamos privados únicamente al autor, institución o administradores
  + Rol: Dev
  + Hs estimadas: 2.5 hs

- Diseñar y desarrollar vista detallada de reclamo en frontend con pestañas de información general, seguimiento de tiempo, novedades, evidencia e historial
  + Rol: UX / Dev
  + Hs estimadas: 5 hs

- Pruebas de acceso autorizado e inspección de contenido en la vista de detalle
  + Rol: QA
  + Hs estimadas: 2 hs

---

### HU-09 — Consultar reclamos institucionales

> **Descripción**: Como institución, quiero visualizar los reclamos asignados a mi institución para gestionar mi trabajo.

#### 📌 Criterios de Aceptación
1. Dado que un usuario pertenece a una institución, cuando accede al listado institucional, entonces el sistema muestra los reclamos asignados a dicha institución.
2. Dado que existen reclamos asignados a otras instituciones, cuando el usuario consulta su listado institucional, entonces dichos reclamos no aparecen.
3. Dado que la institución visualiza un reclamo asignado, cuando consulta su información resumida, entonces puede identificar al menos su título, categoría, estado y fecha.
4. Dado que la institución selecciona un reclamo, cuando accede al detalle, entonces el sistema le permite realizar las acciones correspondientes según su estado y permisos.

#### 🛠️ Subtareas técnicas

- Desarrollar servicio backend para que cada institución consulte únicamente los reclamos asignados a su ámbito de gestión
  + Rol: Dev
  + Hs estimadas: 3.5 hs

- Diseñar y desarrollar la bandeja de entrada y dashboard de gestión institucional con indicadores de prioridad y tiempo sin avance
  + Rol: UX / Dev
  + Hs estimadas: 5 hs

- Pruebas de aislamiento entre instituciones y validación de carga de bandeja institucional
  + Rol: QA
  + Hs estimadas: 2 hs

---

### HU-10 — Filtrar reclamos

> **Descripción**: Como usuario autorizado, quiero filtrar los reclamos según estado o categoría y contar con la opción de limpiar filtros.

#### 📌 Criterios de Aceptación
1. Dado que el usuario autorizado visualiza un listado de reclamos, cuando selecciona un estado, entonces el sistema muestra únicamente los reclamos correspondientes a dicho estado.
2. Dado que el usuario autorizado visualiza un listado de reclamos, cuando selecciona una categoría, entonces el sistema muestra únicamente los reclamos correspondientes a dicha categoría.
3. Dado que el usuario selecciona simultáneamente un estado y una categoría, cuando aplica los filtros, entonces el sistema muestra únicamente los reclamos que cumplen ambas condiciones.
4. Dado que existen filtros aplicados, cuando el usuario selecciona la opción de limpiar filtros, entonces el sistema vuelve a mostrar el listado sin dichos filtros.

#### 🛠️ Subtareas técnicas

- Desarrollar lógica backend para filtrado multicriterio de reclamos por estado, categoría y combinaciones de ambos
  + Rol: Dev
  + Hs estimadas: 3.5 hs

- Diseño y desarrollo del componente de filtros reutilizable para ciudadana/os e instituciones, incluyendo el botón explícito de "Limpiar Filtros"
  + Rol: UX / Dev
  + Hs estimadas: 3.5 hs

- Pruebas de combinación de filtros de búsqueda y restablecimiento al limpiar filtros
  + Rol: QA
  + Hs estimadas: 1.5 hs

---

### HU-11 — Editar reclamo pendiente

> **Descripción**: Como ciudadano, quiero editar un reclamo únicamente mientras se encuentre en estado "Pendiente".

#### 📌 Criterios de Aceptación
1. Dado que el ciudadano es el creador de un reclamo en estado "Pendiente", cuando accede al reclamo, entonces el sistema le permite editarlo.
2. Dado que el ciudadano modifica un reclamo pendiente, cuando guarda los cambios, entonces el sistema actualiza la información correctamente.
3. Dado que el ciudadano modifica un reclamo, cuando los cambios se guardan correctamente, entonces el sistema actualiza la fecha de modificación.
4. Dado que un reclamo fue editado, cuando un usuario consulta su detalle, entonces el sistema muestra el indicador "Editado".
5. Dado que un reclamo se encuentra en estado "En revisión", cuando el ciudadano intenta editarlo, entonces el sistema no permite realizar modificaciones.
6. Dado que un usuario intenta modificar mediante una petición directa un reclamo que no tiene permitido editar, cuando el backend recibe la solicitud, entonces rechaza la operación.

#### 🛠️ Subtareas técnicas

- Implementar validación backend para modificación de reclamo verificando propiedad del ciudadano, actualizando fecha de modificación y rechazando la solicitud si el estado ya no es Pendiente
  + Rol: Dev
  + Hs estimadas: 4 hs

- Desarrollar interfaz de edición de reclamo en frontend con bloqueo automático si avanzó de estado y generación de marca visual de editado
  + Rol: UX / Dev
  + Hs estimadas: 3.5 hs

- Pruebas de edición exitosa en Pendiente y rechazo de modificaciones cuando el reclamo ya se encuentra en revisión
  + Rol: QA
  + Hs estimadas: 2 hs

---

### HU-12 — Cancelar reclamo

> **Descripción**: Como ciudadano o institución autorizada, quiero cancelar un reclamo cuando corresponda.

#### 📌 Criterios de Aceptación
1. Dado que el ciudadano es el creador de un reclamo en estado "Pendiente", cuando selecciona la opción de cancelar, entonces el sistema le permite cancelar el reclamo.
2. Dado que una institución gestiona un reclamo, cuando selecciona la opción de cancelar, entonces el sistema le solicita un motivo obligatorio.
3. Dado que la institución intenta cancelar un reclamo sin ingresar un motivo, cuando confirma la operación, entonces el sistema no permite realizar la cancelación.
4. Dado que el ciudadano o institución confirma la cancelación correctamente, cuando finaliza la operación, entonces el reclamo pasa al estado "Cancelado".
5. Dado que un reclamo fue cancelado, cuando se consulta su detalle, entonces el sistema muestra quién realizó la cancelación.
6. Dado que un reclamo fue cancelado, cuando se consulta su historial, entonces la cancelación queda registrada junto con la fecha y el usuario que la realizó.
7. Dado que un reclamo se encuentra cancelado, cuando un usuario intenta continuar su gestión mediante una transición normal, entonces el sistema no permite realizarla.

#### 🛠️ Subtareas técnicas

- Implementar lógica backend para cancelación de reclamo distinguiendo por rol: ciudadano (en Pendiente) vs institución (con motivo obligatorio), registrando el evento y bloqueando transiciones posteriores
  + Rol: Dev
  + Hs estimadas: 4.5 hs

- Diseñar e implementar modal de cancelación en frontend con campo de motivo según rol e indicadores visuales del autor de la cancelación en el detalle
  + Rol: UX / Dev
  + Hs estimadas: 4 hs

- Pruebas de cancelación por ciudadano e institución validando obligatoriedad del motivo y bloqueo de transiciones futuras
  + Rol: QA
  + Hs estimadas: 2 hs

---

### HU-13 — Gestionar estados del reclamo

> **Descripción**: Como institución, quiero cambiar el estado de un reclamo según las etapas de gestión (Pendiente → En revisión → En proceso → Resuelto).

#### 📌 Criterios de Aceptación
1. Dado que un reclamo fue creado correctamente, cuando se consulta su estado inicial, entonces el sistema muestra "Pendiente".
2. Dado que un reclamo se encuentra en "Pendiente", cuando la institución responsable inicia su revisión, entonces puede cambiarlo a "En revisión".
3. Dado que un reclamo se encuentra en "En revisión", cuando la institución comienza a gestionarlo, entonces puede cambiarlo a "En proceso".
4. Dado que un reclamo se encuentra en "En proceso", cuando la institución determina que fue solucionado, entonces puede iniciar el proceso para marcarlo como "Resuelto".
5. Dado que un usuario intenta realizar una transición de estado no permitida, cuando el sistema recibe la solicitud, entonces rechaza el cambio.
6. Dado que el estado de un reclamo cambia, cuando finaliza la operación, entonces el nuevo estado se muestra claramente en el reclamo.
7. Dado que un ciudadano consulta un reclamo, cuando visualiza su estado, entonces puede identificar claramente en qué etapa de gestión se encuentra.

#### 🛠️ Subtareas técnicas

- Desarrollar servicio backend de máquina de estados para validar la secuencia permitida de gestión (Pendiente → En revisión → En proceso → Resuelto) y registrar marcas temporales
  + Rol: Dev
  + Hs estimadas: 4 hs

- Diseñar e implementar selector de avance de estado en la interfaz de gestión institucional con retroalimentación clara del estado actual
  + Rol: UX / Dev
  + Hs estimadas: 3.5 hs

- Pruebas de avance de estados y verificación de bloqueo ante saltos de etapa no permitidos
  + Rol: QA
  + Hs estimadas: 2 hs

---

### HU-14 — Resolver reclamo

> **Descripción**: Como institución, quiero marcar un reclamo como Resuelto adjuntando un mensaje de resolución obligatorio y fotos de evidencia opcionales.

#### 📌 Criterios de Aceptación
1. Dado que un reclamo se encuentra en estado "En proceso", cuando la institución responsable selecciona la opción de resolverlo, entonces el sistema solicita un mensaje de resolución.
2. Dado que la institución intenta resolver un reclamo sin ingresar un mensaje de resolución, cuando confirma la operación, entonces el sistema no permite marcarlo como resuelto.
3. Dado que la institución ingresa un mensaje de resolución válido, cuando confirma la resolución, entonces el sistema cambia el estado del reclamo a "Resuelto".
4. Dado que la institución desea adjuntar evidencia, cuando resuelve el reclamo, entonces el sistema permite agregar imágenes de manera opcional.
5. Dado que el reclamo es marcado como resuelto, cuando finaliza la operación, entonces el sistema registra automáticamente la fecha de resolución.
6. Dado que un reclamo fue resuelto, cuando un usuario consulta su detalle, entonces puede visualizar el mensaje de resolución y la evidencia disponible.

#### 🛠️ Subtareas técnicas

- Implementar lógica backend para resolución de reclamo exigiendo mensaje de respuesta obligatorio y fotos de evidencia opcionales, sellando automáticamente la fecha de resolución
  + Rol: Dev
  + Hs estimadas: 4 hs

- Diseñar e implementar modal de resolución institucional con campo de respuesta obligatorio, adjunción de fotos y confirmación
  + Rol: UX / Dev
  + Hs estimadas: 4 hs

- Pruebas de resolución verificando la obligatoriedad del mensaje y la visualización pública/privada de la resolución y evidencias
  + Rol: QA
  + Hs estimadas: 2 hs

---

### HU-15 — Reabrir reclamo

> **Descripción**: Como ciudadano creador, quiero reabrir un reclamo resuelto o cancelado (dentro de los 15 días posteriores) indicando un motivo obligatorio, para informar que el problema persiste.

#### 📌 Criterios de Aceptación
1. Dado que el ciudadano es el creador de un reclamo en estado "Resuelto" o "Cancelado", cuando accede al detalle, entonces el sistema muestra la opción de reabrirlo.
2. Dado que el ciudadano selecciona la opción de reabrir, cuando confirma la acción, entonces el sistema solicita un motivo de reapertura.
3. Dado que el ciudadano ingresa un motivo válido, cuando confirma la reapertura, entonces el sistema cambia el reclamo a estado "En revisión".
4. Dado que un reclamo es reabierto, cuando el sistema registra la operación, entonces conserva la misma instancia y el historial anterior.
5. Dado que un reclamo es reabierto, cuando la institución consulta sus reclamos, entonces el reclamo vuelve a estar disponible para su gestión.
6. Dado que un usuario distinto al creador intenta reabrir un reclamo, cuando solicita la operación, entonces el sistema la rechaza.
7. Dado que transcurrieron más de 15 días desde la resolución o cancelación de un reclamo, cuando el ciudadano accede a su detalle, entonces el sistema deshabilita la opción de reabrir e informa que el plazo máximo expiró.

#### 🛠️ Subtareas técnicas

- Implementar servicio backend para reapertura de reclamos Resueltos o Cancelados (validando plazo máximo de 15 días desde la resolución), requiriendo motivo obligatorio de reapertura y cambiando el estado a En revisión sobre la misma instancia
  + Rol: Dev
  + Hs estimadas: 4.5 hs

- Diseñar e implementar botón y modal de reapertura en frontend para el ciudadano creador con campo de justificación obligatorio
  + Rol: UX / Dev
  + Hs estimadas: 3.5 hs

- Pruebas de reapertura comprobando conservación de ID e historial, límite de 15 días y reingreso a la bandeja institucional
  + Rol: QA
  + Hs estimadas: 2 hs

---

### HU-16 — Participar en un reclamo ("A mí también me pasa")

> **Descripción**: Como ciudadano, quiero indicar o quitar "A mí también me pasa" en reclamos públicos de mi ciudad para cuantificar a los afectados.

#### 📌 Criterios de Aceptación
1. Dado que un ciudadano visualiza un reclamo público, cuando selecciona "A mí también me pasa", entonces el sistema registra su participación en el reclamo.
2. Dado que un ciudadano ya indicó "A mí también me pasa" en un reclamo, cuando intenta registrarlo nuevamente, entonces el sistema evita duplicar su participación.
3. Dado que un ciudadano ya indicó que también está afectado, cuando selecciona nuevamente la opción, entonces el sistema permite quitar su participación.
4. Dado que existen ciudadanos que indicaron que también están afectados, cuando se visualiza el reclamo, entonces el sistema muestra la cantidad total de afectados.
5. Dado que un ciudadano visualiza un reclamo privado, cuando consulta sus acciones disponibles, entonces no se muestra la opción "A mí también me pasa".

#### 🛠️ Subtareas técnicas

- Implementar servicio backend para indicar o quitar adhesión a un reclamo público, impidiendo apoyos duplicados y ocultando la opción en reclamos privados
  + Rol: Dev
  + Hs estimadas: 5.5 hs

- Diseñar e implementar componente interactivo toggle "A mí también me pasa" con contador en vivo de personas afectadas en tarjetas y detalle
  + Rol: UX / Dev
  + Hs estimadas: 3.5 hs

- Pruebas de suma y quita de adhesión y comprobación de restricción en reclamos privados
  + Rol: QA
  + Hs estimadas: 1.5 hs

---

### HU-17 — Agregar actualizaciones al reclamo

> **Descripción**: Como ciudadano creador o institución responsable, quiero agregar actualizaciones para dar seguimiento al reclamo.

#### 📌 Criterios de Aceptación
1. Dado que el ciudadano es el creador de un reclamo, cuando accede a su detalle, entonces el sistema le permite agregar una actualización.
2. Dado que una institución tiene asignado un reclamo, cuando accede a su detalle, entonces el sistema le permite agregar una actualización.
3. Dado que un usuario autorizado escribe una actualización, cuando la confirma, entonces el sistema registra el contenido, autor y fecha.
4. Dado que existen varias actualizaciones, cuando se visualizan, entonces el sistema las muestra ordenadas cronológicamente.
5. Dado que un usuario no autorizado intenta agregar una actualización, cuando envía la solicitud, entonces el sistema rechaza la operación.
6. Dado que una actualización fue registrada, cuando se consulta el reclamo, entonces el sistema permite identificar si fue realizada por el ciudadano o por la institución.

#### 🛠️ Subtareas técnicas

- Implementar servicio backend para agregar novedades permitiendo publicación únicamente al ciudadano creador o a la institución asignada
  + Rol: Dev
  + Hs estimadas: 5.5 hs

- Diseñar e implementar módulo de bitácora en la vista de detalle con formulario de publicación y lista cronológica de novedades diferenciando autor
  + Rol: UX / Dev
  + Hs estimadas: 4 hs

- Pruebas de publicación de actualizaciones y bloqueo a usuarios no autorizados
  + Rol: QA
  + Hs estimadas: 1.5 hs

---

### HU-18 — Visualizar historial del reclamo

> **Descripción**: Como usuario autorizado, quiero visualizar el historial de auditoría completo e inmutable de un reclamo.

#### 📌 Criterios de Aceptación
1. Dado que un usuario tiene permiso para consultar un reclamo, cuando accede a su historial, entonces el sistema muestra los eventos registrados durante su ciclo de vida.
2. Dado que un reclamo fue creado, editado o tuvo un cambio relevante, cuando se consulta su historial, entonces el sistema muestra el evento correspondiente.
3. Dado que un reclamo cambia de estado, cuando finaliza el cambio, entonces el sistema registra el evento en el historial.
4. Dado que un reclamo fue cancelado, resuelto o reabierto, cuando se consulta su historial, entonces el sistema muestra dichas acciones.
5. Dado que existen múltiples eventos en el historial, cuando se visualizan, entonces se muestran ordenados cronológicamente.
6. Dado que un evento histórico fue registrado, cuando se consulta, entonces el sistema muestra la acción, usuario y fecha correspondientes.
7. Dado que un usuario intenta modificar o eliminar un evento histórico, cuando realiza la solicitud, entonces el sistema no permite modificar la trazabilidad registrada.

#### 🛠️ Subtareas técnicas

- Implementar servicio backend para registro automático e inmutable de eventos sobre reclamos (creación, edición, cambios de estado, cancelación, resolución, reapertura y reasignación) impidiendo modificaciones o borrados
  + Rol: Dev
  + Hs estimadas: 6 hs

- Diseñar e implementar componente visual de línea de tiempo (timeline) del reclamo en frontend ordenado cronológicamente
  + Rol: UX / Dev
  + Hs estimadas: 4.5 hs

- Pruebas de inmutabilidad y verificación del correcto trazado de eventos ante cada acción en la plataforma
  + Rol: QA
  + Hs estimadas: 2 hs

---

### HU-19 — Seguimiento de tiempos de gestión

> **Descripción**: Como usuario e institución, quiero visualizar el tiempo de gestión e identificar reclamos demorados (5+ días en Pendiente).

#### 📌 Criterios de Aceptación
1. Dado que existe un reclamo, cuando el usuario consulta su información, entonces el sistema muestra cuánto tiempo lleva en su estado actual.
2. Dado que un reclamo cambia de estado, cuando se registra el cambio, entonces el sistema comienza a contabilizar el tiempo correspondiente al nuevo estado.
3. Dado que una institución visualiza sus reclamos, cuando ordena por antigüedad, entonces el sistema muestra primero los reclamos que llevan más tiempo esperando.
4. Dado que un reclamo permanece en estado "Pendiente" durante 5 días o más, cuando la institución consulta el listado, entonces el sistema muestra una advertencia visual indicando que requiere atención.
5. Dado que un reclamo lleva menos de 5 días en estado "Pendiente", cuando la institución consulta el listado, entonces el sistema no muestra la advertencia de demora.

#### 🛠️ Subtareas técnicas

- Implementar cálculo backend de días transcurridos en el estado actual y generación de alerta para reclamos con 5 o más días en Pendiente
  + Rol: Dev
  + Hs estimadas: 3.5 hs

- Diseñar e implementar indicador visual de demora (5+ días en Pendiente) y ordenamiento por antigüedad en el panel institucional
  + Rol: UX / Dev
  + Hs estimadas: 3.5 hs

- Pruebas de cálculo de tiempos de gestión y activación de alertas de demora
  + Rol: QA
  + Hs estimadas: 1.5 hs

---

### HU-20 — Identificar reclamos con mayor impacto

> **Descripción**: Como institución, quiero identificar reclamos con mayor cantidad de ciudadanos afectados.

#### 📌 Criterios de Aceptación
1. Dado que existen reclamos públicos con diferentes cantidades de afectados, cuando la institución consulta el listado, entonces puede visualizar la cantidad de ciudadanos afectados por cada reclamo.
2. Dado que la institución selecciona ordenar por cantidad de afectados, cuando aplica el ordenamiento descendente, entonces el sistema muestra primero los reclamos con mayor cantidad de afectados.
3. Dado que un ciudadano agrega su participación a un reclamo, cuando se actualiza la cantidad de afectados, entonces el sistema contabiliza su participación una sola vez.
4. Dado que un ciudadano quita su participación, cuando se actualiza la cantidad de afectados, entonces el sistema deja de contabilizarlo.

#### 🛠️ Subtareas técnicas

- Implementar consulta y ordenamiento backend de reclamos institucionales en orden descendente según la cantidad de ciudadanos adheridos
  + Rol: Dev
  + Hs estimadas: 2.5 hs

- Diseñar e implementar filtro o pestaña de ordenamiento por "Mayor impacto" en el panel institucional
  + Rol: UX / Dev
  + Hs estimadas: 2.5 hs

- Pruebas de actualización de contadores al sumar o quitar apoyos y verificación de ordenamiento
  + Rol: QA
  + Hs estimadas: 1 h

---

### HU-21 — Administrar y reasignar reclamos

> **Descripción**: Como administrador, quiero intervenir sobre los reclamos en situaciones excepcionales para reasignar la institución responsable.

#### 📌 Criterios de Aceptación
1. Dado que un usuario tiene rol de administrador, cuando accede a la gestión de reclamos, entonces el sistema le permite visualizar los reclamos que requieren intervención administrativa.
2. Dado que el administrador consulta un reclamo, cuando necesita modificar su institución responsable, entonces el sistema le permite seleccionar una nueva institución.
3. Dado que el administrador selecciona una institución válida, cuando confirma la reasignación, entonces el sistema actualiza la institución responsable del reclamo.
4. Dado que un reclamo fue reasignado, cuando la institución anterior consulta sus reclamos, entonces el reclamo deja de aparecer como asignado a ella.
5. Dado que un reclamo fue reasignado, cuando la nueva institución consulta sus reclamos, entonces el reclamo aparece como asignado a ella.
6. Dado que el administrador reasigna un reclamo, cuando finaliza la operación, entonces el sistema registra la reasignación en el historial indicando usuario y fecha.
7. Dado que un usuario sin permisos administrativos intenta reasignar un reclamo, cuando realiza la solicitud, entonces el sistema rechaza la operación.

#### 🛠️ Subtareas técnicas

- Implementar servicio backend para reasignación de reclamos a otra institución por parte del administrador registrando el motivo, usuario y fecha en el historial
  + Rol: Dev
  + Hs estimadas: 4 hs

- Diseñar e implementar modal de reasignación administrativa en el panel de administración
  + Rol: UX / Dev
  + Hs estimadas: 3.5 hs

- Pruebas de reasignación administrativa y reflejo inmediato en la bandeja de la nueva institución y remoción en la anterior
  + Rol: QA
  + Hs estimadas: 1.5 hs

---

### HU-22 — Notificaciones internas de cambio de estado

> **Descripción**: Como ciudadano creador, quiero recibir una notificación en la plataforma cuando la institución cambie el estado de mi reclamo o agregue una resolución/actualización, para hacer un seguimiento en tiempo real.

#### 📌 Criterios de Aceptación
1. Dado que una institución modifica el estado, resuelve o cancela un reclamo, cuando se confirma la operación, entonces el sistema genera automáticamente una notificación para el ciudadano creador.
2. Dado que el ciudadano accede al sistema, cuando posee notificaciones no leídas, entonces el sistema muestra un indicador visual con el número de alertas pendientes.
3. Dado que el ciudadano selecciona una notificación, cuando accede a ella, entonces el sistema lo redirige al detalle del reclamo correspondiente y marca la notificación como leída.

#### 🛠️ Subtareas técnicas

- Implementar desencadenante en backend para crear automáticamente un registro en las notificaciones cuando la institución modifique el estado, cancele o resuelva un reclamo
  + Rol: Dev
  + Hs estimadas: 3.5 hs

- Diseñar e implementar componente visual de notificaciones in-app con contador de no leídas y enlace directo al detalle del reclamo
  + Rol: UX / Dev
  + Hs estimadas: 4 hs

- Pruebas de generación de notificaciones automáticas y actualización de lecturas
  + Rol: QA
  + Hs estimadas: 1.5 hs

---

## 🏗️ 4. Cambios estructurales integrados

1. **Máquina de Estados de Negocio**:
   * Estados activos: Pendiente → En revisión → En proceso → Resuelto y Cancelado.
2. **Multi-tenancy por Ciudad**:
   - Adoptar la entidad `ciudades` e incluir `id_ciudad` en `usuarios`, `instituciones` y `reclamos`. Todas las consultas de reclamos comunitarios en backend deben estar filtradas obligatoriamente por la ciudad del usuario.

3. **Exclusión Estricta de Reclamos Privados en el Mapa**:
   - Los reclamos privados **directamente no se listan en el mapa de reclamos**. Tampoco exponen su ubicación en feeds públicos.

---

## 🗄️ 2. Nuevas entidades/tablas necesarias

### 1. `ciudades`
- **Propósito**: Representar los municipios/ciudades (tenants) del sistema.
- **Relaciones**: 1 a N con `usuarios`, `instituciones` y `reclamos`.
- **Campos principales**: `id_ciudad`, `nombre`, `provincia`, `activa`, `fecha_creacion`.

### 2. `institucion_categorias`
- **Propósito**: Mapear qué categorías atiende cada institución en una ciudad determinada para la auto-asignación.
- **Relaciones**: N a N entre `instituciones` y `categorias`.
- **Campos principales**: `id_institucion`, `id_categoria`.

### 3. `reclamos_afectados`
- **Propósito**: Registrar el apoyo de ciudadanos ("A mí también me pasa"), permitiendo agregar y quitar la participación.
- **Relaciones**: N a N entre `reclamos` y `usuarios`.
- **Campos principales**: `id_reclamo`, `id_usuario`, `fecha_creacion` (Primary Key compuesta: `id_reclamo` + `id_usuario`).

### 4. `reclamos_actualizaciones`
- **Propósito**: Novedades y notas agregadas por el ciudadano o la institución durante la gestión.
- **Relaciones**: N a 1 con `reclamos` y `usuarios`.
- **Campos principales**: `id_actualizacion`, `id_reclamo`, `id_usuario`, `tipo_autor`, `texto`, `fecha_creacion`.

### 5. `reclamos_historial`
- **Propósito**: Registro de auditoría inmutable sobre todos los eventos significativos del reclamo.
- **Relaciones**: N a 1 con `reclamos` y `usuarios`.
- **Campos principales**: `id_historial`, `id_reclamo`, `id_usuario`, `tipo_evento`, `detalle`, `estado_anterior`, `estado_nuevo`, `fecha_creacion`.

### 6. `notificaciones` (HU-22 — Notificaciones Internas)
- **Propósito**: Avisos y notificaciones persistentes desacopladas del ciclo del reclamo.
- **Relaciones**: N a 1 con `usuarios` (destinatario) y N a 1 nullable con `reclamos`.
- **Campos principales**: `id_notificacion`, `id_usuario`, `tipo`, `titulo`, `mensaje`, `id_reclamo`, `leida`, `fecha_creacion`, `fecha_lectura`.
- **Índices**: `(id_usuario, fecha_creacion DESC)`, `(id_usuario, leida)`, `(id_reclamo)`.

---

## 🛡️ 3. Cambios de seguridad/autorización

Las siguientes reglas deben ser estrictamente validadas en el **Backend**:

1. **Ciudadano Propietario**:
   - Solo puede editar reclamos si `estado = 'Pendiente'` y el usuario coincide con el creador.
   - Solo puede cancelar sus reclamos si `estado = 'Pendiente'`.
   - Solo puede reabrir sus reclamos si `estado IN ('Resuelto', 'Cancelado')` y dentro del plazo máximo de **15 días** desde la resolución.

2. **Reclamos Privados**:
   - Las consultas públicas y de mapas deben filtrar automáticamente reclamos públicos (los reclamos privados no aparecen en el mapa ni en feeds comunitarios).
   - Para consultar el detalle de un reclamo privado, el backend debe verificar que el usuario coincida con el creador, con la institución asignada o que posea rol `admin`.

3. **Institución Responsable**:
   - Solo puede cambiar de estado reclamos que le hayan sido asignados.
   - Para cancelar un reclamo, la institución debe suministrar obligatoriamente un `motivo_cancelacion`.
   - Para resolver un reclamo, la institución debe suministrar obligatoriamente un `mensaje_resolucion`.

4. **Administrador**:
   - Permiso exclusivo para reasignar reclamos a otra institución e identificar la institución principal de una ciudad.

5. **Notificaciones Internas (HU-22)**:
   - Toda consulta y marcado de notificaciones deriva estrictamente de `req.user.id`.
   - Un usuario solo puede acceder o modificar sus propias notificaciones (protección IDOR).
   - Exclusión de auto-notificación: las acciones ejecutadas por el autor sobre su propio reclamo no le generan notificación.


---

## 🔗 4. Dependencias entre HU

```mermaid
graph TD
    HU05[HU-05 Identificar Inst. Principal] --> HU04[HU-04 Asignar Inst. Automáticamente]
    HU01[HU-01 Crear Reclamo Público] --> HU04
    HU02[HU-02 Crear Reclamo Privado] --> HU04
    HU04 --> HU06[HU-06 Ver Mis Reclamos]
    HU04 --> HU07[HU-07 Ver Reclamos Públicos]
    HU04 --> HU09[HU-09 Consultar Reclamos Institucionales]
    HU18[HU-18 Sistema de Historial] --> HU11[HU-11 Editar Pendiente]
    HU18 --> HU12[HU-12 Cancelar Reclamo]
    HU18 --> HU13[HU-13 Gestionar Estados]
    HU13 --> HU14[HU-14 Resolver Reclamo]
    HU14 --> HU15[HU-15 Reabrir Reclamo]
    HU14 --> HU22[HU-22 Notificaciones Cambio Estado]
    HU16[HU-16 Participar "A mí también me pasa"] --> HU20[HU-20 Mayor Impacto]
    HU13 --> HU19[HU-19 Seguimiento Tiempos]
```

- **HU-04 (Auto-asignación)** depende de **HU-05 (Institución Principal)**.
- **HU-11, HU-12, HU-13, HU-14, HU-15** dependen del backend de **HU-18 (Historial / Auditoría)** para registrar cada cambio de estado o edición.
- **HU-15 (Reabrir)** depende de que el reclamo se encuentre en los estados de resolución o cancelación (**HU-12, HU-14**) dentro de la ventana de 15 días.
- **HU-22 (Notificaciones)** se dispara al cambiar el estado del reclamo (**HU-13, HU-14**).

---

## ⏱️ 5. Orden recomendado de implementación

1. **Fase 1: Estructura de BD y Seguridad Base** (Tablas `ciudades`, extensión de `reclamos`, tabla `reclamos_historial`, constantes de estados).
2. **Fase 2: Asignación e Institución Principal** (HU-05, HU-04).
3. **Fase 3: Creación y Listado de Reclamos** (HU-01, HU-02, HU-03, HU-06, HU-07, HU-08).
4. **Fase 4: Gestión Institucional y Estados** (HU-09, HU-10, HU-13, HU-14, HU-19).
5. **Fase 5: Flujos de Edición, Cancelación, Reapertura y Notificaciones** (HU-11, HU-12, HU-15, HU-22).
6. **Fase 6: Interacción Comunitaria y Auditoría** (HU-16, HU-17, HU-18, HU-20, HU-21).

---

## 👩‍💻 6. División recomendada para tres desarrolladoras

### 👩‍💻 Julieta — *Backend Core, Base de Datos & Auditoría* (48.5 hs / 19 SP)
- **HUs a cargo**: HU-04, HU-05, HU-18, HU-19, HU-21.
- **Entregables**: Tablas relacionales, helper de auto-asignación, middleware de auditoría inmutable, endpoints administrativos de reasignación.

### 👩‍💻 Ludmila — *Portal Ciudadano & Formulación de Reclamos* (82.5 hs / 34 SP)
- **HUs a cargo**: HU-01, HU-02, HU-03, HU-06, HU-11, HU-15, HU-16, HU-22.
- **Entregables**: UI de Creación Público/Privado, Mis Reclamos, Edición en estado Pendiente, Botón Toggle "A mí también me pasa", Flujo de Reapertura (hasta 15 días), Panel de Notificaciones.

### 👩‍💻 Valentina — *Portal Institución, Filtros & Resoluciones* (86.5 hs / 30 SP)
- **HUs a cargo**: HU-07, HU-08, HU-09, HU-10, HU-12, HU-13, HU-14, HU-17, HU-20.
- **Entregables**: Feed de reclamos públicos, Detalle del reclamo, Dashboard institucional, Modal de resolución con evidencia, Bitácora de actualizaciones, Filtros con botón de limpieza.

---

## ⚠️ 7. Riesgos técnicos

1. **Aislamiento Incompleto de Reclamos Privados**:
   - *Riesgo*: Exponer accidentalmente direcciones exactas o coordenadas en endpoints colectivos o en el mapa.
   - *Mitigación*: Filtrar directamente en la cláusula `WHERE` del SQL y excluir totalmente reclamos privados de la capa del mapa.

2. **Inconsistencias en Transiciones de Estado**:
   - *Riesgo*: Permitir salteos ilícitos de estado (ej. pasar de Pendiente a Resuelto sin pasar por revisión o sin mensaje de resolución).
   - *Mitigación*: Validar la máquina de estados en una función centralizada del backend antes de ejecutar la actualización.

3. **Vulnerabilidad de Manipulación de Usuario (IDOR)**:
   - *Riesgo*: Confiar en identificadores de usuario enviados desde el cliente frontend.
   - *Mitigación*: Usar estrictamente el identificador provisto por el middleware JWT.

---

## ❓ 8. Decisiones resueltas

1. **[DECISIÓN DEFINIDA] Tiempo Límite para Reapertura**:
   - **Definición**: Se establece un plazo máximo de **15 días posteriores a la fecha de resolución**. Cumplido dicho plazo, el botón de reapertura se deshabilita y el ciudadano debe registrar un nuevo reclamo.

2. **[DECISIÓN DEFINIDA] Formato de Ubicación para Reclamos Privados**:
   - **Definición**: Los reclamos privados **directamente NO se listan en el mapa de reclamos**, garantizando la máxima privacidad sobre el evento reportado.

---

## 💡 9. Recomendaciones incorporadas al alcance

1. **Rate Limiting por Ciudadano**:
   - Limitar la creación de reclamos pendientes a un máximo de 3 por ciudadano simultáneamente para prevenir publicaciones masivas no deseadas.

2. **Notificaciones Internas en el Cambio de Estado (HU-22)**:
   - Incorporada oficialmente al Sprint 4 como **HU-22** para notificar al ciudadano cuando su reclamo cambie de estado o reciba respuestas de la institución.

---

## 🐛 10. Bugs existentes detectados que podrían afectar el Sprint 4

1. **Envío de Identificador de Usuario en Body JSON**:
   - **Problema**: El cliente frontend envía el ID de usuario manualmente en la petición. Si un usuario modifica la petición HTTP, puede crear reclamos a nombre de otro ciudadano.
   - **Solución**: Remover este envío en el frontend y usar únicamente la identidad autenticada por token en el servidor.

2. **Filtro Inadecuado en Consulta de Reclamos por Usuario**:
   - **Problema**: Realiza combinaciones de tablas institucionales que descartan reclamos de manera no deseada al consultar reclamos propios.
   - **Solución**: Simplificar la consulta para filtrar directamente por el identificador del usuario autenticado.

3. **Incompatibilidad de Nombres de Estados en Base de Datos**:
   - **Problema**: Utiliza estados preliminares (`recibido`, `rechazado`) en lugar de los definidos para el Sprint 4 (`Pendiente`, `Cancelado`).
   - **Solución**: Refactorizar los valores permitidos de estados antes de comenzar el desarrollo de las Historias de Usuario del Sprint 4.
