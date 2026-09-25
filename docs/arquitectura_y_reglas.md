# Arquitectura y reglas generales de ReportARG

## 1. Propósito del documento

Este documento registra las decisiones funcionales, la arquitectura de dominio y las reglas transversales de **ReportARG**. Sirve como la fuente de verdad sobre el funcionamiento general de la plataforma.

### Estructura de la documentación del proyecto:
- [README.md](file:///c:/Users/usuario/Desktop/reportARG/reportarg-api/README.md): Introducción al repositorio, ambiente de desarrollo y comandos de ejecución.
- [docs/arquitectura_y_reglas.md](file:///c:/Users/usuario/Desktop/reportARG/reportarg-api/docs/arquitectura_y_reglas.md): Reglas generales, arquitectura territorial y decisiones transversales del sistema.
- [docs/sprint4_reclamos.md](file:///c:/Users/usuario/Desktop/reportARG/reportarg-api/docs/sprint4_reclamos.md): Especificación técnica y desglose detallado del módulo de Reclamos.

---

## 2. Visión general de ReportARG

ReportARG es una plataforma web diseñada para centralizar y canalizar la interacción entre ciudadanos e instituciones locales. Permite a los vecinos informar problemas urbanos mediante reclamos, recibir comunicados oficiales de las entidades de su municipio y realizar el seguimiento transparente de las resoluciones.

---

## 3. Roles principales

- **Ciudadano:** Vecino de la comunidad. Registra reclamos públicos o privados, consulta el estado de sus solicitudes, expresa su adhesión en reclamos comunitarios ("A mí también me pasa"), agrega novedades y consulta comunicados locales.
- **Institución:** Entidad pública o prestadora de servicios responsable de revisar, gestionar y resolver los reclamos asignados a su área (`Pendiente` → `En revisión` → `En proceso` → `Resuelto` / `Cancelado`), además de publicar comunicados oficiales.
- **Administrador:** Encargado de la supervisión general de la plataforma, verificación de instituciones, intervención excepcional, reasignación de reclamos y control de auditoría inmutable.

---

## 4. Modelo territorial

### 4.1 Ciudad/localidad declarada por el ciudadano
Almacenada en la tabla `ciudadanos` (`ciudad` y `provincia`). Representa la localidad de residencia o preferencia informada por el usuario al registrarse. Puede ser una ciudad donde ReportARG todavía no opere de manera activa.

### 4.2 Ciudad activa de ReportARG
Representada en `usuarios.id_ciudad` (clave foránea a la tabla `ciudades`). Identifica la ciudad/tenant operativa en la que ReportARG se encuentra activa. Si el usuario pertenece a una localidad donde la plataforma aún no opera, `usuarios.id_ciudad` toma el valor `NULL`.

### 4.3 Viale como primera ciudad activa
**Viale, Entre Ríos** es la primera y actualmente única ciudad activa del sistema.
*Aclaración de arquitectura:* Viale NO es un hardcode permanente de la plataforma. El sistema está diseñado para incorporar otros municipios progresivamente sin rehacer la arquitectura.

### 4.4 Usuario sin ciudad activa
Cuando `usuarios.id_ciudad = NULL`, significa que el usuario está registrado pero su localidad declarada aún no cuenta con el servicio de ReportARG activo:
- **Lectura (Feed / Mapa / Tendencias):** Retornan listas vacías y respuestas explícitas de inactividad territorial de forma segura.
- **Escritura (Creación de reclamos):** La API rechaza la creación con un error de negocio `400 Bad Request` (*"No podés registrar reclamos porque tu ciudad declarada aún no se encuentra activa en ReportARG"*).

### 4.5 Ciudad explorada — FUTURO
Posibilidad de que un usuario pueda consultar la información pública de otra ciudad activa diferente a la de su residencia. Actualmente NO implementado.

---

## 5. Catálogo de localidades — FUTURO

Decisión conceptual futura: Separar el catálogo nacional de todas las localidades de Argentina (usado para autocompletar durante el registro) de la tabla `ciudades` (que representa únicamente los municipios donde ReportARG opera activamente). Actualmente NO implementado.

---

## 6. Solicitud de activación — FUTURO

Mecanismo futuro para registrar cuando usuarios de ciudades no activas solicitan la apertura del servicio en su localidad, permitiendo medir la demanda territorial por municipio. Actualmente NO implementado.

---

## 7. Aislamiento por ciudad

Regla fundamental: Las consultas locales se aíslan directamente desde la base de datos a nivel de backend.

- **Feed:** Filtra reclamos públicos por `r.id_ciudad = req.user.id_ciudad` y comunicados por `instituciones.id_ciudad = req.user.id_ciudad`.
- **Reclamos:** Devuelve los reclamos comunitarios correspondientes a la ciudad activa del usuario.
- **Comunicados:** Asociados relacionalmente a la ciudad de la institución emisora.
- **Tendencias:** Calcula las categorías con más reportes restringidas a la ciudad activa del usuario.
- **Mapa:** Devuelve únicamente los puntos geográficos de la ciudad del usuario.

---

## 8. Instituciones y ciudad

- Toda institución pertenece obligatoriamente a una ciudad activa (`instituciones.id_ciudad` es `NOT NULL`).
- Una institución puede estar configurada como la institución principal (`es_principal = 1`) de su ciudad.
- La asignación automática combina `ciudad + categoría -> institución responsable`.

---

## 9. Institución principal

Cada ciudad puede tener configurada una única institución principal (`es_principal = 1`). Para Viale, esa institución es la Municipalidad de Viale.
La lógica de asignación resuelve la entidad mediante la consulta dinámicamente parametrizada `WHERE id_ciudad = ? AND es_principal = 1`, sin depender de nombres fijos ni IDs hardcodeados.

---

## 10. Asignación de reclamos

La asignación automática sigue la regla:
`CIUDAD + CATEGORÍA -> INSTITUCIÓN RESPONSABLE`

Si no existe una institución asociada específicamente a esa categoría en esa ciudad:
→ Asigna a la institución principal (`es_principal = 1`) de esa misma ciudad.

*Para la especificación completa del módulo de reclamos, consultar [docs/sprint4_reclamos.md](file:///c:/Users/usuario/Desktop/reportARG/reportarg-api/docs/sprint4_reclamos.md).*

---

## 11. Reclamos y ciudad

Todo reclamo pertenece obligatoriamente a una ciudad activa (`reclamos.id_ciudad NOT NULL`). El backend deriva el ID de ciudad directamente desde el contexto del usuario autenticado (`req.user.id_ciudad`), rechazando la creación si el usuario no posee una ciudad activa y previniendo la falsificación de este parámetro desde el frontend.

---

## 12. Comunicados y ciudad

La ciudad de un comunicado se deriva de forma relacional desde la institución que lo emite (`comunicado -> institución -> institución.id_ciudad`).

---

## 13. Contexto del usuario autenticado

Se utiliza el endpoint autenticado `/api/auth/me` para obtener el perfil del usuario logueado, retornando `id_ciudad`, `ciudad_activa`, `provincia_activa`, `ciudad_declarada` y `provincia_declarada`. Esto elimina la dependencia indebida de rutas administrativas (como `/admin/usuarios/:id`) para la carga básica del perfil ciudadano.

---

## 14. Datos legacy y backfill de Viale

Mediante la migración SQL idempotente [004_viale_city_context_backfill.sql](file:///c:/Users/usuario/Desktop/reportARG/reportarg-api/migrations/004_viale_city_context_backfill.sql), se asociaron los registros de prueba generados previamente (`usuarios`, `instituciones`, `reclamos` con `id_ciudad IS NULL`) a Viale y se eliminaron los `DEFAULT 1` del esquema.

*Aclaración de arquitectura:* Este backfill fue una migración puntual de datos históricos de desarrollo y no constituye una regla de negocio en tiempo de ejecución.

---

## 15. Reglas sobre hardcodes territoriales

Regla de arquitectura: Queda prohibido hardcodear IDs de ciudad (`id_ciudad = 1`) o nombres de ciudades en la lógica de negocio runtime de la aplicación. Toda relación territorial debe resolverse mediante consultas dinámicas contra la base de datos.

---

## 16. Ambientes y migraciones

Las migraciones de base de datos se estructuran mediante scripts SQL secuenciales en la carpeta `migrations/` y se ejecutan siguiendo los lineamientos documentados en [migrations/REGLAS_MIGRACIONES.md](file:///c:/Users/usuario/Desktop/reportARG/reportarg-api/migrations/REGLAS_MIGRACIONES.md).

---

## 17. Decisiones futuras / todavía no implementadas

Las siguientes capacidades forman parte de la hoja de ruta del producto pero NO están implementadas actualmente:
- Catálogo nacional completo de localidades argentinas.
- Registro con selector Provincia -> Localidad.
- Solicitud de activación de nuevas ciudades por parte de los usuarios.
- Pantalla "ReportARG todavía no está disponible en tu ciudad".
- Modo de exploración de información pública de otras ciudades.
- Administración y métricas multi-ciudad.

---

## 18. Registro de decisiones

| Fecha | Decisión | Motivo |
| :--- | :--- | :--- |
| 2026-09-25 | Separación entre Ciudad Declarada y Ciudad Activa | Permitir registros de cualquier localidad argentina sin romper el aislamiento multi-tenant. |
| 2026-09-25 | Soporte para `usuarios.id_ciudad = NULL` | Manejar legítimamente usuarios de ciudades no activas sin forzar fallbacks ni errores. |
| 2026-09-25 | Asignación dinámica de Institución Principal por `WHERE id_ciudad = ? AND es_principal = 1` | Eliminar hardcodes de nombres e IDs fijos de instituciones. |
| 2026-09-25 | Aislamiento del Feed por ciudad desde SQL backend | Garantizar la privacidad y separación de datos por municipio. |
| 2026-09-25 | Creación del endpoint `/api/auth/me` | Aislar la carga de contexto de perfil ciudadano de las rutas administrativas. |
| 2026-09-25 | Backfill legacy via `004_viale_city_context_backfill.sql` y remoción de `DEFAULT 1` | Regularizar datos históricos sin imponer Viale a usuarios futuros. |
