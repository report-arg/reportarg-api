
# Modelo de Ciudades — ReportARG

## 1. Objetivo

ReportARG debe permitir que distintas ciudades utilicen la aplicación de forma independiente, con sus propias instituciones, categorías, reclamos y responsables.

El sistema debe poder incorporar nuevas ciudades sin modificar el código para agregar nombres o identificadores específicos.

Este documento define las reglas de negocio y el comportamiento esperado del modelo de ciudades. Debe utilizarse como referencia al analizar, desarrollar, probar o modificar funcionalidades relacionadas con ciudadanos, instituciones, administración, autenticación y reclamos.

Antes de implementar cambios, se debe revisar el código existente para identificar qué funcionalidades ya están implementadas, cuáles están incompletas y cuáles requieren correcciones.

## 2. Principios generales

- La aplicación no debe depender de una ciudad específica.
- No se deben utilizar nombres de ciudades ni identificadores fijos para determinar el comportamiento del sistema.
- La autorización siempre debe validarse en el backend.
- La ciudad seleccionada por un usuario no le concede permisos adicionales.
- La verificación de una institución, su habilitación, sus operaciones, sus categorías y su condición de institución principal son conceptos diferentes.
- Los cambios de estado y las asignaciones deben conservar la información histórica necesaria.
- Las operaciones que modifican varias entidades relacionadas deben mantener la integridad de los datos.
- Las pantallas deben reflejar los estados reales del backend y no asumir que una acción tuvo éxito sin confirmación.

## 3. Entidades y conceptos

### 3.1. Ciudad

Representa el ámbito territorial donde se organizan los reclamos y las instituciones responsables.

Una ciudad debe tener un estado que determine si puede operar.

Para que una ciudad comience a operar, debe tener una institución principal válida, responsable de garantizar que los reclamos puedan gestionarse.

Una ciudad no debe activarse sin seleccionar una institución principal que cumpla las condiciones definidas en este documento.

### 3.2. Ciudadano

Es una persona que utiliza ReportARG para consultar información y realizar las operaciones permitidas.

Cada ciudadano tiene una ciudad de residencia y puede guardar hasta tres ciudades adicionales de interés para consultarlas.

La ciudad de residencia es única. Las ciudades de interés son independientes de ella.

El ciudadano puede cambiar entre su ciudad de residencia y sus ciudades de interés sin modificar su residencia.

Por ahora, no se implementará el cambio de ciudad de residencia desde el perfil.

### 3.3. Institución

Es una organización que puede gestionar reclamos o comunicados dentro de la ciudad en la que opera, de acuerdo con su estado, sus permisos y sus categorías habilitadas.

Una cuenta institucional no tiene modo visitante ni una selección libre de ciudades para consultar como si fuera un ciudadano.

La cuenta institucional se utiliza para gestionar las funciones autorizadas dentro de su ciudad operativa.

Si una institución necesita operar en otra ciudad, debe realizar el proceso correspondiente para cambiar o ampliar su ámbito operativo. No debe obtener acceso a otra ciudad solamente cambiando un selector.

### 3.4. Reclamo

Un reclamo debe estar asociado a una ciudad y una categoría.

La institución responsable se determina según la ciudad, la categoría, la operación requerida y las autorizaciones vigentes de las instituciones.

Todo reclamo nuevo que cumpla las validaciones debe tener una institución responsable. No se debe crear un reclamo válido sin asignación por falta de una institución especializada.

### 3.5. Categoría

Permite clasificar reclamos y determinar qué instituciones especializadas pueden gestionarlos.

Una institución puede gestionar una o varias categorías según las autorizaciones que haya recibido.

La institución principal de la ciudad debe poder actuar como responsable general y gestionar todas las categorías, de manera que exista una alternativa válida cuando no haya una institución especializada disponible.

### 3.6. Operación institucional

Una operación representa una función que una institución puede realizar, por ejemplo:

- Gestionar reclamos.
- Gestionar comunicados.

Las operaciones deben administrarse de forma independiente de las categorías.

Una institución puede tener habilitada una operación y no otra. Las categorías se solicitan dentro de la operación correspondiente.

### 3.7. Permiso o capacidad

Representa una autorización concreta para ejecutar una acción protegida.

Las operaciones, las categorías, los permisos, la verificación y la habilitación institucional deben mantenerse diferenciados.

## 4. Estados y ciclo de vida

Los estados definitivos deben contrastarse con el modelo actual de la base de datos antes de modificarlo.

### 4.1. Ciudades

Los estados propuestos son:

- `pending`: solicitud de activación pendiente de revisión.
- `active`: ciudad habilitada para operar.
- `inactive`: ciudad registrada, pero no habilitada para operar.
- `rejected`: solicitud de activación rechazada, si el modelo permite distinguirla de una ciudad inactiva.

La ciudad debe comenzar a operar solamente cuando el administrador apruebe su activación y seleccione una institución principal válida.

La activación de una ciudad y la designación de su institución principal deben realizarse como una operación consistente: no debe quedar activa una ciudad sin institución principal válida.

Una ciudad inactiva puede volver a activarse mediante una acción administrativa que compruebe nuevamente sus requisitos.

### 4.2. Instituciones

Se deben conservar los estados institucionales existentes si el código confirma que son los vigentes, evitando crear estados duplicados sin necesidad.

Como mínimo, el sistema debe distinguir entre una institución pendiente de revisión, habilitada, inactiva y rechazada.

El estado institucional no sustituye la verificación ni las autorizaciones concretas.

### 4.3. Rechazos

El rechazo de una institución o una solicitud de activación debe registrar un motivo obligatorio cuando corresponda.

El motivo debe quedar asociado a la decisión, junto con la fecha y el administrador responsable.

Una nueva solicitud no debe sobrescribir el historial de rechazos anteriores.

## 5. Registro de ciudadanos

El registro debe validar los datos obligatorios y guardar correctamente la ciudad de residencia.

La ciudad seleccionada debe corresponder a una ciudad válida según las reglas del sistema.

Si la ciudad de residencia no está activa, el usuario debe recibir una pantalla que explique la situación y le permita:

- Solicitar la activación o reactivación de la ciudad, cuando corresponda.
- Continuar como visitante y seleccionar otra ciudad activa.

No se debe permitir que el usuario cree reclamos en una ciudad inactiva.

Las relaciones entre el usuario, su perfil y la ciudad deben guardarse de forma consistente.

## 6. Registro de instituciones

El registro debe asociar la institución a su ciudad operativa y validar los datos obligatorios.

El registro no implica habilitación automática.

Una institución debe solicitar la activación de su ciudad si esta todavía no está activa.

### 6.1. Ciudad inactiva durante el registro

Cuando la institución seleccione una ciudad inactiva, el formulario debe mostrar una validación en tiempo real e informar que la ciudad necesita ser activada antes de comenzar a operar.

Debe ofrecerse una opción para indicar si la institución se considera una posible institución principal.

La opción debe incluir información clara sobre qué significa ser institución principal, cuáles son sus responsabilidades y ejemplos de organizaciones que podrían desempeñar esa función, como una municipalidad.

Marcar esta opción expresa una solicitud o postulación; no convierte automáticamente a la institución en principal.

Las solicitudes de instituciones que se postulan como posibles principales deben recibir prioridad administrativa.

La postulación debe quedar vinculada a la solicitud de activación de la ciudad.

### 6.2. Activación y selección de la institución principal

Al activar una ciudad, el administrador debe seleccionar obligatoriamente una institución principal válida.

La institución elegida debe estar registrada y cumplir los requisitos necesarios para asumir esa responsabilidad.

La activación debe aprobar la ciudad y establecer su institución principal de forma consistente.

No se debe activar una ciudad si no existe una institución elegible para asumir esa función.

## 7. Institución principal

Cada ciudad activa debe tener exactamente una institución principal válida.

La institución principal debe:

- Pertenecer a la ciudad correspondiente.
- Estar verificada.
- Estar habilitada para operar.
- Tener concedida la operación y los permisos necesarios para gestionar reclamos.
- Poder gestionar todas las categorías de reclamos como responsable general.

La institución principal actúa como responsable general de la ciudad y como alternativa para los reclamos que no tengan una institución especializada elegible.

La institución principal no debe recibir un reclamo si existe una institución especializada válida para la ciudad, la categoría y la operación requerida.

La unicidad debe protegerse en el backend y en la base de datos, mediante las restricciones que correspondan al esquema actual.

Los cambios de institución principal deben ser consistentes y conservar el historial.

Una ciudad activa no debe quedar sin institución principal válida. Si la institución principal deja de cumplir sus requisitos, el sistema debe impedir las operaciones incompatibles y exigir una resolución administrativa antes de continuar con la operación normal.

## 8. Operaciones y categorías institucionales

Las instituciones deben contar con un apartado en su panel para consultar las operaciones y categorías que tienen habilitadas, y solicitar nuevas autorizaciones.

### 8.1. Solicitud de operaciones

Debe existir una sección para solicitar operaciones institucionales que todavía no estén habilitadas.

Solo deben mostrarse las operaciones que la institución no tenga concedidas y que pueda solicitar según las reglas del sistema.

Una solicitud pendiente no concede la operación.

### 8.2. Solicitud de gestión de categorías

Debe existir una sección para solicitar la gestión de categorías dentro de las operaciones habilitadas.

El comportamiento debe ser dinámico:

- Si la institución no tiene habilitada ninguna operación compatible, no debe poder solicitar categorías para esa operación.
- Si tiene habilitada una sola operación compatible, no es necesario mostrar un selector de operación.
- Si tiene habilitadas varias operaciones compatibles, debe poder seleccionar para cuál desea solicitar una categoría.
- Solo deben mostrarse las categorías que correspondan a la operación seleccionada y que la institución todavía no tenga autorizadas.
- Las solicitudes deben incluir una justificación cuando corresponda.

Las categorías y operaciones solicitadas deben aprobarse explícitamente antes de quedar habilitadas.

### 8.3. Aprobación y revocación

El administrador puede aprobar o rechazar solicitudes.

Las decisiones deben conservar el historial, incluyendo quién decidió, cuándo y el motivo cuando corresponda.

Al revocar una operación, un permiso o una categoría, el backend debe impedir nuevas acciones que requieran esa autorización.

La revocación no debe borrar reclamos ni asignaciones históricas.

## 9. Asignación de reclamos

Todo reclamo válido debe tener una institución responsable.

La asignación debe considerar la ciudad, la categoría y las autorizaciones efectivas de cada institución.

El orden de prioridad es:

1. Institución especializada habilitada para la ciudad, la categoría y la operación requerida.
2. Institución principal de la ciudad como alternativa general.

Por ejemplo, si una ciudad tiene una institución especializada en problemas de agua, los reclamos de esa categoría deben asignarse a esa institución mientras esté habilitada y tenga los permisos necesarios.

Si la institución especializada deja de estar habilitada, pierde la categoría o no cumple los requisitos, los nuevos reclamos correspondientes deben asignarse a la institución principal.

La institución principal debe poder gestionar todas las categorías para evitar que los reclamos válidos queden sin responsable.

El backend debe validar la asignación y no confiar en el identificador de institución enviado por el frontend.

Las asignaciones anteriores deben conservarse en el historial. Los cambios de responsable no deben borrar la trazabilidad.

Si una ciudad deja de tener una institución principal válida, debe bloquearse la operación normal de esa ciudad hasta resolver el problema. No se debe asignar un reclamo a una institución que no cumple los requisitos solo para evitar una asignación vacía.

## 10. Desactivación de ciudades

Cuando una ciudad se desactiva, el usuario que intenta ingresar a ella debe ver una pantalla que explique que la ciudad no está activa.

La pantalla debe permitir:

- Solicitar la reactivación de la ciudad.
- Continuar como visitante y seleccionar otra ciudad activa, cuando el usuario sea un ciudadano.

La pantalla debe ser reutilizable y mostrar contenido diferente según el contexto, por ejemplo, una ciudad inactiva o una solicitud rechazada.

La desactivación debe impedir las operaciones ordinarias que requieren una ciudad activa, incluyendo la creación y gestión normal de reclamos.

Los reclamos, instituciones y datos históricos deben conservarse.

Las consultas históricas deben continuar disponibles cuando la información sea pública o el usuario esté autorizado.

El administrador debe poder consultar y reactivar la ciudad después de comprobar los requisitos.

Las cuentas institucionales no deben disponer de un modo visitante para continuar operando en otras ciudades.

## 11. Ciudades de interés del ciudadano

Cada ciudadano tiene una ciudad de residencia y puede guardar hasta tres ciudades adicionales de interés.

Estas ciudades permiten cambiar el contexto de consulta sin modificar la residencia.

El ciudadano debe poder:

- Agregar una ciudad activa a su lista de interés.
- Eliminar una ciudad de su lista.
- Cambiar entre su ciudad de residencia y sus ciudades de interés.
- Consultar información pública de las ciudades disponibles.

No debe poder guardar más de tres ciudades adicionales de interés.

No se implementará por ahora el cambio de ciudad de residencia.

Si una ciudad de interés se desactiva, debe dejar de estar disponible para operaciones que requieren una ciudad activa y mostrarse el aviso correspondiente cuando el usuario intente ingresar.

Las ciudades de interés no otorgan permisos adicionales ni modifican la autorización para crear o gestionar reclamos.

## 12. Visitantes y acceso público

Un visitante puede consultar información pública de una ciudad activa.

No puede realizar acciones que requieran autenticación, como crear reclamos o gestionar información institucional.

Los visitantes no deben poder consultar datos personales, información interna de las instituciones, auditorías ni reclamos privados.

El acceso público debe controlarse desde el backend, no solamente ocultando componentes en la interfaz.

El modo visitante corresponde a los ciudadanos o usuarios que navegan sin una sesión autenticada. Las cuentas institucionales no tienen modo visitante.

## 13. Pantalla reutilizable de activación y estado

Debe existir una pantalla reutilizable para informar y gestionar situaciones relacionadas con el estado de una ciudad o de una solicitud.

Puede utilizarse para:

- Ciudad de residencia inactiva.
- Solicitud de activación de ciudad pendiente o rechazada.
- Ciudad que necesita ser reactivada.
- Institución cuya solicitud de activación fue rechazada.
- Institución que necesita volver a solicitar la activación.

El contenido y las acciones deben adaptarse al contexto.

Para una ciudad inactiva, debe permitir solicitar activación o reactivación y continuar como visitante cuando corresponda.

Para una institución rechazada, debe mostrar el motivo del rechazo y permitir iniciar una nueva solicitud o salir del flujo institucional para registrarse como ciudadano, si corresponde.

La pantalla no debe conceder permisos ni aprobar solicitudes por sí misma. Las decisiones deben procesarse mediante las operaciones autorizadas del backend.

## 14. Seguridad e integridad

- La autenticación debe verificar la identidad del usuario.
- Los inicios de sesión con proveedores externos deben validar la identidad con el proveedor correspondiente.
- Los roles, estados y permisos deben comprobarse en el backend.
- Los cambios de roles o autorizaciones deben impedir que una sesión desactualizada permita operaciones no autorizadas.
- La selección de ciudad no debe conceder permisos.
- Las instituciones no habilitadas no deben realizar operaciones protegidas.
- Las operaciones solicitadas no deben considerarse habilitadas hasta su aprobación.
- Las operaciones que modifican varias entidades deben mantener la consistencia mediante transacciones cuando corresponda.
- La unicidad de la institución principal debe protegerse contra solicitudes concurrentes.
- Los datos históricos no deben eliminarse por cambios de estado, permisos o responsables.
- Los errores deben manejarse sin dejar estados parciales.
- Deben probarse tanto los flujos correctos como los intentos de acceso no autorizado.

## 15. Decisiones de negocio que deben mantenerse

1. Una ciudad no puede comenzar a operar sin una institución principal válida.
2. El administrador debe seleccionar la institución principal al activar una ciudad.
3. Una institución puede postularse como posible principal durante el registro en una ciudad inactiva.
4. Las postulaciones a institución principal deben recibir prioridad administrativa.
5. La institución principal puede gestionar todas las categorías como alternativa general.
6. Las instituciones especializadas tienen prioridad para los reclamos de las categorías que tienen autorizadas.
7. Todo reclamo válido debe tener una institución responsable mientras la ciudad opere normalmente.
8. Las solicitudes de operaciones y categorías requieren aprobación explícita.
9. Los motivos de rechazo deben ser obligatorios y conservarse en el historial.
10. Una ciudad inactiva debe mostrar una pantalla que permita solicitar reactivación o continuar como visitante, según el tipo de usuario.
11. Los ciudadanos pueden guardar hasta tres ciudades de interés además de su ciudad de residencia.
12. No se implementará por ahora el cambio de ciudad de residencia.
13. Las instituciones no tienen modo visitante ni un selector libre de ciudades para gestionar.
14. No se debe depender de Viale ni de `id_ciudad = 1`.
15. Los permisos y los estados se validan siempre en el backend.

## 16. Criterios generales de calidad

Toda implementación debe:

- Respetar las convenciones documentadas en `AGENTS.md`.
- Evitar refactorizaciones no necesarias.
- Mantener la compatibilidad con los datos existentes o incluir una migración segura cuando corresponda.
- Incluir validaciones de frontend y backend.
- Incluir pruebas para las reglas de negocio afectadas.
- Conservar los registros históricos y la trazabilidad.
- Documentar las decisiones técnicas relevantes.
- Integrarse mediante ramas y pull requests hacia `develop`.
- Mantener `main` sin cambios hasta que el equipo autorice su integración.

Este documento es la referencia funcional del modelo de ciudades. Ante cualquier duda de implementación, primero se deben verificar las reglas aquí definidas y el comportamiento actual del sistema antes de introducir nuevas decisiones.
