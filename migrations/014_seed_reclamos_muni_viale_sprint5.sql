-- =============================================================================
-- MIGRACIÓN 014: SEED DE RECLAMOS DEMO — SPRINT 5 (LISTADOS E INFORMES)
-- Institución objetivo: Municipalidad de Viale (id_institucion = 10, Principal)
-- Cuenta de acceso: muni.viale@reportarg.com
-- =============================================================================
-- QUÉ HACE ESTE SCRIPT:
-- 1. Asegura que la institución id_institucion = 10 figure como
--    "Municipalidad de Viale" (verificada, principal) y tenga vinculadas sus
--    categorías operativas (Transporte público, Residuos, Obras viales,
--    Espacios públicos).
-- 2. Embellece los 2 reclamos de prueba existentes de la Municipalidad (#33 y #38)
--    que tenían textos de prueba ("jasndakjsdn...", "calle false 123") para que
--    en la tabla de la demo todos los registros se vean reales y prolijos.
-- 3. Crea 6 vecinos adicionales de Viale (con INSERT IGNORE) para poder registrar
--    adhesiones ("A mí también me pasa") escalonadas (entre 1 y 9 afectados).
-- 4. Inserta 24 reclamos NUEVOS para la Municipalidad de Viale (sin repetir
--    ninguno de los 13 existentes en la BD), llegando a 29 reclamos asignados
--    a la Municipalidad:
--      - 14 reclamos en "Este mes" (Noviembre 2026: 01/11 al 04/11)
--      - 10 reclamos nuevos en "Mes anterior" / "Últimos 30 días" (Octubre 2026)
--      - Todos los estados: Pendiente (incluyendo demorados +5d), En revisión,
--        En proceso, Resuelto (con fecha_resolucion y mensaje) y Cancelado.
--      - Visibilidad pública y privada.
-- 5. Inserta adherentes en `reclamos_afectados`, eventos en `reclamos_historial`
--    y novedades en `reclamos_actualizaciones` para que cualquier detalle que
--    abran en vivo tenga trazabilidad completa.
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_SAFE_UPDATES = 0;

-- =============================================================================
-- 1. NORMALIZAR DATOS DE LA MUNICIPALIDAD DE VIALE (id_institucion = 10)
-- =============================================================================
UPDATE instituciones
SET
  nombre = 'Municipalidad de Viale',
  verificada = 1,
  status = 'approved',
  es_principal = 1,
  id_ciudad = 1
WHERE id_institucion = 10;

-- Vincular categorías de gestión municipal directa (4: Transporte, 5: Residuos, 6: Obras viales, 8: Espacios públicos)
INSERT IGNORE INTO institucion_categorias (id_institucion, id_categoria) VALUES
  (10, 4),
  (10, 5),
  (10, 6),
  (10, 8);

-- =============================================================================
-- 2. PROLIJAR LOS RECLAMOS EXISTENTES DE LA MUNICIPALIDAD (#25, #29, #33, #36, #38)
-- =============================================================================
-- Asegurar fecha_ultimo_cambio_estado en #25 y #29 (creados el 30/09, Pendientes -> Demorados)
UPDATE reclamos
SET fecha_ultimo_cambio_estado = fecha_creacion
WHERE id_reclamo IN (25, 29) AND fecha_ultimo_cambio_estado IS NULL;

-- Reemplazar texto de relleno en #33 ("Ejemplo reclamo privado" / "jasndakjsdn...")
UPDATE reclamos
SET
  titulo = 'Denuncia por arrojo clandestino de escombros frente a vivienda',
  descripcion = 'Durante la madrugada descargaron restos de obra y ramas frente al ingreso de mi garaje. Solicito reserva de identidad por tratarse de un conflicto con frentistas linderos.',
  direccion = 'Av. 9 de Julio 642, Viale'
WHERE id_reclamo = 33 AND id_institucion = 10;

-- Completar motivo de cancelación en #36 si estuviera vacío
UPDATE reclamos
SET
  motivo_cancelacion = COALESCE(motivo_cancelacion, 'La rama ya había sido retirada preventivamente por Defensa Civil tras la tormenta.'),
  cancelado_por_tipo = COALESCE(cancelado_por_tipo, 'institucion')
WHERE id_reclamo = 36 AND id_institucion = 10;

-- Mejorar dirección de prueba en #38 ("calle false 123") y asegurar mensaje de resolución
UPDATE reclamos
SET
  titulo = 'Contenedor de residuos domiciliarios desbordado',
  descripcion = 'El contenedor plástico verde de la cuadra lleva dos días al tope de su capacidad y hay bolsas rotas sobre el cordón.',
  direccion = 'Urquiza 380, Viale',
  mensaje_resolucion = COALESCE(mensaje_resolucion, 'El camión compactador del turno mañana realizó el vaciado completo y limpieza del sector.')
WHERE id_reclamo = 38 AND id_institucion = 10;

-- =============================================================================
-- 3. VECINOS ADICIONALES DE VIALE (PARA RANKING DE IMPACTO / AFECTADOS)
-- =============================================================================
INSERT IGNORE INTO usuarios (email, password, tipo_usuario, activo, email_verified, id_ciudad) VALUES
  ('marcos.schmidt@reportarg.com', '$2b$10$FMpCbKh37kGBDwl.W3rL7Of.IHTGizwSCLyFIXA8OmwQ7FgP91tJC', 'ciudadano', 1, 1, 1),
  ('carla.heidt@reportarg.com',    '$2b$10$FMpCbKh37kGBDwl.W3rL7Of.IHTGizwSCLyFIXA8OmwQ7FgP91tJC', 'ciudadano', 1, 1, 1),
  ('diego.taborda@reportarg.com',  '$2b$10$FMpCbKh37kGBDwl.W3rL7Of.IHTGizwSCLyFIXA8OmwQ7FgP91tJC', 'ciudadano', 1, 1, 1),
  ('sofia.sosa@reportarg.com',     '$2b$10$FMpCbKh37kGBDwl.W3rL7Of.IHTGizwSCLyFIXA8OmwQ7FgP91tJC', 'ciudadano', 1, 1, 1),
  ('martin.lescano@reportarg.com', '$2b$10$FMpCbKh37kGBDwl.W3rL7Of.IHTGizwSCLyFIXA8OmwQ7FgP91tJC', 'ciudadano', 1, 1, 1),
  ('lucia.grinhauz@reportarg.com', '$2b$10$FMpCbKh37kGBDwl.W3rL7Of.IHTGizwSCLyFIXA8OmwQ7FgP91tJC', 'ciudadano', 1, 1, 1);

SET @u_juli   = 32;
SET @u_valen  = 55;
SET @u_ludmi  = 56;
SET @u_juan   = 57;
SET @u_marcos = (SELECT id_usuario FROM usuarios WHERE email = 'marcos.schmidt@reportarg.com' LIMIT 1);
SET @u_carla  = (SELECT id_usuario FROM usuarios WHERE email = 'carla.heidt@reportarg.com' LIMIT 1);
SET @u_diego  = (SELECT id_usuario FROM usuarios WHERE email = 'diego.taborda@reportarg.com' LIMIT 1);
SET @u_sofia  = (SELECT id_usuario FROM usuarios WHERE email = 'sofia.sosa@reportarg.com' LIMIT 1);
SET @u_martin = (SELECT id_usuario FROM usuarios WHERE email = 'martin.lescano@reportarg.com' LIMIT 1);
SET @u_lucia  = (SELECT id_usuario FROM usuarios WHERE email = 'lucia.grinhauz@reportarg.com' LIMIT 1);
SET @u_muni   = 37; -- Usuario institucional de Municipalidad de Viale

INSERT IGNORE INTO ciudadanos (id_usuario, nombre, apellido, provincia, ciudad, zona)
SELECT @u_marcos, 'Marcos', 'Schmidt', 'Entre Ríos', 'Viale', 'Centro'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM ciudadanos WHERE id_usuario = @u_marcos);

INSERT IGNORE INTO ciudadanos (id_usuario, nombre, apellido, provincia, ciudad, zona)
SELECT @u_carla, 'Carla', 'Heidt', 'Entre Ríos', 'Viale', 'Barrio Centenario'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM ciudadanos WHERE id_usuario = @u_carla);

INSERT IGNORE INTO ciudadanos (id_usuario, nombre, apellido, provincia, ciudad, zona)
SELECT @u_diego, 'Diego', 'Taborda', 'Entre Ríos', 'Viale', 'Sur'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM ciudadanos WHERE id_usuario = @u_diego);

INSERT IGNORE INTO ciudadanos (id_usuario, nombre, apellido, provincia, ciudad, zona)
SELECT @u_sofia, 'Sofía', 'Sosa', 'Entre Ríos', 'Viale', 'Norte'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM ciudadanos WHERE id_usuario = @u_sofia);

INSERT IGNORE INTO ciudadanos (id_usuario, nombre, apellido, provincia, ciudad, zona)
SELECT @u_martin, 'Martín', 'Lescano', 'Entre Ríos', 'Viale', 'Centro'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM ciudadanos WHERE id_usuario = @u_martin);

INSERT IGNORE INTO ciudadanos (id_usuario, nombre, apellido, provincia, ciudad, zona)
SELECT @u_lucia, 'Lucía', 'Grinhauz', 'Entre Ríos', 'Viale', 'Estación'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM ciudadanos WHERE id_usuario = @u_lucia);

-- Limpiar ejecuciones previas de este mismo seed (por si se vuelve a ejecutar)
DELETE FROM reclamos
WHERE id_institucion = 10
  AND titulo IN (
    -- Lote Octubre 2026 ("Mes anterior" y "Últimos 30 días")
    'Hundimiento de calzada en bocacalle de tránsito pesado',
    'Falta de recolección de restos de poda en Barrio Centenario',
    'Juegos infantiles con cadenas rotas en plazoleta barrial',
    'Garita de colectivo con techo de chapa desprendido',
    'Acumulación de neumáticos y chatarra en terreno lindero',
    'Cordón cuneta obstruido por sedimento tras las lluvias',
    'Solicitud de desmalezado urgente en pasaje peatonal',
    'Bancos de hormigón quebrados en el paseo del ferrocarril',
    'Reclamo duplicado por bacheo en acceso norte',
    'Vereda hundida frente a consultorios externos',
    -- Lote Noviembre 2026 ("Este mes")
    'Calzada anegada y barro acumulado en calle de ripio',
    'Contenedores desbordados luego del fin de semana en zona céntrica',
    'Peligro por losa levantada en senda peatonal de la plaza',
    'Demora y falta de señalización en parada de transporte escolar',
    'Bache de gran tamaño en intersección semaforizada',
    'Aguas servidas estancadas en cuneta frente a domicilio particular',
    'Bebederos sin funcionamiento en el polideportivo municipal',
    'Falta de barrido mecánico y hojas acumuladas en sumidero',
    'Desprendimiento de asfalto en lomo de burro reductor de velocidad',
    'Cesto comunitario vandalizado y basura dispersa en la vereda',
    'Falta de rampa de accesibilidad en esquina de alto tránsito',
    'Ramas bajas obstaculizando la visión de cartel nomenclador',
    'Obstrucción de desagüe pluvial con restos de obra privada',
    'Solicitud de retiro de vehículo abandonado en vía pública'
  );

-- =============================================================================
-- 4. INSERTAR 10 RECLAMOS EN OCTUBRE 2026 ("Mes anterior" y "Últimos 30 días")
-- =============================================================================

-- [OCT-01] Obras viales (6) | Resuelto | Público | Creado 06/10, Resuelto 09/10 (3.0 días)
INSERT INTO reclamos (
  id_usuario, id_categoria, titulo, descripcion, direccion, latitud, longitud,
  estado, visibilidad, editado, id_ciudad, id_institucion,
  mensaje_resolucion, fecha_creacion, fecha_resolucion, fecha_ultimo_cambio_estado
) VALUES (
  @u_juli, 6,
  'Hundimiento de calzada en bocacalle de tránsito pesado',
  'El paso constante de camiones cerealeros hundió el pavimento en el cruce, generando golpes fuertes y riesgo para motociclistas.',
  'Av. San Martín y Paraná, Viale', -31.86720000, -59.99180000,
  'Resuelto', 'publico', 0, 1, 10,
  'La cuadrilla de Obras Públicas realizó el aserrado, compactación de base calcárea y bacheo con mezcla asfáltica en caliente.',
  '2026-10-06 11:20:00', '2026-10-09 11:20:00', '2026-10-09 11:20:00'
);
SET @r_oct_01 = LAST_INSERT_ID();

-- [OCT-02] Residuos (5) | Resuelto | Público | Creado 10/10, Resuelto 12/10 (2.0 días)
INSERT INTO reclamos (
  id_usuario, id_categoria, titulo, descripcion, direccion, latitud, longitud,
  estado, visibilidad, editado, id_ciudad, id_institucion,
  mensaje_resolucion, fecha_creacion, fecha_resolucion, fecha_ultimo_cambio_estado
) VALUES (
  @u_valen, 5,
  'Falta de recolección de restos de poda en Barrio Centenario',
  'Hace varios días que quedaron montículos de ramas sobre la vereda luego de la poda autorizada y obstruyen el paso.',
  'Belgrano 620, Viale', -31.86890000, -59.98850000,
  'Resuelto', 'publico', 0, 1, 10,
  'Se completó el retiro con camión volcador y pala cargadora municipal según el cronograma de recolección diferenciada.',
  '2026-10-10 13:00:00', '2026-10-12 13:00:00', '2026-10-12 13:00:00'
);
SET @r_oct_02 = LAST_INSERT_ID();

-- [OCT-03] Espacios públicos (8) | Resuelto | Público | Creado 14/10, Resuelto 18/10 (4.0 días)
INSERT INTO reclamos (
  id_usuario, id_categoria, titulo, descripcion, direccion, latitud, longitud,
  estado, visibilidad, editado, id_ciudad, id_institucion,
  mensaje_resolucion, fecha_creacion, fecha_resolucion, fecha_ultimo_cambio_estado
) VALUES (
  @u_ludmi, 8,
  'Juegos infantiles con cadenas rotas en plazoleta barrial',
  'Dos hamacas tienen los eslabones cortados y el tobogán presenta bordes oxidados que resultan peligrosos para los chicos.',
  'Plazoleta de Los Inmigrantes, Viale', -31.86540000, -59.99320000,
  'Resuelto', 'publico', 0, 1, 10,
  'Personal de herrería municipal reemplazó los juegos de cadenas, bulonería de seguridad y aplicó pintura antioxidante.',
  '2026-10-14 14:30:00', '2026-10-18 14:30:00', '2026-10-18 14:30:00'
);
SET @r_oct_03 = LAST_INSERT_ID();

-- [OCT-04] Transporte público (4) | En proceso | Público | Creado 17/10
INSERT INTO reclamos (
  id_usuario, id_categoria, titulo, descripcion, direccion, latitud, longitud,
  estado, visibilidad, editado, id_ciudad, id_institucion,
  fecha_creacion, fecha_resolucion, fecha_ultimo_cambio_estado
) VALUES (
  @u_juan, 4,
  'Garita de colectivo con techo de chapa desprendido',
  'Las ráfagas de viento levantaron media chapa del refugio de pasajeros y queda suelta haciendo ruido y con filo expuesto.',
  'Ruta Provincial 32 y Acceso Sur, Viale', -31.87210000, -59.99600000,
  'En proceso', 'publico', 0, 1, 10,
  '2026-10-17 12:15:00', NULL, '2026-10-20 10:00:00'
);
SET @r_oct_04 = LAST_INSERT_ID();

-- [OCT-05] Residuos (5) | Privado | En revisión | Creado 19/10
INSERT INTO reclamos (
  id_usuario, id_categoria, titulo, descripcion, direccion, latitud, longitud,
  estado, visibilidad, editado, id_ciudad, id_institucion,
  fecha_creacion, fecha_resolucion, fecha_ultimo_cambio_estado
) VALUES (
  @u_marcos, 5,
  'Acumulación de neumáticos y chatarra en terreno lindero',
  'En el patio lindero a mi domicilio acumulan cubiertas viejas con agua estancada, generando proliferación de mosquitos y roedores.',
  '3 de Febrero 245, Viale', -31.86610000, -59.98710000,
  'En revisión', 'privado', 0, 1, 10,
  '2026-10-19 15:40:00', NULL, '2026-10-21 11:30:00'
);
SET @r_oct_05 = LAST_INSERT_ID();

-- [OCT-06] Obras viales (6) | Pendiente (DEMORADO +14 días) | Público | Creado 21/10
INSERT INTO reclamos (
  id_usuario, id_categoria, titulo, descripcion, direccion, latitud, longitud,
  estado, visibilidad, editado, id_ciudad, id_institucion,
  fecha_creacion, fecha_resolucion, fecha_ultimo_cambio_estado
) VALUES (
  @u_carla, 6,
  'Cordón cuneta obstruido por sedimento tras las lluvias',
  'El barro arrastrado desde la calle sin asfaltar tapó por completo el escurrimiento del cordón cuneta en toda la cuadra.',
  'Sarmiento 710, Viale', -31.86980000, -59.99040000,
  'Pendiente', 'publico', 0, 1, 10,
  '2026-10-21 11:10:00', NULL, '2026-10-21 11:10:00'
);
SET @r_oct_06 = LAST_INSERT_ID();

-- [OCT-07] Espacios públicos (8) | Pendiente (DEMORADO +10 días) | Público | Creado 25/10
INSERT INTO reclamos (
  id_usuario, id_categoria, titulo, descripcion, direccion, latitud, longitud,
  estado, visibilidad, editado, id_ciudad, id_institucion,
  fecha_creacion, fecha_resolucion, fecha_ultimo_cambio_estado
) VALUES (
  @u_diego, 8,
  'Solicitud de desmalezado urgente en pasaje peatonal',
  'Los pastizales superan el metro de altura a los costados de la senda peatonal, dificultando la visibilidad y el cruce seguro.',
  'Pasaje Libertad entre Urquiza y Mitre, Viale', -31.86480000, -59.98920000,
  'Pendiente', 'publico', 1, 1, 10,
  '2026-10-25 16:00:00', NULL, '2026-10-25 16:00:00'
);
SET @r_oct_07 = LAST_INSERT_ID();

-- [OCT-08] Espacios públicos (8) | Resuelto | Público | Creado 26/10, Resuelto 28/10 (2.0 días)
INSERT INTO reclamos (
  id_usuario, id_categoria, titulo, descripcion, direccion, latitud, longitud,
  estado, visibilidad, editado, id_ciudad, id_institucion,
  mensaje_resolucion, fecha_creacion, fecha_resolucion, fecha_ultimo_cambio_estado
) VALUES (
  @u_sofia, 8,
  'Bancos de hormigón quebrados en el paseo del ferrocarril',
  'Tres bancos del sector aeróbico tienen los listones partidos y hierros a la vista.',
  'Paseo Ferroviario y Av. 9 de Julio, Viale', -31.86750000, -59.99010000,
  'Resuelto', 'publico', 0, 1, 10,
  'Se colocaron nuevas placas premoldeadas de hormigón armado y se acondicionó el entorno.',
  '2026-10-26 12:00:00', '2026-10-28 12:00:00', '2026-10-28 12:00:00'
);
SET @r_oct_08 = LAST_INSERT_ID();

-- [OCT-09] Obras viales (6) | Cancelado | Público | Creado 27/10
INSERT INTO reclamos (
  id_usuario, id_categoria, titulo, descripcion, direccion, latitud, longitud,
  estado, visibilidad, editado, id_ciudad, id_institucion,
  motivo_cancelacion, cancelado_por_tipo,
  fecha_creacion, fecha_resolucion, fecha_ultimo_cambio_estado
) VALUES (
  @u_martin, 6,
  'Reclamo duplicado por bacheo en acceso norte',
  'Se reporta rotura de asfalto en la mano de ingreso a la ciudad cerca de la rotonda.',
  'Acceso Norte KM 2, Viale', -31.85990000, -59.99450000,
  'Cancelado', 'publico', 0, 1, 10,
  'Se unifica con el expediente principal de repavimentación de Acceso Norte que ya se encuentra en ejecución.', 'institucion',
  '2026-10-27 14:20:00', NULL, '2026-10-28 10:15:00'
);
SET @r_oct_09 = LAST_INSERT_ID();

-- [OCT-10] Obras viales (6) | Pendiente (DEMORADO +6 días) | Público | Creado 29/10
INSERT INTO reclamos (
  id_usuario, id_categoria, titulo, descripcion, direccion, latitud, longitud,
  estado, visibilidad, editado, id_ciudad, id_institucion,
  fecha_creacion, fecha_resolucion, fecha_ultimo_cambio_estado
) VALUES (
  @u_lucia, 6,
  'Vereda hundida frente a consultorios externos',
  'Las baldosas cedieron por una socavación inferior y las personas mayores o con movilidad reducida tropiezan al pasar.',
  'Rivadavia 315, Viale', -31.86690000, -59.99120000,
  'Pendiente', 'publico', 0, 1, 10,
  '2026-10-29 10:45:00', NULL, '2026-10-29 10:45:00'
);
SET @r_oct_10 = LAST_INSERT_ID();


-- =============================================================================
-- 5. INSERTAR 14 RECLAMOS EN NOVIEMBRE 2026 ("Este mes": 01/11 al 04/11)
--    Diseñados para que al abrir /institucion/informes (por defecto "Este mes")
--    todos los KPIs, gráficos de dona, barras por categoría, curva diaria y
--    ranking de impacto luzcan completos.
-- =============================================================================

-- --- DÍA 01/11/2026 (3 reclamos) ---

-- [NOV-01] Obras viales (6) | Resuelto | Público | Creado 01/11, Resuelto 03/11 (2.0 días)
INSERT INTO reclamos (
  id_usuario, id_categoria, titulo, descripcion, direccion, latitud, longitud,
  estado, visibilidad, editado, id_ciudad, id_institucion,
  mensaje_resolucion, fecha_creacion, fecha_resolucion, fecha_ultimo_cambio_estado
) VALUES (
  @u_valen, 6,
  'Bache de gran tamaño en intersección semaforizada',
  'En pleno cruce del semáforo céntrico se abrió un bache profundo que obliga a los vehículos a frenar de golpe o invadir el carril contrario.',
  'Av. San Martín y 9 de Julio, Viale', -31.86740000, -59.99080000,
  'Resuelto', 'publico', 0, 1, 10,
  'Se ejecutó bacheo con hormigón de fraguado rápido y señalización preventiva hasta habilitar el tránsito.',
  '2026-11-01 11:00:00', '2026-11-03 11:00:00', '2026-11-03 11:00:00'
);
SET @r_nov_01 = LAST_INSERT_ID();

-- [NOV-02] Residuos (5) | Resuelto | Público | Creado 01/11, Resuelto 02/11 (1.0 día)
INSERT INTO reclamos (
  id_usuario, id_categoria, titulo, descripcion, direccion, latitud, longitud,
  estado, visibilidad, editado, id_ciudad, id_institucion,
  mensaje_resolucion, fecha_creacion, fecha_resolucion, fecha_ultimo_cambio_estado
) VALUES (
  @u_ludmi, 5,
  'Contenedores desbordados luego del fin de semana en zona céntrica',
  'Los tres contenedores de la cuadra comercial quedaron colapsados y hay bolsas acumuladas en la acera.',
  '25 de Mayo 540, Viale', -31.86780000, -59.98990000,
  'Resuelto', 'publico', 0, 1, 10,
  'Se reforzó el recorrido matutino del camión recolector y se desinfectaron los contenedores.',
  '2026-11-01 14:30:00', '2026-11-02 14:30:00', '2026-11-02 14:30:00'
);
SET @r_nov_02 = LAST_INSERT_ID();

-- [NOV-03] Obras viales (6) | Pendiente (DEMORADO en "Este mes") | Público | Creado 01/11
-- Nota: fecha_ultimo_cambio_estado en 2026-10-28 para que el cálculo de 5+ días lo marque como Demorado también dentro de "Este mes"
INSERT INTO reclamos (
  id_usuario, id_categoria, titulo, descripcion, direccion, latitud, longitud,
  estado, visibilidad, editado, id_ciudad, id_institucion,
  fecha_creacion, fecha_resolucion, fecha_ultimo_cambio_estado
) VALUES (
  @u_juli, 6,
  'Calzada anegada y barro acumulado en calle de ripio',
  'Falta reposición de broza y perfilado con motoniveladora; cada vez que llueve se vuelve intransitable para los vecinos de la cuadra.',
  'Entre Ríos 890, Viale', -31.87050000, -59.99250000,
  'Pendiente', 'publico', 0, 1, 10,
  '2026-11-01 16:15:00', NULL, '2026-10-28 12:00:00'
);
SET @r_nov_03 = LAST_INSERT_ID();

-- --- DÍA 02/11/2026 (4 reclamos) ---

-- [NOV-04] Espacios públicos (8) | Resuelto | Público | Creado 02/11, Resuelto 04/11 (2.0 días)
INSERT INTO reclamos (
  id_usuario, id_categoria, titulo, descripcion, direccion, latitud, longitud,
  estado, visibilidad, editado, id_ciudad, id_institucion,
  mensaje_resolucion, fecha_creacion, fecha_resolucion, fecha_ultimo_cambio_estado
) VALUES (
  @u_juan, 8,
  'Peligro por losa levantada en senda peatonal de la plaza',
  'Las raíces de un árbol levantaron las veredas perimetrales de la plaza principal provocando tropiezos frecuentes.',
  'Plaza San Martín (sector calle Urquiza), Viale', -31.86710000, -59.99050000,
  'Resuelto', 'publico', 0, 1, 10,
  'Se niveló el contrapiso y se recolocaron las losetas graníticas correspondientes.',
  '2026-11-02 10:00:00', '2026-11-04 10:00:00', '2026-11-04 10:00:00'
);
SET @r_nov_04 = LAST_INSERT_ID();

-- [NOV-05] Transporte público (4) | En proceso | Público | Creado 02/11
INSERT INTO reclamos (
  id_usuario, id_categoria, titulo, descripcion, direccion, latitud, longitud,
  estado, visibilidad, editado, id_ciudad, id_institucion,
  fecha_creacion, fecha_resolucion, fecha_ultimo_cambio_estado
) VALUES (
  @u_marcos, 4,
  'Demora y falta de señalización en parada de transporte escolar',
  'El cartel indicador de parada de transporte fue derribado y los vehículos particulares estacionan impidiendo el ascenso de alumnos.',
  'Av. San Martín 1120, Viale', -31.86820000, -59.99150000,
  'En proceso', 'publico', 0, 1, 10,
  '2026-11-02 12:30:00', NULL, '2026-11-03 09:30:00'
);
SET @r_nov_05 = LAST_INSERT_ID();

-- [NOV-06] Residuos (5) | Privado | Pendiente (DEMORADO en "Este mes") | Creado 02/11
INSERT INTO reclamos (
  id_usuario, id_categoria, titulo, descripcion, direccion, latitud, longitud,
  estado, visibilidad, editado, id_ciudad, id_institucion,
  fecha_creacion, fecha_resolucion, fecha_ultimo_cambio_estado
) VALUES (
  @u_carla, 5,
  'Aguas servidas estancadas en cuneta frente a domicilio particular',
  'Se arrojan líquidos jabonosos a la vía pública de forma reiterada y el agua queda estancada con mal olor frente a mi ventana.',
  'Mitre 412, Viale', -31.86650000, -59.98880000,
  'Pendiente', 'privado', 0, 1, 10,
  '2026-11-02 15:00:00', NULL, '2026-10-29 10:00:00'
);
SET @r_nov_06 = LAST_INSERT_ID();

-- [NOV-07] Espacios públicos (8) | En revisión | Público | Creado 02/11
INSERT INTO reclamos (
  id_usuario, id_categoria, titulo, descripcion, direccion, latitud, longitud,
  estado, visibilidad, editado, id_ciudad, id_institucion,
  fecha_creacion, fecha_resolucion, fecha_ultimo_cambio_estado
) VALUES (
  @u_diego, 8,
  'Bebederos sin funcionamiento en el polideportivo municipal',
  'Los grifos pulsadores del playón deportivo están trabados y pierden agua por la base.',
  'Polideportivo Municipal, Viale', -31.87120000, -59.99400000,
  'En revisión', 'publico', 0, 1, 10,
  '2026-11-02 18:10:00', NULL, '2026-11-03 11:00:00'
);
SET @r_nov_07 = LAST_INSERT_ID();

-- --- DÍA 03/11/2026 (3 reclamos) ---

-- [NOV-08] Residuos (5) | Resuelto | Público | Creado 03/11, Resuelto 04/11 (1.0 día)
INSERT INTO reclamos (
  id_usuario, id_categoria, titulo, descripcion, direccion, latitud, longitud,
  estado, visibilidad, editado, id_ciudad, id_institucion,
  mensaje_resolucion, fecha_creacion, fecha_resolucion, fecha_ultimo_cambio_estado
) VALUES (
  @u_sofia, 5,
  'Falta de barrido mecánico y hojas acumuladas en sumidero',
  'La boca de tormenta de la esquina está tapada de hojas secas y tierra, impidiendo que drene el agua hacia el conducto pluvial.',
  '25 de Mayo y Belgrano, Viale', -31.86800000, -59.98910000,
  'Resuelto', 'publico', 0, 1, 10,
  'El equipo de Higiene Urbana realizó la desobstrucción manual de la rejilla y el barrido completo de la cuadra.',
  '2026-11-03 09:00:00', '2026-11-04 09:00:00', '2026-11-04 09:00:00'
);
SET @r_nov_08 = LAST_INSERT_ID();

-- [NOV-09] Obras viales (6) | En proceso | Público | Creado 03/11
INSERT INTO reclamos (
  id_usuario, id_categoria, titulo, descripcion, direccion, latitud, longitud,
  estado, visibilidad, editado, id_ciudad, id_institucion,
  fecha_creacion, fecha_resolucion, fecha_ultimo_cambio_estado
) VALUES (
  @u_martin, 6,
  'Desprendimiento de asfalto en lomo de burro reductor de velocidad',
  'El reductor de velocidad frente a la escuela tiene un sector roto con hierros expuestos que daña las cubiertas.',
  'Urquiza 650, Viale', -31.86670000, -59.99190000,
  'En proceso', 'publico', 0, 1, 10,
  '2026-11-03 13:20:00', NULL, '2026-11-04 08:30:00'
);
SET @r_nov_09 = LAST_INSERT_ID();

-- [NOV-10] Espacios públicos (8) | Cancelado | Público | Creado 03/11
INSERT INTO reclamos (
  id_usuario, id_categoria, titulo, descripcion, direccion, latitud, longitud,
  estado, visibilidad, editado, id_ciudad, id_institucion,
  motivo_cancelacion, cancelado_por_tipo,
  fecha_creacion, fecha_resolucion, fecha_ultimo_cambio_estado
) VALUES (
  @u_lucia, 8,
  'Ramas bajas obstaculizando la visión de cartel nomenclador',
  'El follaje de un fresno tapa por completo el cartel con el nombre de la calle y el sentido de circulación.',
  'Moreno y San Nicolás, Viale', -31.86910000, -59.98790000,
  'Cancelado', 'publico', 0, 1, 10,
  'El reclamo ya fue intervenido dentro del operativo integral de despeje de señalética realizado ayer en esa misma arteria.', 'institucion',
  '2026-11-03 17:00:00', NULL, '2026-11-04 09:15:00'
);
SET @r_nov_10 = LAST_INSERT_ID();

-- --- DÍA 04/11/2026 (4 reclamos) ---

-- [NOV-11] Residuos (5) | En revisión | Público | Creado 04/11
INSERT INTO reclamos (
  id_usuario, id_categoria, titulo, descripcion, direccion, latitud, longitud,
  estado, visibilidad, editado, id_ciudad, id_institucion,
  fecha_creacion, fecha_resolucion, fecha_ultimo_cambio_estado
) VALUES (
  @u_valen, 5,
  'Cesto comunitario vandalizado y basura dispersa en la vereda',
  'Arrancaron el canasto metálico de su soporte y las bolsas quedaron desparramadas sobre la vereda peatonal.',
  'Av. 9 de Julio 410, Viale', -31.86760000, -59.99030000,
  'En revisión', 'publico', 0, 1, 10,
  '2026-11-04 10:15:00', NULL, '2026-11-04 11:30:00'
);
SET @r_nov_11 = LAST_INSERT_ID();

-- [NOV-12] Obras viales (6) | Pendiente | Público | Creado 04/11
INSERT INTO reclamos (
  id_usuario, id_categoria, titulo, descripcion, direccion, latitud, longitud,
  estado, visibilidad, editado, id_ciudad, id_institucion,
  fecha_creacion, fecha_resolucion, fecha_ultimo_cambio_estado
) VALUES (
  @u_ludmi, 6,
  'Falta de rampa de accesibilidad en esquina de alto tránsito',
  'En la ochava frente a la farmacia de turno el cordón es muy alto y no cuenta con rampa reglamentaria para sillas de ruedas ni cochecitos.',
  'Av. San Martín y Rivadavia, Viale', -31.86700000, -59.99100000,
  'Pendiente', 'publico', 0, 1, 10,
  '2026-11-04 11:40:00', NULL, '2026-11-04 11:40:00'
);
SET @r_nov_12 = LAST_INSERT_ID();

-- [NOV-13] Obras viales (6) | Privado | En revisión | Creado 04/11
INSERT INTO reclamos (
  id_usuario, id_categoria, titulo, descripcion, direccion, latitud, longitud,
  estado, visibilidad, editado, id_ciudad, id_institucion,
  fecha_creacion, fecha_resolucion, fecha_ultimo_cambio_estado
) VALUES (
  @u_juan, 6,
  'Obstrucción de desagüe pluvial con restos de obra privada',
  'Volcaron mezcla de cemento y áridos dentro de la cuneta frente a mi propiedad, bloqueando el paso del agua de lluvia.',
  'San Nicolás 530, Viale', -31.86850000, -59.98820000,
  'En revisión', 'privado', 0, 1, 10,
  '2026-11-04 12:50:00', NULL, '2026-11-04 14:10:00'
);
SET @r_nov_13 = LAST_INSERT_ID();

-- [NOV-14] Transporte público (4) | Pendiente | Público | Creado 04/11
INSERT INTO reclamos (
  id_usuario, id_categoria, titulo, descripcion, direccion, latitud, longitud,
  estado, visibilidad, editado, id_ciudad, id_institucion,
  fecha_creacion, fecha_resolucion, fecha_ultimo_cambio_estado
) VALUES (
  @u_juli, 4,
  'Solicitud de retiro de vehículo abandonado en vía pública',
  'Un automóvil sin ruedas ni patentes lleva meses estacionado sobre la calzada reduciendo el ancho de giro de los colectivos.',
  'Paraná 280, Viale', -31.86630000, -59.99210000,
  'Pendiente', 'publico', 0, 1, 10,
  '2026-11-04 14:25:00', NULL, '2026-11-04 14:25:00'
);
SET @r_nov_14 = LAST_INSERT_ID();


-- =============================================================================
-- 6. ADHESIONES VECINALES ("A mí también me pasa" - tabla `reclamos_afectados`)
--    Permite mostrar diferencias claras al ordenar por "Mayor impacto ciudadano"
--    y en el Top 5 del Informe de Gestión.
-- =============================================================================

-- Top 1 en Noviembre (9 afectados): @r_nov_01 ("Bache de gran tamaño en intersección semaforizada")
INSERT IGNORE INTO reclamos_afectados (id_reclamo, id_usuario) VALUES
  (@r_nov_01, @u_juli), (@r_nov_01, @u_ludmi), (@r_nov_01, @u_juan),
  (@r_nov_01, @u_marcos), (@r_nov_01, @u_carla), (@r_nov_01, @u_diego),
  (@r_nov_01, @u_sofia), (@r_nov_01, @u_martin), (@r_nov_01, @u_lucia);

-- Top 2 en Noviembre (7 afectados): @r_nov_03 ("Calzada anegada y barro acumulado en calle de ripio")
INSERT IGNORE INTO reclamos_afectados (id_reclamo, id_usuario) VALUES
  (@r_nov_03, @u_valen), (@r_nov_03, @u_ludmi), (@r_nov_03, @u_juan),
  (@r_nov_03, @u_marcos), (@r_nov_03, @u_carla), (@r_nov_03, @u_diego),
  (@r_nov_03, @u_sofia);

-- Top 3 en Noviembre (6 afectados): @r_nov_02 ("Contenedores desbordados luego del fin de semana en zona céntrica")
INSERT IGNORE INTO reclamos_afectados (id_reclamo, id_usuario) VALUES
  (@r_nov_02, @u_juli), (@r_nov_02, @u_valen), (@r_nov_02, @u_juan),
  (@r_nov_02, @u_marcos), (@r_nov_02, @u_carla), (@r_nov_02, @u_martin);

-- Top 4 en Noviembre (5 afectados): @r_nov_09 ("Desprendimiento de asfalto en lomo de burro...")
INSERT IGNORE INTO reclamos_afectados (id_reclamo, id_usuario) VALUES
  (@r_nov_09, @u_juli), (@r_nov_09, @u_valen), (@r_nov_09, @u_ludmi),
  (@r_nov_09, @u_diego), (@r_nov_09, @u_lucia);

-- Top 5 en Noviembre (4 afectados): @r_nov_12 ("Falta de rampa de accesibilidad en esquina de alto tránsito")
INSERT IGNORE INTO reclamos_afectados (id_reclamo, id_usuario) VALUES
  (@r_nov_12, @u_juli), (@r_nov_12, @u_juan), (@r_nov_12, @u_sofia), (@r_nov_12, @u_lucia);

-- Otros reclamos de Noviembre con 1 a 3 afectados
INSERT IGNORE INTO reclamos_afectados (id_reclamo, id_usuario) VALUES
  (@r_nov_04, @u_juli), (@r_nov_04, @u_marcos), (@r_nov_04, @u_sofia),
  (@r_nov_05, @u_valen), (@r_nov_05, @u_carla),
  (@r_nov_07, @u_juan), (@r_nov_07, @u_martin),
  (@r_nov_08, @u_marcos),
  (@r_nov_11, @u_diego), (@r_nov_11, @u_lucia),
  (@r_nov_14, @u_valen);

-- Afectados en Octubre ("Mes anterior" / "Últimos 30 días")
INSERT IGNORE INTO reclamos_afectados (id_reclamo, id_usuario) VALUES
  -- @r_oct_01 (8 afectados)
  (@r_oct_01, @u_valen), (@r_oct_01, @u_ludmi), (@r_oct_01, @u_juan),
  (@r_oct_01, @u_marcos), (@r_oct_01, @u_carla), (@r_oct_01, @u_diego),
  (@r_oct_01, @u_sofia), (@r_oct_01, @u_martin),
  -- @r_oct_06 (6 afectados)
  (@r_oct_06, @u_juli), (@r_oct_06, @u_valen), (@r_oct_06, @u_ludmi),
  (@r_oct_06, @u_juan), (@r_oct_06, @u_marcos), (@r_oct_06, @u_lucia),
  -- @r_oct_03 (5 afectados)
  (@r_oct_03, @u_juli), (@r_oct_03, @u_valen), (@r_oct_03, @u_carla),
  (@r_oct_03, @u_sofia), (@r_oct_03, @u_martin),
  -- @r_oct_04 (4 afectados)
  (@r_oct_04, @u_juli), (@r_oct_04, @u_diego), (@r_oct_04, @u_martin), (@r_oct_04, @u_lucia),
  -- @r_oct_02 (3 afectados)
  (@r_oct_02, @u_juli), (@r_oct_02, @u_juan), (@r_oct_02, @u_marcos),
  -- @r_oct_07 y @r_oct_10 (2 afectados c/u)
  (@r_oct_07, @u_valen), (@r_oct_07, @u_sofia),
  (@r_oct_10, @u_juli), (@r_oct_10, @u_carla);


-- =============================================================================
-- 7. HISTORIAL DE AUDITORÍA (`reclamos_historial`) Y BITÁCORA (`reclamos_actualizaciones`)
--    Para que al abrir el detalle de los reclamos principales se vea el timeline
--    completo y los mensajes de seguimiento institucional.
-- =============================================================================

-- Historial y actualizaciones para @r_nov_01 (Resuelto - 9 afectados)
INSERT INTO reclamos_historial (id_reclamo, id_usuario, tipo_evento, detalle, estado_anterior, estado_nuevo, fecha_creacion) VALUES
  (@r_nov_01, @u_valen, 'CREACION', 'Reclamo creado por el ciudadano y asignado automáticamente a Municipalidad de Viale.', NULL, 'Pendiente', '2026-11-01 11:00:00'),
  (@r_nov_01, @u_muni,  'CAMBIO_ESTADO', 'La institución actualizó el estado a En revisión.', 'Pendiente', 'En revisión', '2026-11-01 15:20:00'),
  (@r_nov_01, @u_muni,  'CAMBIO_ESTADO', 'La institución actualizó el estado a En proceso.', 'En revisión', 'En proceso', '2026-11-02 09:00:00'),
  (@r_nov_01, @u_muni,  'RESOLUCION', 'Reclamo resuelto por la institución. Mensaje: Se ejecutó bacheo con hormigón de fraguado rápido y señalización preventiva hasta habilitar el tránsito.', 'En proceso', 'Resuelto', '2026-11-03 11:00:00');

INSERT INTO reclamos_actualizaciones (id_reclamo, id_usuario, tipo_autor, texto, fecha_creacion) VALUES
  (@r_nov_01, @u_muni, 'institucion', 'Inspectoría de Obras Públicas verificó el hundimiento en el cruce semaforizado y valló preventivamente media calzada.', '2026-11-01 16:00:00'),
  (@r_nov_01, @u_muni, 'institucion', 'La cuadrilla de bacheo se encuentra trabajando en el lugar con corte parcial de tránsito.', '2026-11-02 10:30:00');

-- Historial y actualizaciones para @r_nov_03 (Pendiente Demorado - 7 afectados)
INSERT INTO reclamos_historial (id_reclamo, id_usuario, tipo_evento, detalle, estado_anterior, estado_nuevo, fecha_creacion) VALUES
  (@r_nov_03, @u_juli, 'CREACION', 'Reclamo creado por el ciudadano y asignado automáticamente a Municipalidad de Viale.', NULL, 'Pendiente', '2026-11-01 16:15:00');

INSERT INTO reclamos_actualizaciones (id_reclamo, id_usuario, tipo_autor, texto, fecha_creacion) VALUES
  (@r_nov_03, @u_juli, 'ciudadano', 'Después de la llovizna de ayer se formó un huellón más profundo en la mitad de la cuadra.', '2026-11-02 09:40:00');

-- Historial y actualizaciones para @r_nov_05 (En proceso)
INSERT INTO reclamos_historial (id_reclamo, id_usuario, tipo_evento, detalle, estado_anterior, estado_nuevo, fecha_creacion) VALUES
  (@r_nov_05, @u_marcos, 'CREACION', 'Reclamo creado por el ciudadano y asignado automáticamente a Municipalidad de Viale.', NULL, 'Pendiente', '2026-11-02 12:30:00'),
  (@r_nov_05, @u_muni,   'CAMBIO_ESTADO', 'La institución actualizó el estado a En revisión.', 'Pendiente', 'En revisión', '2026-11-02 17:00:00'),
  (@r_nov_05, @u_muni,   'CAMBIO_ESTADO', 'La institución actualizó el estado a En proceso.', 'En revisión', 'En proceso', '2026-11-03 09:30:00');

INSERT INTO reclamos_actualizaciones (id_reclamo, id_usuario, tipo_autor, texto, fecha_creacion) VALUES
  (@r_nov_05, @u_muni, 'institucion', 'El área de Tránsito y Señalización ya confeccionó el nuevo poste nomenclador y pintará el cordón amarillo en las próximas 24 hs.', '2026-11-03 10:15:00');

-- Historial y actualizaciones para @r_nov_09 (En proceso - 5 afectados)
INSERT INTO reclamos_historial (id_reclamo, id_usuario, tipo_evento, detalle, estado_anterior, estado_nuevo, fecha_creacion) VALUES
  (@r_nov_09, @u_martin, 'CREACION', 'Reclamo creado por el ciudadano y asignado automáticamente a Municipalidad de Viale.', NULL, 'Pendiente', '2026-11-03 13:20:00'),
  (@r_nov_09, @u_muni,   'CAMBIO_ESTADO', 'La institución actualizó el estado a En revisión.', 'Pendiente', 'En revisión', '2026-11-03 16:45:00'),
  (@r_nov_09, @u_muni,   'CAMBIO_ESTADO', 'La institución actualizó el estado a En proceso.', 'En revisión', 'En proceso', '2026-11-04 08:30:00');

INSERT INTO reclamos_actualizaciones (id_reclamo, id_usuario, tipo_autor, texto, fecha_creacion) VALUES
  (@r_nov_09, @u_muni, 'institucion', 'Se retiraron los hierros expuestos de manera preventiva y se programó la reconstrucción del reductor con mezcla asfáltica.', '2026-11-04 09:00:00');

SET SQL_SAFE_UPDATES = 1;
SET FOREIGN_KEY_CHECKS = 1;

