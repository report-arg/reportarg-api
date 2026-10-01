-- =========================================================================
-- MIGRACIÓN 007: Limpieza y generación de datos de prueba para presentación
-- =========================================================================

-- 1. LIMPIEZA DE CIUDADANOS (Mantener solo a Juli Ciudadano)
-- OJO: Esto va a eliminar los reclamos asociados a los ciudadanos borrados.
-- El ID del usuario de Juli es 32 (juli.ciudadano@reportarg.com).
DELETE c, u 
FROM ciudadanos c
JOIN usuarios u ON c.id_usuario = u.id_usuario
WHERE u.email != 'juli.ciudadano@reportarg.com' AND u.tipo_usuario = 'ciudadano';

-- 2. CREACIÓN DE NUEVOS CIUDADANOS (Valen, Ludmi y Juan Perez)
-- Hash para "Admin123!"
SET @password_hash = '$2b$10$g8rbuJjHXgIHle74Hfy4HeWUP5X2DSOG1BjclqFDwncQawrpXH21y';

-- Valen Ciudadano
INSERT INTO usuarios (email, password, tipo_usuario, id_ciudad, activo, email_verified) 
VALUES ('valen.ciudadano@reportarg.com', @password_hash, 'ciudadano', 1, 1, 1);
SET @id_user_valen = LAST_INSERT_ID();
INSERT INTO ciudadanos (id_usuario, nombre, apellido, provincia, ciudad, zona) 
VALUES (@id_user_valen, 'Valentina', 'Pescara', 'Entre Ríos', 'Viale', 'Centro');

-- Ludmi Ciudadano
INSERT INTO usuarios (email, password, tipo_usuario, id_ciudad, activo, email_verified) 
VALUES ('ludmi.ciudadano@reportarg.com', @password_hash, 'ciudadano', 1, 1, 1);
SET @id_user_ludmi = LAST_INSERT_ID();
INSERT INTO ciudadanos (id_usuario, nombre, apellido, provincia, ciudad, zona) 
VALUES (@id_user_ludmi, 'Ludmila', 'Mansilla', 'Entre Ríos', 'Viale', 'Barrio Sur');

-- Juan Perez
INSERT INTO usuarios (email, password, tipo_usuario, id_ciudad, activo, email_verified) 
VALUES ('juan.perez@reportarg.com', @password_hash, 'ciudadano', 1, 1, 1);
SET @id_user_juan = LAST_INSERT_ID();
INSERT INTO ciudadanos (id_usuario, nombre, apellido, provincia, ciudad, zona) 
VALUES (@id_user_juan, 'Juan', 'Pérez', 'Entre Ríos', 'Viale', 'Barrio Norte');

-- ID de Juli Ciudadano (ya existente)
SET @id_user_juli = 32;

-- 3. CREACIÓN DE RECLAMOS DE PRUEBA
-- Categorías: 1(Cortes de luz), 2(Problemas de agua), 3(Seguridad), 4(Vandalismo), 5(Calles rotas), 6(Residuos)
-- Instituciones: 10(Muni), 12(ENERSA), 13(Obras Sanitarias), 14(Policía)

-- Reclamo 1: Bache peligroso (Muni) -> Pendiente
INSERT INTO reclamos (titulo, descripcion, id_categoria, id_usuario, id_ciudad, id_institucion, direccion, latitud, longitud, estado, visibilidad)
VALUES ('Bache muy profundo en la avenida', 'Hace semanas se formó un pozo enorme que rompe los autos que pasan por acá.', 5, @id_user_valen, 1, 10, 'Av. San Martín 1500', -31.8667, -59.9833, 'Pendiente', 'publico');
SET @id_reclamo_1 = LAST_INSERT_ID();

-- Reclamo 2: Poste de luz a punto de caer (ENERSA) -> En revisión
INSERT INTO reclamos (titulo, descripcion, id_categoria, id_usuario, id_ciudad, id_institucion, direccion, latitud, longitud, estado, visibilidad)
VALUES ('Poste inclinado con peligro de caída', 'Después de la tormenta el poste quedó muy inclinado, los cables están tensos.', 7, @id_user_ludmi, 1, 12, 'Urquiza y Belgrano', -31.8650, -59.9820, 'En revisión', 'publico');
SET @id_reclamo_2 = LAST_INSERT_ID();

-- Reclamo 3: Robo en la plaza (Policía) -> Resuelto
INSERT INTO reclamos (titulo, descripcion, id_categoria, id_usuario, id_ciudad, id_institucion, direccion, latitud, longitud, estado, visibilidad)
VALUES ('Robo de luminarias en la plaza', 'Se robaron dos reflectores de la plaza principal anoche.', 3, @id_user_juan, 1, 14, 'Plaza San Martín', -31.8645, -59.9815, 'Resuelto', 'publico');
SET @id_reclamo_3 = LAST_INSERT_ID();

-- Reclamo 4: Caño de agua roto (Obras Sanitarias) -> En proceso
INSERT INTO reclamos (titulo, descripcion, id_categoria, id_usuario, id_ciudad, id_institucion, direccion, latitud, longitud, estado, visibilidad)
VALUES ('Pérdida de agua importante en la vereda', 'Sale agua limpia desde ayer a la tarde sin parar, se está inundando la calle.', 2, @id_user_juli, 1, 13, 'Rivadavia 450', -31.8670, -59.9850, 'En proceso', 'publico');
SET @id_reclamo_4 = LAST_INSERT_ID();

-- Reclamo 5: Basura acumulada (Muni) -> Pendiente
INSERT INTO reclamos (titulo, descripcion, id_categoria, id_usuario, id_ciudad, id_institucion, direccion, latitud, longitud, estado, visibilidad)
VALUES ('Microbasural en esquina baldía', 'La gente tira basura y hace días que no pasa el recolector, hay mucho olor.', 6, @id_user_valen, 1, 10, '25 de Mayo y Moreno', -31.8680, -59.9800, 'Pendiente', 'publico');
SET @id_reclamo_5 = LAST_INSERT_ID();

-- Agregar actualizaciones (historial de chat del reclamo) para darle realismo
INSERT INTO reclamos_actualizaciones (id_reclamo, id_usuario, tipo_autor, texto)
VALUES (@id_reclamo_2, (SELECT id_usuario FROM instituciones WHERE id_institucion = 12), 'institucion', 'Hemos recibido el reclamo y agendado una inspección técnica para mañana por la mañana.');

INSERT INTO reclamos_actualizaciones (id_reclamo, id_usuario, tipo_autor, texto)
VALUES (@id_reclamo_4, (SELECT id_usuario FROM instituciones WHERE id_institucion = 13), 'institucion', 'La cuadrilla ya se encuentra trabajando en el lugar para reparar la rotura del caño.');

-- Agregar participaciones ("A mi también me pasa")
INSERT INTO reclamos_afectados (id_reclamo, id_usuario) VALUES (@id_reclamo_1, @id_user_juan);
INSERT INTO reclamos_afectados (id_reclamo, id_usuario) VALUES (@id_reclamo_1, @id_user_juli);
INSERT INTO reclamos_afectados (id_reclamo, id_usuario) VALUES (@id_reclamo_2, @id_user_juan);

-- 4. CREACIÓN DE COMUNICADOS INSTITUCIONALES
-- Comunicado 1: Corte programado de agua (Obras Sanitarias, cat 2)
INSERT INTO comunicados (titulo, contenido, id_institucion, id_categoria)
VALUES ('Corte programado de agua potable', 'Se informa a la comunidad que el próximo jueves habrá un corte de suministro desde las 08:00 hasta las 14:00 horas por tareas de mantenimiento en la planta potabilizadora.', 13, 2);

-- Comunicado 2: Campaña de descacharrización (Muni, cat 6)
INSERT INTO comunicados (titulo, contenido, id_institucion, id_categoria)
VALUES ('Campaña de descacharrización contra el Dengue', 'Este fin de semana se dispondrán volquetes en diferentes puntos de la ciudad para que los vecinos puedan descartar cacharros y recipientes que acumulen agua.', 10, 6);

-- Comunicado 3: Prevención de estafas telefónicas (Policía, cat 3)
INSERT INTO comunicados (titulo, contenido, id_institucion, id_categoria)
VALUES ('Alerta por estafas telefónicas', 'Ante reiteradas denuncias, recordamos a la población no brindar datos personales ni bancarios por teléfono a supuestos representantes de entidades financieras.', 14, 3);
