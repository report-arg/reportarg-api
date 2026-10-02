# Arquitectura y reglas generales de ReportARG

## 1. Propósito del documento

Este documento registra las decisiones funcionales, reglas de negocio,
arquitectura de dominio y reglas transversales de **ReportARG**.

Funciona como fuente de verdad sobre el comportamiento general esperado de
la plataforma y debe utilizarse como referencia antes de implementar cambios
que afecten roles, permisos, ciudades, instituciones, reclamos, comunicados
o administración.

Que una funcionalidad esté definida en este documento NO significa
necesariamente que ya se encuentre implementada.

### Documentación relacionada

- `README.md`: introducción al repositorio, ambiente de desarrollo y comandos.
- `docs/arquitectura_y_reglas.md`: reglas generales y decisiones funcionales
  transversales.
- `docs/sprint4_reclamos.md`: especificación funcional y técnica detallada
  del módulo de Reclamos correspondiente al Sprint 4.

---

# 2. Visión general

ReportARG es una plataforma de participación ciudadana diseñada para
centralizar la comunicación entre ciudadanos e instituciones locales.

Permite que los ciudadanos puedan:

- conocer qué sucede en su ciudad;
- consultar información oficial;
- registrar problemas;
- realizar seguimiento de sus reclamos;
- participar sobre problemáticas compartidas;
- explorar información pública de otras ciudades.

Las instituciones pueden:

- publicar información oficial;
- recibir reclamos correspondientes a sus áreas;
- gestionar dichos reclamos;
- mantener informada a la comunidad.

Los administradores se encargan de mantener la estructura general de
ReportARG y supervisar el funcionamiento de la plataforma.

ReportARG está diseñado para incorporar progresivamente distintas ciudades
de Argentina.

---

# 3. Tipos de cuenta

ReportARG posee tres tipos principales de cuenta:

- Ciudadano.
- Institución.
- Administrador.

Una cuenta representa exclusivamente a un ciudadano o a una institución.

Una misma cuenta NO puede actuar simultáneamente como ciudadano e
institución.

Por el momento, cada institución posee una única cuenta de acceso.

La posibilidad de múltiples usuarios o empleados asociados a una misma
institución se considera una evolución futura.

---

# 4. Modo visitante

El modo visitante representa un conjunto limitado de permisos que permite
consultar información pública de una ciudad sin pertenecer operativamente
a ella.

No constituye necesariamente un rol independiente en la base de datos.

Un usuario puede encontrarse en modo visitante cuando:

- su ciudad de residencia todavía no está activa en ReportARG;
- explora una ciudad activa diferente a su ciudad de residencia;
- representa una institución que todavía no está habilitada para operar;
- corresponde aplicar permisos de consulta sin participación local.

Un visitante puede:

- explorar información pública;
- consultar reclamos públicos;
- consultar comunicados;
- utilizar el mapa;
- conocer instituciones de una ciudad.

Un visitante NO puede:

- crear reclamos en la ciudad visitada;
- publicar comunicados;
- gestionar reclamos;
- utilizar "A mí también me pasa";
- realizar acciones que requieran pertenecer operativamente a esa ciudad.

Un mismo ciudadano puede, por ejemplo, actuar como ciudadano en Viale y
como visitante al explorar Buenos Aires.

---

# 5. Modelo territorial

ReportARG diferencia varios conceptos territoriales.

No debe confundirse la residencia de una persona con la ciudad que está
visualizando actualmente en la aplicación.

## 5.1. Localidad declarada

Representa la residencia real informada por el ciudadano o institución.

Puede ser cualquier localidad válida de Argentina aunque ReportARG todavía
no opere allí.

## 5.2. Ciudad activa de ReportARG

Representa una localidad donde ReportARG se encuentra operativamente
habilitado.

La tabla `ciudades` representa actualmente este concepto.

Una ciudad activa puede poseer:

- ciudadanos asociados;
- instituciones verificadas;
- una institución principal;
- categorías gestionadas;
- reclamos;
- comunicados;
- actividad propia.

## 5.3. Ciudad operativa del usuario

Actualmente `usuarios.id_ciudad` representa el contexto territorial
operativo principal del usuario.

Si la localidad declarada todavía no está activa:

`usuarios.id_ciudad = NULL`

Esto NO significa que el usuario no tenga una ciudad de residencia.

Significa que su localidad todavía no posee un contexto operativo activo
dentro de ReportARG.

## 5.4. Primera ciudad activa

Viale, Entre Ríos es actualmente la primera ciudad activa.

Viale NO debe considerarse un valor hardcodeado de la plataforma.

La arquitectura debe permitir incorporar nuevas ciudades sin modificar las
reglas fundamentales del sistema.

---

# 6. Catálogo nacional de localidades

ReportARG debe diferenciar conceptualmente:

### Localidades de Argentina

Catálogo utilizado para seleccionar provincia y localidad durante el
registro y otros procesos que requieran una residencia.

### Ciudades activas de ReportARG

Localidades donde ReportARG opera actualmente.

Por lo tanto, una localidad puede existir en el catálogo nacional sin estar
activa en ReportARG.

La implementación completa del catálogo nacional todavía se encuentra
pendiente.

---

# 7. Registro de Ciudadanos

El registro ciudadano debe solicitar:

- nombre;
- apellido;
- correo electrónico;
- contraseña;
- provincia;
- localidad/ciudad de residencia.

El ciudadano debe seleccionar su residencia real.

NO debe elegir obligatoriamente una ciudad activa de ReportARG.

## 7.1. Residencia en una ciudad activa

Si la localidad declarada está activa, el usuario queda asociado
operativamente a ella y puede utilizar las funcionalidades correspondientes
a un ciudadano.

## 7.2. Residencia en una ciudad no activa

Si ReportARG todavía no está disponible en la localidad:

- la cuenta puede crearse igualmente;
- el usuario mantiene su localidad declarada;
- no se le asigna artificialmente otra ciudad;
- se informa que ReportARG todavía no está disponible allí;
- puede solicitar la activación de su ciudad;
- puede explorar otras ciudades activas como visitante.

Nunca debe asignarse automáticamente una ciudad activa diferente solamente
para permitir utilizar la aplicación.

---

# 8. Ciudad de residencia

Cada ciudadano posee una única ciudad de residencia declarada.

La residencia representa dónde vive el ciudadano y determina en qué ciudad
puede participar como ciudadano cuando esa localidad está activa en
ReportARG.

Cuando su residencia corresponde a una ciudad activa puede:

- crear reclamos;
- realizar seguimiento de sus reclamos;
- utilizar "A mí también me pasa";
- consultar información local;
- realizar las demás acciones habilitadas para ciudadanos.

La ciudad de residencia NO debe confundirse con la ciudad que el usuario
está visualizando actualmente.

---

# 9. Ciudades agregadas

Un ciudadano puede agregar otras ciudades activas de ReportARG para
consultarlas aunque no viva en ellas.

Ejemplo:

Residencia:

`Viale, Entre Ríos`

Ciudades agregadas:

- Buenos Aires, CABA.
- Córdoba, Córdoba.

Agregar una ciudad NO modifica la residencia del ciudadano.

Las ciudades agregadas funcionan como accesos guardados que permiten
cambiar fácilmente el contexto de exploración.

El ciudadano puede:

- agregar una ciudad activa;
- eliminar una ciudad agregada;
- consultar sus ciudades guardadas;
- cambiar entre su ciudad de residencia y las ciudades agregadas.

La ciudad de residencia no puede eliminarse como si fuera una ciudad
agregada.

---

# 10. Ciudad seleccionada

La ciudad seleccionada representa la ciudad cuyo contenido está visualizando
actualmente el usuario.

Puede coincidir o no con su ciudad de residencia.

Ejemplo:

Residencia:

`Viale, Entre Ríos`

Ciudad seleccionada:

`Buenos Aires, CABA`

En este caso el usuario continúa siendo ciudadano de Viale, pero está
explorando Buenos Aires como visitante.

Cambiar la ciudad seleccionada:

- NO modifica la residencia;
- NO modifica los reclamos anteriores;
- NO convierte al usuario en residente de esa ciudad;
- NO concede permisos de participación local.

La ciudad seleccionada es principalmente un contexto de navegación y
consulta.

---

# 11. Exploración de otra ciudad como visitante

Cuando un ciudadano selecciona una ciudad activa diferente a su residencia,
ReportARG lo considera visitante dentro de esa ciudad.

Como visitante puede consultar:

- Inicio de la ciudad;
- Explorar;
- reclamos públicos;
- comunicados;
- mapa;
- instituciones;
- otra información pública disponible.

No puede realizar acciones reservadas para ciudadanos pertenecientes a esa
ciudad.

Por ejemplo, no puede:

- crear reclamos;
- utilizar "A mí también me pasa";
- realizar acciones participativas que requieran residencia.

La interfaz debe indicar claramente cuando el usuario se encuentra
explorando una ciudad como visitante.

Ejemplo:

`Explorando Buenos Aires como visitante`

Estas restricciones deben validarse también en backend.

No deben depender únicamente de ocultar botones en frontend.

---

# 12. Cambio de ciudad de residencia

Cambiar la ciudad seleccionada para explorar contenido y cambiar la
residencia son operaciones diferentes.

Un ciudadano podrá modificar su ciudad de residencia cuando realmente se
haya mudado a otra localidad.

Al realizar el cambio:

- se actualiza su localidad de residencia;
- sus reclamos históricos conservan la ciudad donde fueron creados;
- los reclamos existentes NO se trasladan;
- las instituciones asignadas a reclamos anteriores NO cambian;
- el historial existente permanece intacto.

## 12.1. Nueva residencia en una ciudad activa

Si la nueva localidad se encuentra activa en ReportARG, pasa a ser la nueva
ciudad operativa del ciudadano.

A partir de ese momento puede crear nuevos reclamos y participar como
ciudadano dentro de ella.

## 12.2. Nueva residencia en una ciudad no activa

Si ReportARG todavía no opera en la nueva localidad:

- la nueva residencia se guarda igualmente;
- el usuario deja de poseer una ciudad operativa activa;
- `usuarios.id_ciudad` puede quedar en NULL;
- puede solicitar la activación de su nueva ciudad;
- puede continuar explorando ciudades activas como visitante.

## 12.3. Controles sobre el cambio de residencia

El cambio de residencia debe considerarse una modificación relevante de la
cuenta y no un simple selector de navegación.

La plataforma deberá incorporar controles para evitar cambios constantes de
residencia utilizados para eludir restricciones territoriales.

La política específica de frecuencia, confirmación o validación del cambio
queda pendiente de definición.

---

# 13. Portal Ciudadano

El ciudadano perteneciente a una ciudad activa dispone de:

## Inicio

Resumen de la actividad relevante de la ciudad seleccionada.

Cuando está visualizando su ciudad de residencia puede incluir además
acciones participativas propias de un ciudadano.

## Explorar

Permite consultar contenido público mediante búsqueda y filtros.

Incluye principalmente:

- reclamos públicos;
- comunicados;
- categorías.

## Mis Reclamos

Permite consultar y realizar seguimiento de los reclamos creados por el
usuario.

Los reclamos históricos continúan disponibles aunque posteriormente cambie
su ciudad de residencia.

## Mapa

Representación geográfica de información pública correspondiente a la
ciudad seleccionada.

Los reclamos privados nunca deben aparecer en el mapa.

## Notificaciones

Centraliza novedades relacionadas con:

- reclamos propios;
- cambios de estado;
- actualizaciones;
- resoluciones;
- reaperturas;
- otras interacciones relevantes.

---

# 14. Configuración del Ciudadano

El ciudadano puede configurar información relacionada con su cuenta y
preferencias.

## Perfil

Puede administrar:

- nombre;
- apellido;
- foto u otros datos personales habilitados.

## Cuenta y seguridad

Puede gestionar:

- correo electrónico, con las verificaciones correspondientes;
- contraseña;
- mecanismos de seguridad disponibles.

## Ciudad

Puede consultar y gestionar:

- ciudad de residencia;
- ciudad seleccionada;
- ciudades agregadas.

El cambio de residencia utiliza el proceso específico definido para dicha
operación.

## Preferencias

Puede configurar:

- preferencias de notificaciones;
- modo claro/oscuro;
- otras preferencias personales incorporadas posteriormente.

---

# 15. Registro de Instituciones

El registro institucional es independiente del registro ciudadano.

Puede solicitar:

- nombre oficial;
- correo institucional;
- contraseña;
- provincia;
- ciudad/localidad;
- tipo de institución;
- dirección;
- descripción opcional;
- teléfono opcional;
- sitio web o redes opcionales;
- logo;
- capacidades solicitadas;
- categorías que desea gestionar.

Una institución puede solicitar:

- publicar comunicados;
- gestionar reclamos;
- ambas capacidades.

Seleccionar categorías durante el registro constituye una SOLICITUD.

NO concede automáticamente permisos sobre dichas categorías.

---

# 16. Instituciones y ciudad

Una institución debe declarar su localidad real.

Si la ciudad se encuentra activa en ReportARG, puede iniciar el proceso de
incorporación institucional correspondiente.

Si su ciudad todavía no está activa:

- no se la debe asociar artificialmente a otra ciudad;
- puede solicitar la activación;
- puede explorar otras ciudades en modo visitante;
- no puede operar como institución de otra localidad.

Actualmente el esquema existente exige ciudad operativa para instituciones
activas.

La implementación deberá analizarse y eventualmente evolucionar para
representar correctamente instituciones registradas cuya ciudad todavía no
esté activa.

---

# 17. Verificación de Instituciones

Registrarse como institución NO habilita automáticamente capacidades
institucionales.

Toda institución nueva comienza como:

`Pendiente de verificación`

Mientras permanezca pendiente puede explorar información pública, pero NO
puede:

- publicar comunicados;
- gestionar reclamos;
- actuar públicamente como institución verificada.

En la versión actual, la verificación es responsabilidad del Administrador
de ReportARG.

---

# 18. Estados de una Institución

Una institución puede encontrarse en uno de los siguientes estados:

## Pendiente de verificación

La solicitud todavía no fue revisada.

## Verificada

La institución fue validada y puede utilizar las capacidades que tenga
autorizadas.

## Rechazada

La solicitud no fue aprobada.

La cuenta NO se elimina ni se transforma automáticamente en ciudadano.

Debe poder:

- consultar el motivo del rechazo;
- corregir información;
- volver a solicitar verificación cuando corresponda.

## Inhabilitada

La institución había sido autorizada pero perdió temporal o permanentemente
la capacidad de operar.

La inhabilitación NO elimina su información histórica.

---

# 19. Institución principal

Cada ciudad activa debe poseer una única institución principal.

Ejemplo actual:

`Viale, Entre Ríos -> Municipalidad de Viale`

La condición de principal es independiente del estado de verificación.

Por ejemplo:

`Verificada + Principal`

La institución principal debe estar identificada claramente:

- en su perfil;
- frente a ciudadanos;
- en publicaciones;
- en espacios administrativos.

Además, funciona como institución de respaldo para la asignación automática
de reclamos cuando ninguna institución específica gestiona una categoría.

Ser institución principal NO concede automáticamente permisos
administrativos adicionales.

---

# 20. Capacidades institucionales

Una institución verificada puede poseer capacidades independientes.

## Publicar comunicados

Permite crear información oficial.

## Gestionar reclamos

Permite recibir y gestionar reclamos correspondientes a categorías
autorizadas.

Una institución puede:

- publicar comunicados sin gestionar reclamos;
- gestionar reclamos;
- tener ambas capacidades.

La navegación y las acciones disponibles deben respetar estas capacidades.

Una institución sin categorías habilitadas para gestionar reclamos NO debe
recibir una bandeja de reclamos solamente por poseer rol institucional.

---

# 21. Categorías gestionadas por Instituciones

La asignación se basa en:

`CIUDAD + CATEGORÍA -> INSTITUCIÓN RESPONSABLE`

En la versión actual:

**una categoría dentro de una ciudad posee una única institución
responsable.**

Ejemplo:

Viale:

- Cortes de luz -> ENERSA.
- Alumbrado público -> ENERSA.
- Problemas de agua -> Obras Sanitarias.
- Seguridad -> Policía.

Cuando ninguna institución específica administra una categoría:

-> se asigna a la institución principal de esa ciudad.

No deben utilizarse IDs ni nombres hardcodeados para resolver esta relación.

---

# 22. Solicitud de nuevas categorías institucionales

Una institución verificada puede solicitar gestionar nuevas categorías
desde su portal.

La solicitud debe indicar qué categoría desea gestionar.

Solicitarla NO produce una asignación automática.

El Administrador debe poder:

- revisar la solicitud;
- aprobarla;
- rechazarla;
- solicitar correcciones cuando corresponda.

Si se aprueba, se actualiza la relación entre ciudad, categoría e
institución responsable.

---

# 23. Portal Institucional

Dependiendo de sus capacidades, una institución puede disponer de:

## Inicio

Resumen de la gestión actual.

Puede mostrar:

- reclamos pendientes;
- reclamos en revisión;
- reclamos en proceso;
- reclamos demorados;
- reclamos de mayor impacto;
- acceso a crear comunicado cuando corresponda.

## Explorar

Permite consultar la actividad pública general de la ciudad.

Explorar NO es la bandeja institucional.

## Mapa

Permite consultar geográficamente información pública de la ciudad.

## Reclamos

Disponible cuando la institución está autorizada para gestionar reclamos.

Debe mostrar únicamente reclamos asignados a dicha institución.

Permite:

- consultar;
- filtrar;
- ordenar;
- ver detalle;
- cambiar estados;
- resolver;
- cancelar justificadamente;
- agregar actualizaciones;
- consultar historial.

## Comunicados

Permite administrar comunicados propios y crear nuevos cuando la institución
posee esa capacidad.

## Notificaciones

Centraliza novedades relevantes para la institución.

---

# 24. Perfil y configuración institucional

La institución puede administrar información pública que no afecte sus
permisos.

Puede modificar:

- logo;
- descripción;
- teléfono;
- dirección;
- horarios;
- sitio web;
- redes;
- datos públicos de contacto.

Debe poder consultar:

- estado de verificación;
- ciudad;
- condición de institución principal;
- capacidades habilitadas;
- categorías gestionadas.

NO puede modificar directamente:

- estado de verificación;
- ciudad operativa;
- condición de principal;
- categorías autorizadas;
- permisos administrativos.

Los cambios que requieran autorización se realizan mediante solicitudes.

---

# 25. Reclamos

Reclamos y Comunicados son entidades independientes.

Los reclamos representan problemas reportados por ciudadanos.

Pueden crear reclamos:

- ciudadanos pertenecientes operativamente a la ciudad correspondiente;
- administradores.

Las instituciones NO crean reclamos.

Para las reglas detalladas consultar:

`docs/sprint4_reclamos.md`

---

# 26. Creación de Reclamos

Para crear un reclamo el ciudadano debe encontrarse participando como
ciudadano de su ciudad de residencia activa.

No puede crear reclamos en una ciudad que simplemente está explorando como
visitante.

Los datos obligatorios son:

- título;
- descripción;
- categoría;
- ubicación.

La imagen es opcional.

El sistema determina automáticamente:

- ciudadano creador;
- ciudad;
- estado inicial;
- institución responsable.

Estos valores sensibles no deben confiarse al frontend.

---

# 27. Visibilidad de Reclamos

Un reclamo puede ser:

## Público

Puede aparecer en:

- Inicio;
- Explorar;
- búsquedas;
- mapa cuando corresponda;
- otras vistas públicas.

## Privado

Puede ser consultado únicamente por:

- ciudadano creador;
- institución responsable;
- administrador autorizado.

Los reclamos privados NO aparecen:

- en feeds comunitarios;
- en búsquedas públicas;
- en mapas públicos.

La protección debe realizarse en backend.

---

# 28. Estados de Reclamos

Flujo principal:

`Pendiente -> En revisión -> En proceso -> Resuelto`

También existe:

`Cancelado`

El backend debe validar las transiciones.

No se permiten saltos arbitrarios.

La institución responsable gestiona las transiciones ordinarias.

---

# 29. Edición, cancelación y resolución

## Edición ciudadana

El ciudadano puede editar un reclamo mientras se encuentre Pendiente.

Una vez que pasa a En revisión deja de poder editarlo.

Debe quedar registrado que el reclamo fue editado.

## Cancelación ciudadana

El ciudadano puede cancelar su propio reclamo mientras permanezca Pendiente.

## Cancelación institucional

La institución responsable puede cancelar cuando exista una razón válida.

Debe registrar obligatoriamente el motivo.

## Resolución

Para resolver un reclamo, la institución responsable debe proporcionar un
mensaje de resolución obligatorio.

La evidencia o imagen de resolución es opcional.

Se registra automáticamente la fecha de resolución.

---

# 30. Reapertura

El ciudadano creador puede reabrir un reclamo Resuelto o Cancelado dentro de
un plazo máximo de 15 días posteriores al cierre, cuando se cumplan las reglas
establecidas por el módulo.

Reglas del flujo de reapertura (HU-15):

- La reapertura reutiliza la misma instancia del reclamo (conserva ID e historial previo).
- NO crea un reclamo duplicado.
- Requiere un motivo de justificación obligatorio.
- Debe realizarse dentro de los 15 días corridos desde `fecha_ultimo_cambio_estado`.
- **Determinación dinámica del estado de destino:**
  - Si el reclamo fue cancelado voluntariamente por el ciudadano desde estado `Pendiente`, regresa a estado `Pendiente` (limpiando `motivo_cancelacion` y `cancelado_por_tipo`).
  - Si el reclamo fue resuelto o cancelado por la institución responsable, regresa a estado `En revisión`.
- Se registra de forma inmutable un nuevo evento `REAPERTURA` en el historial de auditoría con el `estado_nuevo` correspondiente.
- Se notifica internamente a la institución responsable asignada (`CLAIM_REOPENED`), reincorporando el reclamo a su bandeja de gestión activa.
- Otros ciudadanos o instituciones no pueden reabrir reclamos ajenos (403).

---

# 31. "A mí también me pasa"

Los ciudadanos pueden indicar que también se encuentran afectados por un
reclamo público de su ciudad.

Reglas de la funcionalidad (HU-16):

- Cada ciudadano puede adherirse una sola vez y posteriormente retirar su adhesión (mecanismo toggle atómico).
- La cantidad de afectados funciona como indicador de impacto comunitario.
- **Restricciones estrictas validadas en backend:**
  - Exclusivo para usuarios autenticados con rol `ciudadano`.
  - Debe coincidir la ciudad operativa del usuario con la ciudad del reclamo (`req.user.id_ciudad === reclamo.id_ciudad`). Los visitantes no pueden votar.
  - No está disponible para reclamos privados.
  - El propio creador del reclamo no puede adherirse a su propio reclamo.
  - No está permitido en reclamos en estados terminales (`Resuelto`, `Cancelado`).
- Utilizar esta funcionalidad NO concede derechos de gestión sobre el reclamo.

---

# 32. Actualizaciones

El ciudadano creador y la institución responsable pueden agregar
actualizaciones relacionadas con la evolución del reclamo.

Las actualizaciones funcionan como una bitácora cronológica inmutable.

NO constituyen comentarios públicos ni foros de discusión.

No se debe reutilizar el sistema de comentarios de Comunicados para esta
funcionalidad.

Reglas de permisos por máquina de estados (HU-17):

- **Estado `Pendiente`:**
  - Únicamente el ciudadano creador puede publicar actualizaciones o aportar nuevos datos.
  - Al publicarse, se notifica automáticamente a la institución asignada para mantenerla informada de los nuevos aportes.
  - Instituciones y terceros tienen prohibida la publicación mientras el reclamo esté pendiente (403).
- **Estados `En revisión` y `En proceso`:**
  - Únicamente la institución responsable asignada puede publicar actualizaciones institucionales de gestión y avances de cuadrilla.
  - El ciudadano creador ya no puede publicar (se le informa en la interfaz que el caso se encuentra en gestión del organismo).
- **Estados terminales (`Resuelto` y `Cancelado`):**
  - No se permiten nuevas actualizaciones por ningún rol (400).

---

# 33. Historial y auditoría

Los reclamos mantienen un historial inmutable de eventos relevantes.

Debe registrar, según corresponda:

- creación;
- edición;
- asignación;
- cambio de estado;
- cancelación;
- resolución;
- reapertura;
- reasignación;
- otras acciones auditables.

Cada evento debe permitir conocer:

- qué ocurrió;
- cuándo;
- quién realizó la acción.

El historial no puede modificarse ni eliminarse mediante las operaciones
normales del sistema.

---

# 34. Seguimiento de tiempos

Un reclamo que permanece durante el período definido en estado Pendiente
debe poder identificarse como demorado.

Actualmente Sprint 4 define una demora a partir de 5 días.

`Demorado` NO constituye un estado adicional.

Es una condición calculada.

Las instituciones pueden utilizarla para priorizar su trabajo.

En el futuro pueden incorporarse tiempos objetivo específicos por categoría.

---

# 35. Comunicados

Los Comunicados representan información oficial publicada por instituciones.

Pueden crear comunicados:

- instituciones verificadas que posean dicha capacidad;
- administradores.

Los ciudadanos NO pueden crear comunicados.

Cada comunicado debe mantener identificada a la institución emisora y admite
de manera nativa una imagen ilustrativa opcional (`imagen`), accesible y visible
tanto en el feed público de la comunidad como en la vista de detalle.

Reclamos y Comunicados permanecen separados tanto conceptual como
relacionalmente.

---

# 36. Administrador de ReportARG

El Administrador representa a los responsables generales de ReportARG.

No pertenece operativamente a una institución determinada.

Su función principal es administrar la estructura de la plataforma y
resolver situaciones que requieren intervención global.

El panel administrativo se organiza conceptualmente en:

- Inicio;
- Instituciones;
- Ciudades;
- Categorías;
- Reclamos;
- Usuarios;
- Solicitudes;
- Configuración.

---

# 37. Inicio del Administrador

El Inicio debe priorizar tareas que requieren intervención.

Puede mostrar:

- instituciones pendientes de verificación;
- solicitudes de activación de ciudades;
- solicitudes de categorías;
- reclamos que requieren intervención administrativa;
- otras solicitudes pendientes.

El objetivo principal del Inicio es responder:

**¿Qué necesita atención dentro de ReportARG?**

Debe priorizar acciones útiles sobre estadísticas decorativas.

---

# 38. Administración de Instituciones

El Administrador puede consultar instituciones según su estado:

- pendientes;
- verificadas;
- rechazadas;
- inhabilitadas.

Puede revisar:

- datos declarados;
- ciudad;
- tipo de institución;
- información de contacto;
- capacidades solicitadas;
- categorías solicitadas.

Puede:

- verificar;
- rechazar indicando motivo;
- solicitar correcciones;
- inhabilitar;
- rehabilitar;
- modificar capacidades;
- administrar categorías autorizadas;
- configurar la institución principal.

El Administrador también puede crear manualmente una institución.

Las instituciones creadas administrativamente deben quedar igualmente
identificadas y auditadas.

Las operaciones administrativas sensibles deben registrar quién realizó la
acción y cuándo.

---

# 39. Administración de Ciudades

El Administrador puede:

- consultar ciudades;
- activar ciudades;
- desactivar ciudades;
- configurar institución principal;
- consultar instituciones asociadas;
- consultar solicitudes de activación;
- consultar información general de actividad.

Desactivar una ciudad NO elimina sus datos históricos.

Los reclamos, comunicados e historial existentes deben conservarse.

La desactivación bloquea nuevas operaciones que requieran que la ciudad esté
activa.

---

# 40. Solicitudes de activación de ciudad

Cuando la localidad declarada por un ciudadano o institución no se encuentra
activa puede solicitar su incorporación a ReportARG.

Estas solicitudes permiten medir demanda territorial.

Ejemplo:

- Paraná -> 138 solicitudes.
- Crespo -> 47 solicitudes.
- Diamante -> 23 solicitudes.

Una solicitud NO activa automáticamente una ciudad.

La decisión corresponde al Administrador.

---

# 41. Administración de Categorías

Las categorías son globales dentro de ReportARG.

El Administrador puede:

- crear;
- editar;
- modificar descripción;
- administrar icono;
- ordenar;
- activar;
- desactivar.

Una categoría no pertenece directamente a una institución.

La responsabilidad operativa se determina mediante:

`Ciudad + Categoría -> Institución`

Actualmente se permite una sola institución responsable por categoría y
ciudad.

---

# 42. Administración de Reclamos

El Administrador puede:

- consultar reclamos;
- buscar;
- filtrar;
- consultar historial;
- consultar asignación;
- detectar reclamos sin responsable;
- reasignar institución;
- intervenir excepcionalmente.

También puede crear reclamos.

Sin embargo, la gestión ordinaria corresponde a la institución responsable.

El Administrador NO debe utilizarse como sustituto habitual de una
institución.

Toda reasignación administrativa debe quedar registrada.

---

# 43. Administración de Usuarios

El Administrador puede:

- buscar ciudadanos;
- consultar estado de cuenta;
- consultar ciudad asociada;
- inhabilitar cuentas;
- rehabilitar cuentas.

NO puede:

- conocer contraseñas;
- consultar credenciales;
- modificar directamente contraseñas;
- actuar silenciosamente como otro usuario.

La recuperación de contraseña utiliza los mecanismos normales de seguridad.

---

# 44. Solicitudes administrativas

ReportARG debe contar con un sistema de solicitudes administrativas.

Puede incluir:

## Verificación institucional

Nueva institución esperando validación.

## Activación de ciudad

Solicitud de incorporación de una localidad.

## Categorías institucionales

Institución que solicita gestionar una nueva categoría.

## Cambios institucionales relevantes

Solicitudes que afectan información o permisos que la institución no puede
modificar directamente.

El Administrador puede:

- aprobar;
- rechazar;
- solicitar correcciones.

Las decisiones relevantes deben quedar auditadas.

---

# 45. Matriz general de permisos

| Acción | Ciudadano en su ciudad | Ciudadano visitante | Institución verificada | Administrador |
|---|---|---|---|---|
| Explorar contenido público | Sí | Sí | Sí | Sí |
| Ver mapa público | Sí | Sí | Sí | Sí |
| Agregar ciudades para explorar | Sí | Sí | No aplica | No aplica |
| Crear reclamo | Sí | No | No | Sí |
| Editar reclamo propio | Según estado | No | No | Intervención excepcional |
| Cancelar reclamo propio | Según estado | No | No | Intervención excepcional |
| "A mí también me pasa" | Sí | No | No | No |
| Gestionar reclamo asignado | No | No | Sí | Intervención excepcional |
| Crear comunicado | No | No | Sí, si está habilitada | Sí |
| Solicitar categoría | No | No | Sí | No aplica |
| Administrar categorías | No | No | No | Sí |
| Verificar instituciones | No | No | No* | Sí |
| Activar ciudades | No | No | No | Sí |
| Reasignar reclamos | No | No | No | Sí |
| Configurar institución principal | No | No | No | Sí |

\* En una evolución futura una institución principal podrá verificar
instituciones si el Administrador le delega explícitamente ese permiso.

---

# 46. Aislamiento por ciudad

Las consultas operativas deben aislarse desde backend.

Debe diferenciarse entre:

- ciudad de residencia;
- ciudad operativa;
- ciudad seleccionada para explorar.

## Feed / Explorar

Cuando se consulta una ciudad, el contenido público debe filtrarse por la
ciudad seleccionada.

## Reclamos

Cada reclamo pertenece obligatoriamente a la ciudad donde fue creado.

La ciudad de un reclamo NO cambia si posteriormente el ciudadano cambia de
residencia.

## Comunicados

La ciudad de un comunicado se deriva de la institución emisora.

## Tendencias

Se calculan dentro de la ciudad consultada.

## Mapa

Muestra únicamente información pública correspondiente a la ciudad
seleccionada.

Los reclamos privados nunca aparecen en el mapa público.

## Operaciones participativas

Para acciones como crear un reclamo o utilizar "A mí también me pasa", el
backend debe comprobar que el usuario posee permisos de ciudadano en esa
ciudad y no es simplemente un visitante.

Nunca deben mezclarse datos privados entre ciudades.

---

# 47. Contexto autenticado

El endpoint:

`/api/auth/me`

provee actualmente información relacionada con el usuario autenticado.

Puede incluir datos como:

- `id_ciudad`;
- `ciudad_activa`;
- `provincia_activa`;
- `ciudad_declarada`;
- `provincia_declarada`.

A medida que se implemente el modelo de ciudades agregadas y ciudad
seleccionada deberá revisarse qué información pertenece realmente al perfil
persistente del usuario y qué información corresponde al contexto de
navegación.

La ciudad seleccionada para explorar NO debe confundirse con la residencia
del usuario.

Las decisiones de autorización deben utilizar el contexto autenticado y no
identificadores manipulables enviados desde frontend.

---

# 48. Seguridad

Toda autorización debe aplicarse en backend.

El frontend puede ocultar acciones que un usuario no posee, pero eso NO
constituye una medida de seguridad suficiente.

Debe garantizarse:

- autenticación;
- autorización por rol;
- autorización según capacidades institucionales;
- aislamiento territorial;
- diferenciación entre residente y visitante;
- aislamiento institucional;
- protección de reclamos privados;
- prevención de IDOR;
- validación de transiciones;
- auditoría de operaciones sensibles.

El frontend refleja los permisos.

El backend constituye la fuente real de autorización.

---

# 49. Reglas contra hardcodes territoriales

Está prohibido utilizar en la lógica runtime:

- `id_ciudad = 1`;
- nombres fijos de ciudades;
- IDs fijos de instituciones;
- nombres de instituciones para resolver permisos.

Las relaciones deben obtenerse dinámicamente desde la base de datos.

Viale es actualmente la primera ciudad activa, no una regla permanente del
sistema.

---

# 50. Datos legacy y backfill

La migración:

`004_viale_city_context_backfill.sql`

fue utilizada para asociar datos históricos de desarrollo sin ciudad a
Viale.

Fue una migración puntual.

NO constituye una regla de negocio.

La aplicación no debe utilizar Viale como fallback para nuevos usuarios.

La migración:

`005_cleanup_legacy_institution_claims.sql`

se utilizó para eliminar reclamos ficticios creados durante etapas
anteriores por cuentas institucionales.

No debe interpretarse como comportamiento runtime.

---

# 51. Ambientes y migraciones

Las migraciones se mantienen mediante scripts SQL secuenciales.

Deben respetarse las reglas definidas en:

`migrations/REGLAS_MIGRACIONES.md`

Una migración ya ejecutada no debe modificarse para introducir cambios
posteriores.

Los cambios nuevos deben incorporarse mediante nuevas migraciones
incrementales.

---

# 52. Principios generales

## Reclamos y Comunicados permanecen separados

Son entidades y procesos diferentes.

## La ciudad forma parte del contexto de negocio

La información operativa pertenece a una ciudad determinada.

## Residencia y ciudad seleccionada son conceptos diferentes

Cambiar la ciudad que se está explorando NO cambia la residencia.

## Un ciudadano puede explorar múltiples ciudades

Puede guardar otras ciudades activas y visitarlas sin adquirir permisos de
residente.

## La residencia determina la participación territorial

Las acciones participativas se habilitan en la ciudad donde el ciudadano
posee pertenencia operativa.

## La residencia puede cambiar

El cambio de residencia utiliza un proceso específico y no altera la ciudad
de los reclamos históricos.

## Registrarse como institución no implica estar verificada

Debe existir aprobación antes de habilitar capacidades institucionales.

## Verificación y capacidades son conceptos diferentes

Una institución puede estar verificada pero tener solamente algunas
capacidades habilitadas.

## Ser institución principal no concede permisos administrativos

Los permisos adicionales deben otorgarse explícitamente.

## Una categoría tiene un responsable definido por ciudad

Actualmente:

`1 categoría + 1 ciudad = 1 institución responsable`

## Las acciones importantes son trazables

Estados, verificaciones, asignaciones, resoluciones, reaperturas y acciones
administrativas relevantes deben quedar auditadas.

## La desactivación no elimina historia

Inhabilitar usuarios, instituciones, categorías o ciudades no debe destruir
la información histórica relacionada.

---

# 53. Evoluciones futuras

Las siguientes funcionalidades forman parte de la evolución prevista de
ReportARG y NO corresponden necesariamente a la primera versión.

## 53.1. Múltiples usuarios por institución

Una misma institución podrá tener diferentes empleados o representantes con
cuentas individuales y permisos específicos.

Por el momento existe una única cuenta por institución.

## 53.2. Verificación delegada de instituciones

Actualmente la verificación corresponde exclusivamente al Administrador.

En una futura versión, el Administrador podrá delegar la verificación de
instituciones de una ciudad a su institución principal.

Ejemplo:

`Administrador ReportARG`
-> habilita a `Municipalidad de Viale`
-> Municipalidad puede verificar instituciones de Viale.

Ser institución principal NO concede automáticamente esta capacidad.

El permiso debe ser habilitado explícitamente por el Administrador y podrá
ser revocado posteriormente.

Cuando esté habilitado, el portal de la institución principal incorporará
una sección adicional, por ejemplo:

`Instituciones`

o

`Solicitudes de instituciones`

Desde allí podrá:

- consultar solicitudes pendientes correspondientes únicamente a su ciudad;
- revisar la información presentada por la institución;
- consultar las categorías que solicita gestionar;
- aprobar la verificación;
- rechazar indicando un motivo;
- solicitar correcciones.

La institución principal solo podrá actuar sobre instituciones pertenecientes
a su propia ciudad.

El Administrador de ReportARG continuará teniendo autoridad global y podrá:

- verificar instituciones directamente;
- habilitar o revocar el permiso delegado;
- consultar las decisiones realizadas;
- intervenir ante situaciones excepcionales.

Todas las verificaciones, rechazos y modificaciones deberán quedar
registradas indicando quién realizó la acción y cuándo.

## 53.3. Administración territorial

Podrán existir niveles adicionales de administración municipal, provincial
o regional.

No forman parte de la versión actual.

## 53.4. Múltiples instituciones por categoría

En el futuro podrá analizarse la posibilidad de distribuir una categoría
entre múltiples instituciones.

Actualmente existe una única responsable por categoría y ciudad.

## 53.5. SLA por categoría

Podrán configurarse tiempos esperados diferentes según el tipo de reclamo.

## 53.6. Relaciones avanzadas con múltiples ciudades

Además del sistema definido de:

- ciudad de residencia;
- ciudades agregadas;
- ciudad seleccionada;
- exploración como visitante;

en futuras versiones podrá contemplarse que un usuario tenga relaciones
adicionales con distintas ciudades por motivos laborales, educativos,
familiares u otros.

## 53.7. Foros y comunidad

Espacios de conversación entre ciudadanos.

## 53.8. Eventos

Publicación y gestión de actividades locales.

## 53.9. Servicios esenciales

Información centralizada sobre servicios importantes de cada localidad.

## 53.10. Grupos y chat

Herramientas comunitarias de comunicación más avanzadas.

---

# 54. Funcionalidades definidas pero todavía no necesariamente implementadas

Este documento representa la definición funcional objetivo de ReportARG.

Por lo tanto, que una funcionalidad aparezca aquí NO significa que ya esté
implementada.

Antes de implementar nuevos cambios debe compararse esta definición contra:

- frontend actual;
- backend actual;
- esquema de base de datos;
- migraciones existentes;
- documentación específica del Sprint 4.

Entre las capacidades que deben verificarse especialmente se encuentran:

- nuevo flujo de registro Ciudadano / Institución;
- catálogo Provincia -> Localidad;
- registro desde ciudades no activas;
- modo visitante;
- ciudades agregadas;
- selector de ciudad;
- ciudad seleccionada;
- exploración de otras ciudades;
- cambio de residencia;
- controles sobre cambio de residencia;
- solicitudes de activación;
- estados de verificación institucional;
- rechazo e inhabilitación institucional;
- capacidades institucionales independientes;
- solicitudes de categorías;
- perfiles y configuraciones por rol;
- panel administrativo completo;
- administración de ciudades;
- administración de instituciones;
- administración de usuarios;
- sistema general de solicitudes.

Las diferencias entre esta definición y el código actual NO deben resolverse
automáticamente sin analizar previamente impacto, dependencias y
migraciones necesarias.

---

# 55. Registro de decisiones

| Fecha | Decisión | Motivo |
|---|---|---|
| 2026-09-25 | Separar ciudad declarada y ciudad activa | Permitir usuarios de cualquier localidad sin romper el aislamiento territorial. |
| 2026-09-25 | Permitir `usuarios.id_ciudad = NULL` | Representar usuarios cuya localidad todavía no está activa. |
| 2026-09-25 | Resolver institución principal dinámicamente | Evitar IDs y nombres hardcodeados. |
| 2026-09-25 | Aislar Feed y Reclamos por ciudad desde backend | Garantizar separación territorial y seguridad. |
| 2026-09-25 | Incorporar `/api/auth/me` | Centralizar el contexto del usuario autenticado. |
| 2026-09-25 | Mantener Reclamos y Comunicados como entidades separadas | Representan procesos de negocio diferentes. |
| 2026-09-30 | Una cuenta representa exclusivamente a un ciudadano o institución | Evitar ambigüedad de identidad y permisos. |
| 2026-09-30 | Una institución posee una sola cuenta en la versión actual | Mantener simple el modelo inicial. |
| 2026-09-30 | Crear registros independientes para Ciudadano e Institución | Cada tipo de cuenta necesita información y procesos diferentes. |
| 2026-09-30 | Toda institución requiere verificación antes de operar | Evitar que una cuenta no validada publique información oficial o gestione reclamos. |
| 2026-09-30 | Una institución puede ser gestora, informadora o ambas | Separar la capacidad de publicar de la capacidad de gestionar reclamos. |
| 2026-09-30 | Las categorías solicitadas requieren aprobación administrativa | Evitar apropiación automática de responsabilidades. |
| 2026-09-30 | Una categoría tiene una única institución responsable por ciudad | Simplificar la asignación automática actual. |
| 2026-09-30 | Una institución rechazada conserva su cuenta | Permitir consultar el motivo y corregir la solicitud. |
| 2026-09-30 | El Administrador puede crear Reclamos y Comunicados | Permitir intervención administrativa cuando sea necesaria. |
| 2026-09-30 | El Administrador puede crear instituciones manualmente | Facilitar incorporación administrativa de organismos. |
| 2026-09-30 | Desactivar una ciudad conserva su información histórica | Evitar pérdida de trazabilidad. |
| 2026-09-30 | Las instituciones pueden solicitar nuevas categorías | Permitir evolución controlada de responsabilidades. |
| 2026-09-30 | La verificación delegada queda como evolución futura | Mantener simple la versión actual y permitir escalabilidad posterior. |
| 2026-09-30 | Ser institución principal no implica permiso de verificación | Los privilegios administrativos deben otorgarse explícitamente. |
| 2026-09-30 | Un ciudadano puede guardar y explorar otras ciudades activas | Permitir consultar ReportARG fuera de la ciudad de residencia. |
| 2026-09-30 | Explorar otra ciudad utiliza permisos de visitante | Evitar que seleccionar una ciudad otorgue permisos de residente. |
| 2026-09-30 | Ciudad de residencia y ciudad seleccionada son conceptos diferentes | Separar pertenencia territorial de navegación. |
| 2026-09-30 | Cambiar de residencia no modifica reclamos históricos | Preservar trazabilidad territorial. |
| 2026-09-30 | El cambio de residencia tendrá controles específicos | Evitar el uso del cambio de residencia para eludir restricciones territoriales. |
| 2026-10-01 | Notificaciones internas desacopladas y seguras (HU-22) | Avisos persistentes al ciudadano sin realtime pesado ni auto-notificaciones con derivación estricta de identidad desde el token. |
| 2026-10-02 | Soporte de imagen en Comunicados | Permitir a las instituciones asociar imágenes ilustrativas a sus comunicados oficiales, persistidas en BD (`009_comunicados_imagen.sql`) y expuestas en el feed. |
| 2026-10-02 | Determinación dinámica de estado en Reapertura (HU-15) | Si el reclamo fue cancelado por el ciudadano desde Pendiente, regresa a Pendiente; si fue resuelto o cancelado por institución, regresa a En revisión. |
| 2026-10-02 | Reglas de participación en "A mí también me pasa" (HU-16) | Exclusivo de ciudadanos con coincidencia de ciudad operativa (`id_ciudad`), bloqueado en reclamos privados, autoría propia y estados terminales. |
| 2026-10-02 | Notificaciones institucionales de asignación y reapertura (HU-22) | Notificación interna `CLAIM_ASSIGNED` a la institución ante creación y reasignación administrativa, y `CLAIM_REOPENED` ante reapertura. |
| 2026-10-02 | Ventanas de publicación de actualizaciones por estado (HU-17) | En estado Pendiente solo el autor ciudadano puede publicar novedades (notificando a la institución); a partir de En revisión solo la institución asignada puede actualizar la bitácora. |
| 2026-10-02 | Notificación de apoyo vecinal `CLAIM_SUPPORT` (HU-16/HU-22) | Se despacha automáticamente una notificación interna al creador del reclamo cuando un vecino marca "A mí también me pasa". |
| 2026-10-02 | Visualización y acceso a actualizaciones en el feed y simplificación de UI | Exposición de `actualizacionesCount` en feed/reclamos con botón directo "Actualizaciones {N}" en cada card, y simplificación del texto de avisos a "Ver reclamo" sin `#ID`. |
| 2026-10-02 | Línea de estados interactiva institucional y erradicación de confirm/alert | Reemplazo del botón único por una línea de tiempo secuencial interactiva (`Pendiente` → `En revisión` → `En proceso` → `Resuelto`) con acción directa clickeable en el paso siguiente, modales accesibles y feedback mediante Sonner toasts sin diálogos nativos del navegador. |