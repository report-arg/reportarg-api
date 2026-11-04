# Sprint 5 — Listados e Informes Institucionales

**Proyecto:** ReportARG  
**Instancia:** Parcial 2  
**Sprint:** 5  
**Tickets:** LIS-01, LIS-02, INF-01 e INF-02  
**Cierre de decisiones funcionales:** 7 de octubre de 2026

> Documento vivo que registra alcance, reglas de negocio, decisiones e implementación informada. Los detalles no respaldados por la información disponible se indican como aspectos a verificar.

## 1. Objetivo del Sprint

El Sprint 5 mejoró la consulta y gestión de reclamos por parte de las instituciones e incorporó informes de gestión. Se trabajó en:

- Listado operativo de reclamos en tabla.
- Búsqueda, filtros combinables, ordenamiento y paginación.
- Informes institucionales por período.
- Indicadores, gráficos y ranking de impacto.
- Navegación desde los informes hacia la bandeja (*drill-down*).
- Exportación PDF con vista previa.

Se definieron dos herramientas complementarias:

1. **Bandeja institucional:** herramienta operativa para localizar reclamos y acceder a su gestión.
2. **Informes institucionales:** herramienta analítica para observar el comportamiento de los reclamos recibidos durante un período.

La bandeja está orientada al trabajo diario; los informes, al análisis y seguimiento.

## 2. Relación con la consigna del Parcial 2

La profesora solicita un video grabado de aproximadamente 10 a 12 minutos. Debe presentar brevemente el proyecto, mostrar el sistema y lo desarrollado en Sprint 5, evidenciar al menos un flujo completo de la funcionalidad transaccional, explicar reglas y validaciones, relacionar la demo con Historias de Usuario y criterios de aceptación, comentar ajustes y decisiones, y contar con la participación oral de todos los integrantes.

La demo debería mostrar un recorrido real: ingreso como institución, consulta de bandeja, aplicación de filtros, apertura de un reclamo, análisis de un período en Informes, navegación desde un indicador a la bandeja y generación del PDF.

**Sobre el flujo transaccional:** las funcionalidades centrales de este sprint son de consulta y análisis. Para cumplir la consigna, muestren el recorrido hasta la gestión del reclamo. Si existe una acción real de cambio de estado ya implementada y segura para probar, pueden modificar un reclamo de prueba y verificar el resultado. No simulen una operación ni atribuyan a Sprint 5 una funcionalidad desarrollada en otro sprint.

## 3. Historias y alcance funcional

### LIS-01 — Listado operativo de reclamos institucionales

**Objetivo:** que una institución consulte los reclamos que tiene asignados mediante una vista clara y organizada.

**Alcance:** reemplazo de la grilla de tarjetas por una tabla operativa; visualización de los datos necesarios para identificar y priorizar cada reclamo; acceso al detalle/gestión desde la fila; adaptación a pantallas pequeñas mediante tarjetas compactas.

**Datos mostrados:** identificador; título y dirección; categoría; fecha de creación; visibilidad; estado; cantidad de afectados; antigüedad/demora; acción Gestionar.

**Criterios funcionales:** la institución ve solo sus reclamos; identifica cada registro sin abrirlo; puede acceder a su gestión; se distingue bandeja sin reclamos asignados de búsqueda sin resultados; la vista sigue siendo accesible en pantallas pequeñas.

### LIS-02 — Búsqueda, filtros, ordenamiento y paginación

**Objetivo:** localizar reclamos en bandejas con muchos registros y combinar criterios de consulta.

**Búsqueda:** identificador (con o sin `#`, por ejemplo `#0042`), título o dirección.

**Filtros:** estado; categoría; visibilidad (todos, públicos o privados); fecha de creación desde/hasta; solo demorados.

**Ordenamiento:** más recientes; más antiguos; mayor impacto ciudadano.

**Paginación:** navegación entre páginas; rango mostrado y total; 20 registros por defecto; máximo 100 por página.

**Comportamiento UI:** los filtros se reflejan en la URL; la URL conserva/permite compartir el estado de búsqueda; al cambiar un filtro se vuelve a la primera página; el buscador aplica debounce de 300 ms; se muestran criterios activos y acción para limpiar; se diferencian los estados vacíos.

### INF-01 — Informes de gestión institucional

**Objetivo:** ofrecer una visión analítica de los reclamos recibidos por la institución durante un período.

**Períodos:** este mes (predeterminado), mes anterior, últimos 30 días y personalizado (desde/hasta). La pantalla informa el rango exacto utilizado.

**Indicadores:** reclamos recibidos; reclamos resueltos; porcentaje de resolución; tiempo promedio de resolución en días; reclamos demorados.

**Visualizaciones:** distribución por estado; distribución por categoría; evolución diaria de reclamos recibidos; hasta cinco reclamos de mayor impacto según cantidad de afectados.

El informe permite observar distribución del trabajo, demanda por categoría y evolución. No reemplaza la bandeja operativa.

### INF-02 — Drill-down y exportación

**Drill-down:** al seleccionar un estado o categoría de los gráficos, se abre la bandeja con el período y el filtro correspondiente; se reutilizan los parámetros de LIS-02; el ranking de mayor impacto permite abrir el detalle del reclamo.

**PDF:** generación en el cliente, formato A4, logo ReportARG, nombre de institución y período, tabla de KPIs, representaciones de distribución por estado/categoría, listado de reclamos de mayor impacto y numeración de páginas.

**Vista previa:** el usuario visualiza las páginas en un modal antes de confirmar la descarga. La exportación corresponde al informe, no a la bandeja.

## 4. Reglas de negocio

### 4.1 Aislamiento por institución

Una institución solo consulta reclamos que le fueron asignados. El identificador se obtiene exclusivamente desde `req.user.id_institucion`, asociado al usuario autenticado; nunca se confía en un `id_institucion` enviado por query, body u otro dato controlado por el cliente. El backend aplica el filtro institucional en bandeja e informes. La consulta también contempla `id_ciudad` obtenido del usuario autenticado, según el contrato implementado. Esto impide cambiar parámetros para consultar datos de otra institución.

### 4.2 Contrato unificado de filtros

| Parámetro | Función |
|---|---|
| `busqueda` | ID, título o dirección |
| `estado` | Estado del reclamo |
| `categoria` | Categoría |
| `visibilidad` | Público/privado |
| `fechaDesde` | Fecha inicial de creación |
| `fechaHasta` | Fecha final de creación |
| `demorado` | Solo reclamos demorados |
| `orderBy` | Ordenamiento |
| `pagina` | Página solicitada |
| `limite` | Cantidad por página |

Los mismos parámetros se utilizan en bandeja y drill-down para evitar lógicas divergentes.

### 4.3 Validación y normalización

- `estado`: estado permitido o `Todos`.
- `categoria`: entero numérico positivo o `Todas`.
- `visibilidad`: `publico`, `privado` o `Todas`.
- `busqueda`: texto normalizado con trim.
- `fechaDesde`/`fechaHasta`: formato `YYYY-MM-DD`; si ambas existen, desde no puede ser posterior a hasta.
- `demorado`: booleano normalizado (`true`/`false`, `1`/`0`).
- `orderBy`: opción permitida.
- `pagina`: default 1.
- `limite`: default 20, máximo 100.

Las validaciones deben impedir que valores inválidos lleguen a la consulta SQL.

### 4.4 Paginación

Contrato de respuesta:

```json
{
  "total": 0,
  "rows": []
}
```

`total` es la cantidad de registros que cumplen los filtros, sin limitarse a la página; `rows` contiene los registros de la página solicitada. Se consulta el total y luego la página correspondiente.

### 4.5 Búsqueda por ID

Si el término es numérico, con o sin `#`, se interpreta como posible ID y se busca por identificador, además de título y dirección. Si no es numérico, se busca texto en título y dirección.

### 4.6 Fechas y zona horaria

Las fechas se interpretan en `America/Argentina/Buenos_Aires` (UTC-3). Para incluir el día completo de `fechaHasta`, la consulta usa límite superior exclusivo: `fecha_creacion >= desde` y `fecha_creacion < día_siguiente_de_hasta`. Así no se excluyen registros creados durante el último día seleccionado.

### 4.7 Reclamo demorado

Se mantiene la regla compartida con la bandeja: un reclamo está demorado cuando está en estado `Pendiente` y supera cinco días sin cambio de estado. Para medirlo se usa `fecha_ultimo_cambio_estado`; si no existe, `fecha_creacion`. No es simplemente cualquier reclamo antiguo: depende del estado y del tiempo desde el último cambio (o creación).

### 4.8 Cohorte de los informes

Todos los indicadores se calculan sobre una misma cohorte: los reclamos asignados a la institución cuya `fecha_creacion` cae dentro del período seleccionado.

- Un reclamo creado antes del período no entra aunque se resuelva durante él.
- Un reclamo creado dentro del período permanece en la cohorte aunque cambie de estado después.
- Los indicadores reflejan el estado actual de los reclamos de esa cohorte, salvo regla temporal específica.

### 4.9 Fórmulas

- **Recibidos:** cantidad total de reclamos de la cohorte.
- **Resueltos:** cantidad cuyo estado actual es `Resuelto`.
- **Porcentaje de resolución:** `(Resueltos / ReclamosNoCancelados) * 100`. El denominador excluye cancelados; si no hay computables, el resultado es `null` y se evita dividir por cero.
- **Tiempo promedio:** promedio de `fecha_resolucion - fecha_creacion`, en días, para reclamos de la cohorte cuyo estado actual continúa siendo `Resuelto` y tienen fecha válida.
- **Demorados:** reclamos de la cohorte que cumplen la regla de cinco días en estado `Pendiente`.
- **Por estado:** conteo de la cohorte agrupado por estado actual.
- **Por categoría:** conteo agrupado por categoría, incluyendo ID y nombre para habilitar drill-down.
- **Evolución diaria:** cantidad agrupada por día de creación.
- **Mayor impacto:** hasta cinco reclamos ordenados por cantidad de afectados.

### 4.10 Períodos

Los períodos usan `America/Argentina/Buenos_Aires`; los cortes diarios respetan el día local argentino; el predeterminado es `Este mes`; los rangos personalizados incluyen el día completo de la fecha final.

### 4.11 Drill-down

Al navegar desde un gráfico a la bandeja se conserva el rango de fechas y se agrega el estado o categoría seleccionado. La bandeja aplica las mismas reglas que al ingresar directamente. La URL representa los filtros activos.

## 5. Implementación técnica registrada

> Resumen basado en el historial de commits y el resumen de código provisto. Verificar nombres y estado actual antes de futuras modificaciones.

### 5.1 Backend — `reportarg-api`

**Bandeja:**
- `reclamoFilterService.js`: validación y normalización.
- `institucionReclamoController.bandeja`: toma institución/ciudad del usuario autenticado y delega.
- `getBandejaInstitucion`: búsqueda, filtros, ordenamiento, conteo y paginación.
- Filtra por `r.id_institucion` y `r.id_ciudad`.
- Búsqueda numérica por ID, título y dirección; búsqueda textual por título y dirección.
- Rango de fechas con límite superior exclusivo.
- Demora calculada en SQL.
- Conteo y `LIMIT`/`OFFSET`; respuesta `{ total, rows }`.

Ordenamientos informados: `recientes`, `antiguos`, `impacto`. El resumen también menciona `atencion` como valor admitido/legacy. Verificar si sigue activo y cuál es su comportamiento antes de describirlo como opción visible.

**Informes:** ruta `GET /api/institucion/informes/gestion-reclamos`, protegida con `verifyToken` y `requireInstitucion`. El controlador obtiene `req.user.id_institucion`; `informeModel.js` consulta la cohorte; `informeService.js` calcula períodos, KPIs y agrupaciones.

Períodos informados: `este_mes`, `mes_anterior`, `ultimos_30_dias`, `personalizado` con `desde` y `hasta`.

### 5.2 Frontend — `report-arg`

**Bandeja:**
- `src/app/institucion/reclamos/page.js`
- `InstitucionReclamoFilterBar.jsx`
- `InstitucionReclamoTable.jsx`

Incluye tabla para desktop/tablet, tarjetas compactas en mobile, sincronización de filtros con query params, debounce de 300 ms, reinicio de página al cambiar filtros, chips activos, limpieza de filtros, estados vacíos diferenciados y paginador.

**Informes:**
- `src/app/institucion/informes/page.js`
- `KpiCard.jsx`
- `StatusDonutChart.jsx`
- `CategoryDistributionChart.jsx`
- `ClaimTrendChart.jsx`
- `generateInformePdf.js`
- `InformePdfPreviewModal.jsx`

Incluye selector de período, rango exacto, cinco KPIs, gráficos, ranking, drill-down y generación PDF A4. El PDF se genera en el cliente con `jsPDF`; la vista previa usa `pdfjs-dist` y canvas.

## 6. Commits y pruebas informados

**Backend:** `8c22e25` (preparación técnica), `ac414a4` (filtros temporales), `993b581` y `5b1cd67` (búsqueda, filtros, ordenamiento, paginación y tests), `f09c13f` (informes).

**Frontend:** `5e9247c` (tabla), `1524858` (búsqueda/filtros/orden/paginación), `33fb75a` (pantalla e indicadores), `b353b2d`, `91b7f09`, `1968591` (gráficos, drill-down y PDF), `c8a05bd`, `ba3beb7`, `d7f6aff`, `cd5fb92`, `f432987` (evolución PDF/vista previa), `206d37f` (estandarización UI).

**Pruebas mencionadas:** backend `informeService.test.js`, `bandejaInstitucional.test.js`, `filtros.test.js`; frontend `tests/institucion-bandeja.test.js`. En una revisión de cierre previa se informó un total de 110 tests y build frontend exitoso. Es un resultado reportado en ese momento; antes de la entrega formal conviene ejecutar nuevamente las pruebas y registrar los resultados actuales por repositorio.

## 7. Decisiones de diseño

1. Separar operación diaria y análisis de gestión.
2. Unificar filtros y paginación entre bandeja y drill-down.
3. Usar una cohorte común definida por fecha de creación.
4. Calcular indicadores según el estado actual de esa cohorte.
5. Mantener la regla de demora existente de cinco días en Pendiente.
6. Respetar zona horaria argentina.
7. Proteger datos por institución en backend, usando el JWT como fuente del identificador.
8. Generar PDF en frontend.
9. Permitir vista previa antes de descargar.
10. Conectar indicadores agregados con los reclamos concretos mediante drill-down.

## 8. Ajustes respecto de la planificación inicial

La planificación organizó el trabajo en cuatro tickets: LIS-01 listado; LIS-02 búsqueda/filtros/paginación; INF-01 período e indicadores; INF-02 gráficos, drill-down y PDF. Durante la definición se precisaron contratos y reglas para que funcionaran de manera coherente:

- Parámetros de filtro y contrato de paginación unificados.
- Cohorte común para indicadores.
- Fórmulas de porcentaje y tiempo promedio explicitadas.
- Tratamiento de fecha final y zona horaria definidos.
- PDF reservado al informe, no al listado.
- Vista previa del PDF.
- Navegación desde gráficos a la bandeja con filtros precargados.

Estos puntos son refinamientos de alcance y reglas de negocio; no deben presentarse como extras si ya estaban incluidos en la definición final de los tickets.

## 9. Resultado del sprint

**Trabajo diario:** tabla de reclamos asignados, búsqueda, filtros combinables, ordenamiento, paginación y acceso a gestión.

**Análisis:** selección de período, KPIs, distribuciones, tendencias, ranking de impacto, drill-down y PDF con vista previa.

El resultado permite a la institución gestionar reclamos individuales y comprender mejor la carga de trabajo y el comportamiento de los reclamos recibidos.

## 10. Verificaciones antes de la entrega

- Cuenta institucional de prueba con suficientes reclamos.
- Búsqueda por ID con y sin `#`.
- Combinación de filtros y actualización de URL.
- Reinicio a página 1 al cambiar filtros.
- Estados vacíos diferenciados.
- Períodos e indicadores coherentes.
- Rango personalizado que incluya el último día completo.
- Regla de demorados consistente entre bandeja e informe.
- Drill-down con filtros esperados.
- Ranking que abra el reclamo correcto.
- Vista previa y PDF descargado legibles.
- Imposibilidad de consultar otra institución manipulando parámetros.
- Verificar si `atencion` es opción vigente o compatibilidad legacy.
- Ejecutar nuevamente tests y build.

## 11. Trabajo en paralelo y continuidad

El cierre del Sprint 5 no significa que ReportARG esté terminado. En paralelo se trabaja en la evolución general y el modelo de ciudades para que la plataforma pueda operar en distintas localidades. Entre los temas están:

- Modelo y estados de ciudades.
- Ciudad de residencia y ciudades de interés de ciudadanos.
- Registro, validación y habilitación de instituciones.
- Operaciones y categorías que puede atender cada institución.
- Institución principal por ciudad.
- Asignación de reclamos a instituciones especializadas y respaldo de la institución principal.
- Administración de usuarios, instituciones, ciudades y solicitudes.
- Pantalla reutilizable para estado de ciudad y solicitudes de activación/reactivación.
- Seguridad, autorización e integridad de datos.

Estas líneas corresponden a la continuidad del proyecto y no deben confundirse con las funcionalidades entregadas en Sprint 5.

## 12. Conclusión

El Sprint 5 fortaleció la capacidad de las instituciones para encontrar y gestionar reclamos y analizar su gestión. La decisión central fue separar la bandeja operativa de los informes, pero conectarlos mediante filtros y navegación. Así, un indicador no queda aislado en un gráfico: permite llegar a los reclamos concretos que lo explican. Los contratos comunes de filtros, paginación, fechas, cohorte, demora y seguridad facilitan el mantenimiento y la evolución del sistema.
