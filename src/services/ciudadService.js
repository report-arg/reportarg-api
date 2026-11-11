const path = require('path');
const db = require('../config/db');
const AuditoriaModel = require('../modules/admin/auditoriaModel');

// Fallback robusto en memoria con el dataset completo INDEC/Georef cargado
let catalogoLocalidadesMemoria = [];
let mapaLocalidadesPorProvincia = new Map();

try {
  const jsonPath = path.join(__dirname, '..', 'data', 'localidades_ar.json');
  catalogoLocalidadesMemoria = require(jsonPath);
  for (const item of catalogoLocalidadesMemoria) {
    const provKey = String(item.provincia || '').trim().toLowerCase();
    if (!mapaLocalidadesPorProvincia.has(provKey)) {
      mapaLocalidadesPorProvincia.set(provKey, []);
    }
    mapaLocalidadesPorProvincia.get(provKey).push(item);
  }
} catch (e) {
  catalogoLocalidadesMemoria = [];
  mapaLocalidadesPorProvincia = new Map();
}

const PROVINCIAS_AR = Object.freeze([
  'Buenos Aires', 'Catamarca', 'Chaco', 'Chubut', 'Ciudad Autónoma de Buenos Aires',
  'Córdoba', 'Corrientes', 'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja',
  'Mendoza', 'Misiones', 'Neuquén', 'Río Negro', 'Salta', 'San Juan', 'San Luis',
  'Santa Cruz', 'Santa Fe', 'Santiago del Estero', 'Tierra del Fuego', 'Tucumán',
]);

const CATALOGO_CIUDADES_AR = Object.freeze({
  'buenos aires': ['la plata', 'mar del plata', 'quilmes', 'lanús', 'lanus', 'lomas de zamora', 'morón', 'moron', 'tres de febrero', 'san martín', 'san martin', 'tigre', 'bahía blanca', 'bahia blanca', 'tandil', 'pergamino'],
  'catamarca': ['san fernando del valle de catamarca', 'santa rosa', 'tinogasta'],
  'chaco': ['resistencia', 'barranqueras', 'presidencia roque sáenz peña', 'presidencia roque saenz pena'],
  'chubut': ['rawson', 'comodoro rivadavia', 'puerto madryn', 'trelew'],
  'ciudad autónoma de buenos aires': ['caba', 'ciudad autónoma de buenos aires', 'buenos aires'],
  'ciudad autonoma de buenos aires': ['caba', 'ciudad autónoma de buenos aires', 'buenos aires'],
  'córdoba': ['córdoba', 'cordoba', 'villa maría', 'villa maria', 'san francisco', 'río cuarto', 'rio cuarto', 'alta gracia', 'villa carlos paz'],
  'cordoba': ['córdoba', 'cordoba', 'villa maría', 'villa maria', 'san francisco', 'río cuarto', 'rio cuarto', 'alta gracia', 'villa carlos paz'],
  'corrientes': ['corrientes', 'goya', 'curuzú cuatiá', 'curuzu cuatia'],
  'entre ríos': ['viale', 'paraná', 'parana', 'concordia', 'gualeguaychú', 'gualeguaychu', 'crespo', 'maría grande', 'maria grande', 'villaguay', 'victoria', 'la paz', 'colón', 'colon', 'diamante', 'nogoyá', 'nogoya', 'chajarí', 'chajari', 'federación', 'federacion'],
  'entre rios': ['viale', 'paraná', 'parana', 'concordia', 'gualeguaychú', 'gualeguaychu', 'crespo', 'maría grande', 'maria grande', 'villaguay', 'victoria', 'la paz', 'colón', 'colon', 'diamante', 'nogoyá', 'nogoya', 'chajarí', 'chajari', 'federación', 'federacion'],
  'formosa': ['formosa', 'clorinda'],
  'jujuy': ['san salvador de jujuy', 'palpalá', 'palpala', 'san pedro'],
  'la pampa': ['santa rosa', 'general pico'],
  'la rioja': ['la rioja', 'chilecito'],
  'mendoza': ['mendoza', 'san rafael', 'godoy cruz', 'luján de cuyo', 'lujan de cuyo'],
  'misiones': ['posadas', 'oberá', 'obera', 'eldorado', 'puerto iguazú', 'puerto iguazu'],
  'neuquén': ['neuquén', 'neuquen', 'san martín de los andes', 'san martin de los andes', 'zapala'],
  'neuquen': ['neuquén', 'neuquen', 'san martín de los andes', 'san martin de los andes', 'zapala'],
  'río negro': ['viedma', 'bariloche', 'san carlos de bariloche', 'cipolletti'],
  'rio negro': ['viedma', 'bariloche', 'san carlos de bariloche', 'cipolletti'],
  'salta': ['salta', 'san ramón de la nueva orán', 'san ramon de la nueva oran', 'tartagal'],
  'san juan': ['san juan', 'rawson', 'rivadavia'],
  'san luis': ['san luis', 'villa mercedes'],
  'santa cruz': ['río gallegos', 'rio gallegos', 'caleta olivia'],
  'santa fe': ['santa fe', 'rosario', 'rafaela', 'reconquista', 'venado tuerto'],
  'santiago del estero': ['santiago del estero', 'la banda'],
  'tierra del fuego': ['ushuaia', 'río grande', 'rio grande'],
  'tucumán': ['san miguel de tucumán', 'san miguel de tucuman', 'concepción', 'concepcion', 'banda del río salí', 'banda del rio sali'],
  'tucuman': ['san miguel de tucumán', 'san miguel de tucuman', 'concepción', 'concepcion', 'banda del río salí', 'banda del rio sali'],
});

/**
 * Servicio centralizado para resolución territorial y ciudades activas.
 */
const cityService = {
  getProvincias() {
    return PROVINCIAS_AR;
  },

  async getActiveById(id) {
    const [rows] = await db.query('SELECT id_ciudad, nombre, provincia FROM ciudades WHERE id_ciudad = ? AND activa = 1', [id]);
    return rows[0] || null;
  },

  async getById(id, connection = db) {
    if (!id || !Number.isSafeInteger(Number(id)) || Number(id) <= 0) return null;
    const [rows] = await connection.query(
      'SELECT id_ciudad, nombre, provincia, activa FROM ciudades WHERE id_ciudad = ? LIMIT 1',
      [Number(id)]
    );
    if (!rows || !rows[0]) return null;
    return {
      id: rows[0].id_ciudad,
      id_ciudad: rows[0].id_ciudad,
      nombre: rows[0].nombre,
      provincia: rows[0].provincia,
      activa: Number(rows[0].activa) === 1,
    };
  },

  async listActive() {
    const [rows] = await db.query('SELECT id_ciudad AS id, nombre, provincia FROM ciudades WHERE activa = 1 ORDER BY provincia, nombre');
    return rows;
  },

  /**
   * Lista localidades oficiales para una provincia, con búsqueda opcional por texto `q`,
   * cruzando contra la tabla `ciudades` para indicar si cada una se encuentra activa en ReportARG.
   */
  async listLocalidades({ provincia, q, limit = 100 }) {
    if (!provincia) return [];
    const provClean = String(provincia).trim();
    const provKey = provClean.toLowerCase();
    const queryTerm = q ? String(q).trim().toLowerCase() : '';
    const maxLimit = Math.min(Math.max(Number(limit) || 50, 1), 300);

    // Obtener ciudades activas en ReportARG para la provincia indicada
    let ciudadesActivasMap = new Map();
    try {
      const [activasRows] = await db.query(
        'SELECT id_ciudad, nombre, provincia FROM ciudades WHERE LOWER(provincia) = ? AND activa = 1',
        [provKey]
      );
      for (const row of activasRows) {
        ciudadesActivasMap.set(String(row.nombre).trim().toLowerCase(), row.id_ciudad);
      }
    } catch (e) {
      // Ignorar error si la tabla aún no estuviera disponible
    }

    // 1. Intentar consultar la tabla `localidades_ar`
    try {
      let sql = 'SELECT id, id_indec, nombre, provincia FROM localidades_ar WHERE LOWER(provincia) = ?';
      const params = [provKey];

      if (queryTerm) {
        sql += ' AND LOWER(nombre) LIKE ?';
        params.push(`%${queryTerm}%`);
      }

      sql += ' ORDER BY nombre ASC LIMIT ?';
      params.push(maxLimit);

      const [rows] = await db.query(sql, params);
      if (rows && rows.length > 0) {
        return rows.map((r) => {
          const nomClean = String(r.nombre).trim().toLowerCase();
          const idActiva = ciudadesActivasMap.get(nomClean) || null;
          return {
            id: r.id,
            id_indec: r.id_indec,
            nombre: r.nombre,
            provincia: r.provincia,
            activa: Boolean(idActiva),
            id_ciudad_activa: idActiva,
          };
        });
      }
    } catch (dbErr) {
      // Si la tabla aún no existe o hay error en BD, usar el fallback en memoria
    }

    // 2. Fallback: usar el padrón oficial en memoria
    const listaProv = mapaLocalidadesPorProvincia.get(provKey) || [];
    let filtradas = listaProv;
    if (queryTerm) {
      filtradas = listaProv.filter((l) => String(l.nombre).toLowerCase().includes(queryTerm));
    }

    return filtradas.slice(0, maxLimit).map((item, idx) => {
      const nomClean = String(item.nombre).trim().toLowerCase();
      const idActiva = ciudadesActivasMap.get(nomClean) || null;
      return {
        id: idx + 1,
        id_indec: item.id_indec,
        nombre: item.nombre,
        provincia: item.provincia,
        activa: Boolean(idActiva),
        id_ciudad_activa: idActiva,
      };
    });
  },

  /**
   * Verifica si una ciudad existe en el catálogo territorial oficial (BD o memoria)
   * o en la tabla `ciudades` (activa o inactiva).
   */
  async existsCity(nombreNombre, provinciaNombre, connection = db) {
    if (!nombreNombre || !provinciaNombre) return false;

    const nombreClean = String(nombreNombre).trim().toLowerCase();
    const provinciaClean = String(provinciaNombre).trim().toLowerCase();

    if (!nombreClean || !provinciaClean || nombreClean === 'otra') {
      return false;
    }

    // 1. Verificar catálogo histórico en memoria
    const listaProvincia = CATALOGO_CIUDADES_AR[provinciaClean];
    if (Array.isArray(listaProvincia) && listaProvincia.includes(nombreClean)) {
      return true;
    }

    // 2. Verificar padrón oficial completo en memoria
    const padronProv = mapaLocalidadesPorProvincia.get(provinciaClean);
    if (Array.isArray(padronProv)) {
      const matchPadron = padronProv.some(
        (l) => String(l.nombre).trim().toLowerCase() === nombreClean
      );
      if (matchPadron) return true;
    }

    // 3. Verificar tabla `localidades_ar` en base de datos si existe
    try {
      const resultLoc = await connection.query(
        `SELECT id FROM localidades_ar
         WHERE LOWER(nombre) = ? AND LOWER(provincia) = ?
         LIMIT 1`,
        [nombreClean, provinciaClean]
      );
      const rowsLoc = Array.isArray(resultLoc) ? resultLoc[0] : resultLoc;
      if (rowsLoc && rowsLoc[0]) return true;
    } catch (e) {
      // Ignorar si la tabla no existe aún en el ambiente
    }

    // 4. Verificar tabla `ciudades` (activa o inactiva)
    const result = await connection.query(
      `SELECT id_ciudad, nombre, provincia, activa FROM ciudades
       WHERE LOWER(nombre) = ? AND LOWER(provincia) = ?
       LIMIT 1`,
      [nombreClean, provinciaClean]
    );

    const rows = Array.isArray(result) ? result[0] : result;
    return Boolean(rows && rows[0]);
  },

  /**
   * Busca el ID de una ciudad activa en ReportARG a partir del nombre y provincia.
   * Exige coincidencia exacta de nombre + provincia cuando se provee provincia,
   * sin realizar fallbacks silenciosos que puedan confundir localidades de distintas provincias.
   *
   * @param {string} nombreNombre - Nombre de la localidad/ciudad.
   * @param {string} provinciaNombre - Nombre de la provincia.
   * @param {object} [connection] - Conexión o cliente opcional de transacción MySQL.
   * @returns {Promise<number|null>} ID de la ciudad activa o null si no existe coincidencia.
   */
  async findActiveCity(nombreNombre, provinciaNombre, connection = db) {
    if (!nombreNombre) return null;

    const nombreClean = String(nombreNombre).trim().toLowerCase();
    const provinciaClean = provinciaNombre ? String(provinciaNombre).trim().toLowerCase() : null;

    if (provinciaClean) {
      // Coincidencia exacta estricta por Nombre + Provincia
      const [rows] = await connection.query(
        `SELECT id_ciudad FROM ciudades 
         WHERE LOWER(nombre) = ? AND LOWER(provincia) = ? AND activa = 1 
         LIMIT 1`,
        [nombreClean, provinciaClean]
      );
      return rows[0] ? rows[0].id_ciudad : null;
    }

    // Búsqueda solo por nombre cuando no se proveyó provincia (evitando selección arbitraria si hay ambigüedad)
    const [rowsByName] = await connection.query(
      `SELECT id_ciudad FROM ciudades 
       WHERE LOWER(nombre) = ? AND activa = 1`,
      [nombreClean]
    );

    if (rowsByName.length !== 1) return null;

    return rowsByName[0].id_ciudad;
  },

  /**
   * Busca una ciudad en la tabla `ciudades` (activa o inactiva) o la registra como inactiva
   * si pertenece al catálogo oficial de localidades argentinas.
   */
  async findOrCreateCity(nombreNombre, provinciaNombre, connection = db) {
    if (!nombreNombre || !provinciaNombre) return null;

    const nombreTrim = String(nombreNombre).trim();
    const provinciaTrim = String(provinciaNombre).trim();
    const nombreClean = nombreTrim.toLowerCase();
    const provinciaClean = provinciaTrim.toLowerCase();

    if (!nombreClean || !provinciaClean) return null;

    const [rows] = await connection.query(
      `SELECT id_ciudad, nombre, provincia, activa
       FROM ciudades
       WHERE LOWER(nombre) = ? AND LOWER(provincia) = ?
       LIMIT 1`,
      [nombreClean, provinciaClean]
    );

    if (rows && rows[0]) {
      return {
        id_ciudad: rows[0].id_ciudad,
        nombre: rows[0].nombre,
        provincia: rows[0].provincia,
        activa: Number(rows[0].activa) === 1,
        created: false,
      };
    }

    const existeOficial = await this.existsCity(nombreTrim, provinciaTrim, connection);
    if (!existeOficial) {
      return null;
    }

    const [insertRes] = await connection.query(
      `INSERT INTO ciudades (nombre, provincia, activa)
       VALUES (?, ?, 0)`,
      [nombreTrim, provinciaTrim]
    );

    return {
      id_ciudad: insertRes.insertId,
      nombre: nombreTrim,
      provincia: provinciaTrim,
      activa: false,
      created: true,
    };
  },

  /**
   * Listado administrativo completo de ciudades (activas e inactivas) con métricas,
   * institución principal vigente e instituciones verificadas elegibles.
   */
  async listAdmin({ estado, provincia, busqueda } = {}) {
    const [rows] = await db.query(
      `SELECT
        c.id_ciudad,
        c.id_ciudad AS id,
        c.nombre,
        c.provincia,
        c.activa,
        c.fecha_creacion,
        ip.id_institucion AS id_institucion_principal,
        ip.nombre AS institucion_principal_nombre,
        ip.tipo AS institucion_principal_tipo,
        (
          SELECT COUNT(*)
          FROM instituciones inst_v
          INNER JOIN usuarios usr_i ON usr_i.id_usuario = inst_v.id_usuario
          WHERE inst_v.id_ciudad = c.id_ciudad
            AND inst_v.verificada = 1
            AND (inst_v.status IS NULL OR inst_v.status = 'approved')
            AND usr_i.activo = 1
            AND COALESCE(usr_i.email_verified, 1) = 1
        ) AS instituciones_verificadas,
        (
          SELECT COUNT(*)
          FROM instituciones inst_p
          INNER JOIN usuarios usr_p ON usr_p.id_usuario = inst_p.id_usuario
          WHERE inst_p.id_ciudad = c.id_ciudad
            AND inst_p.verificada = 0
            AND (inst_p.status IS NULL OR inst_p.status = 'pending')
            AND COALESCE(usr_p.email_verified, 1) = 1
        ) AS instituciones_pendientes,
        (
          SELECT COUNT(DISTINCT usr.id_usuario)
          FROM usuarios usr
          LEFT JOIN ciudadanos ci ON ci.id_usuario = usr.id_usuario
          WHERE usr.tipo_usuario IN ('ciudadano', 'usuario')
            AND COALESCE(usr.email_verified, 1) = 1
            AND (
              usr.id_ciudad = c.id_ciudad
              OR (
                LOWER(TRIM(ci.ciudad)) = LOWER(TRIM(c.nombre))
                AND LOWER(TRIM(ci.provincia)) = LOWER(TRIM(c.provincia))
              )
            )
        ) AS ciudadanos_total,
        (
          SELECT COUNT(*)
          FROM reclamos r
          WHERE r.id_ciudad = c.id_ciudad
        ) AS reclamos_total,
        (
          SELECT COUNT(*)
          FROM reclamos r
          WHERE r.id_ciudad = c.id_ciudad
            AND r.estado IN ('Pendiente', 'En revisión', 'En proceso')
        ) AS reclamos_abiertos
      FROM ciudades c
      LEFT JOIN (
        SELECT
          inst_ip.id_ciudad,
          inst_ip.id_institucion,
          inst_ip.nombre,
          inst_ip.tipo
        FROM instituciones inst_ip
        INNER JOIN usuarios usr_ip ON usr_ip.id_usuario = inst_ip.id_usuario
        WHERE inst_ip.es_principal = 1
          AND inst_ip.verificada = 1
          AND (inst_ip.status IS NULL OR inst_ip.status = 'approved')
          AND usr_ip.activo = 1
          AND COALESCE(usr_ip.email_verified, 1) = 1
      ) ip ON ip.id_ciudad = c.id_ciudad
      ORDER BY c.activa DESC, c.provincia ASC, c.nombre ASC`
    );

    let elegiblesPorCiudad = new Map();
    try {
      const [instRows] = await db.query(
        `SELECT
          inst_e.id_institucion AS id,
          inst_e.id_ciudad,
          inst_e.nombre,
          inst_e.tipo,
          inst_e.es_principal
        FROM instituciones inst_e
        INNER JOIN usuarios usr_e ON usr_e.id_usuario = inst_e.id_usuario
        WHERE inst_e.verificada = 1
          AND (inst_e.status IS NULL OR inst_e.status = 'approved')
          AND usr_e.activo = 1
          AND COALESCE(usr_e.email_verified, 1) = 1
        ORDER BY inst_e.es_principal DESC, inst_e.nombre ASC`
      );
      if (Array.isArray(instRows)) {
        for (const inst of instRows) {
          const cid = Number(inst.id_ciudad);
          if (!elegiblesPorCiudad.has(cid)) {
            elegiblesPorCiudad.set(cid, []);
          }
          elegiblesPorCiudad.get(cid).push({
            id: inst.id,
            id_ciudad: cid,
            nombre: inst.nombre,
            tipo: inst.tipo,
            es_principal: Number(inst.es_principal) === 1 ? 1 : 0,
          });
        }
      }
    } catch (_) {
      elegiblesPorCiudad = new Map();
    }

    const todas = (Array.isArray(rows) ? rows : []).map((r) => {
      const idCiudad = Number(r.id_ciudad || r.id);
      const esActiva = Number(r.activa) === 1;
      const elegibles = elegiblesPorCiudad.get(idCiudad) || [];
      const idPrincipal = r.id_institucion_principal ? Number(r.id_institucion_principal) : null;

      return {
        id: idCiudad,
        id_ciudad: idCiudad,
        nombre: r.nombre,
        provincia: r.provincia,
        activa: esActiva ? 1 : 0,
        estado: esActiva ? 'activa' : 'inactiva',
        fecha_creacion: r.fecha_creacion || null,
        id_institucion_principal: idPrincipal,
        institucion_principal_nombre: r.institucion_principal_nombre || null,
        institucion_principal_tipo: r.institucion_principal_tipo || null,
        instituciones_verificadas: Number(r.instituciones_verificadas || 0),
        instituciones_pendientes: Number(r.instituciones_pendientes || 0),
        ciudadanos_total: Number(r.ciudadanos_total || 0),
        reclamos_total: Number(r.reclamos_total || 0),
        reclamos_abiertos: Number(r.reclamos_abiertos || 0),
        instituciones_elegibles: elegibles,
      };
    });

    const stats = {
      total: todas.length,
      activas: todas.filter((c) => c.activa === 1).length,
      inactivas: todas.filter((c) => c.activa === 0).length,
      sin_principal: todas.filter((c) => !c.id_institucion_principal).length,
      activas_sin_principal: todas.filter((c) => c.activa === 1 && !c.id_institucion_principal).length,
    };

    let filtradas = todas;

    if (estado && estado !== 'todas') {
      const est = String(estado).trim().toLowerCase();
      if (est === 'activa' || est === 'activas') {
        filtradas = filtradas.filter((c) => c.activa === 1);
      } else if (est === 'inactiva' || est === 'inactivas') {
        filtradas = filtradas.filter((c) => c.activa === 0);
      } else if (est === 'sin_principal') {
        filtradas = filtradas.filter((c) => !c.id_institucion_principal);
      }
    }

    if (provincia && provincia !== 'todas') {
      const provClean = String(provincia).trim().toLowerCase();
      filtradas = filtradas.filter((c) => String(c.provincia || '').trim().toLowerCase() === provClean);
    }

    if (busqueda && String(busqueda).trim()) {
      const term = String(busqueda).trim().toLowerCase();
      filtradas = filtradas.filter(
        (c) =>
          String(c.nombre || '').toLowerCase().includes(term) ||
          String(c.provincia || '').toLowerCase().includes(term) ||
          String(c.institucion_principal_nombre || '').toLowerCase().includes(term)
      );
    }

    return { ciudades: filtradas, stats };
  },

  /**
   * Registra una nueva localidad del padrón oficial en la tabla `ciudades` en estado inactivo (activa = 0).
   */
  async createCityAdmin({ nombre, provincia, idAdmin = null }) {
    const nombreTrim = String(nombre || '').trim();
    const provinciaTrim = String(provincia || '').trim();

    if (!nombreTrim || !provinciaTrim) {
      const err = new Error('Nombre de localidad y provincia son obligatorios.');
      err.status = 400;
      throw err;
    }

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const [existentes] = await connection.query(
        `SELECT id_ciudad, nombre, provincia, activa
         FROM ciudades
         WHERE LOWER(nombre) = ? AND LOWER(provincia) = ?
         LIMIT 1`,
        [nombreTrim.toLowerCase(), provinciaTrim.toLowerCase()]
      );

      if (existentes && existentes[0]) {
        const err = new Error(`La localidad "${existentes[0].nombre}" (${existentes[0].provincia}) ya se encuentra registrada.`);
        err.status = 409;
        err.codigo = 'CIUDAD_YA_REGISTRADA';
        throw err;
      }

      const esValida = await this.existsCity(nombreTrim, provinciaTrim, connection);
      if (!esValida) {
        const err = new Error('La localidad seleccionada no pertenece al padrón oficial para la provincia indicada.');
        err.status = 400;
        err.codigo = 'CIUDAD_INEXISTENTE';
        throw err;
      }

      const [result] = await connection.query(
        `INSERT INTO ciudades (nombre, provincia, activa)
         VALUES (?, ?, 0)`,
        [nombreTrim, provinciaTrim]
      );

      const idCiudad = result.insertId;

      await AuditoriaModel.registrar(
        {
          idActor: idAdmin,
          entidadTipo: 'ciudad',
          entidadId: Number(idCiudad),
          accion: 'REGISTRAR_CIUDAD',
          datosNuevos: { id_ciudad: Number(idCiudad), nombre: nombreTrim, provincia: provinciaTrim, activa: 0 },
        },
        connection
      );

      await connection.commit();

      return {
        id: idCiudad,
        id_ciudad: idCiudad,
        nombre: nombreTrim,
        provincia: provinciaTrim,
        activa: 0,
        estado: 'inactiva',
      };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  },

  /**
   * Activa o desactiva operativamente una ciudad validando que toda ciudad activa
   * cuente obligatoriamente con una institución principal verificada y activa.
   */
  async cambiarEstadoCiudad({ idCiudad, activa, idInstitucionPrincipal = null, motivo = null, idAdmin = null }) {
    const idNum = Number(idCiudad);
    if (!Number.isSafeInteger(idNum) || idNum <= 0) {
      const err = new Error('Identificador de ciudad inválido.');
      err.status = 400;
      throw err;
    }

    const targetActiva = activa === true || activa === 1 || activa === '1' || activa === 'activa';
    const motivoLimpio = motivo ? String(motivo).trim() : null;

    if (!targetActiva && !motivoLimpio) {
      const err = new Error('El motivo es obligatorio para desactivar una ciudad.');
      err.status = 400;
      err.codigo = 'MOTIVO_OBLIGATORIO';
      throw err;
    }

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const [ciudadRows] = await connection.query(
        `SELECT id_ciudad, nombre, provincia, activa
         FROM ciudades
         WHERE id_ciudad = ?
         FOR UPDATE`,
        [idNum]
      );

      const ciudad = ciudadRows && ciudadRows[0] ? ciudadRows[0] : null;
      if (!ciudad) {
        const err = new Error('Ciudad no encontrada.');
        err.status = 404;
        throw err;
      }

      if (targetActiva) {
        // Si se indicó una institución principal al activar, validarla y designarla primero
        if (idInstitucionPrincipal !== null && idInstitucionPrincipal !== undefined && idInstitucionPrincipal !== '') {
          const idInstNum = Number(idInstitucionPrincipal);
          if (!Number.isSafeInteger(idInstNum) || idInstNum <= 0) {
            const err = new Error('Identificador de institución principal inválido.');
            err.status = 400;
            throw err;
          }

          const [instRows] = await connection.query(
            `SELECT i.id_institucion, i.nombre, i.id_ciudad, i.verificada, i.status, u.activo
             FROM instituciones i
             INNER JOIN usuarios u ON u.id_usuario = i.id_usuario
             WHERE i.id_institucion = ?
             LIMIT 1`,
            [idInstNum]
          );
          const inst = instRows && instRows[0] ? instRows[0] : null;

          if (
            !inst ||
            Number(inst.id_ciudad) !== idNum ||
            Number(inst.verificada) !== 1 ||
            inst.status === 'rejected' ||
            Number(inst.activo) !== 1
          ) {
            const err = new Error(
              'La institución seleccionada debe pertenecer a esta ciudad, estar verificada y encontrarse activa.'
            );
            err.status = 400;
            err.codigo = 'INSTITUCION_PRINCIPAL_INVALIDA';
            throw err;
          }

          await connection.query(`UPDATE instituciones SET es_principal = 0 WHERE id_ciudad = ?`, [idNum]);
          await connection.query(
            `UPDATE instituciones SET es_principal = 1 WHERE id_institucion = ? AND id_ciudad = ?`,
            [idInstNum, idNum]
          );
        }

        // Comprobar que exista una institución principal válida para la ciudad
        const [principalRows] = await connection.query(
          `SELECT i.id_institucion, i.nombre
           FROM instituciones i
           INNER JOIN usuarios u ON u.id_usuario = i.id_usuario
           WHERE i.id_ciudad = ?
             AND i.es_principal = 1
             AND i.verificada = 1
             AND (i.status IS NULL OR i.status = 'approved')
             AND u.activo = 1
           LIMIT 1`,
          [idNum]
        );

        const principal = principalRows && principalRows[0] ? principalRows[0] : null;
        if (!principal) {
          const err = new Error(
            'No se puede activar la ciudad porque no cuenta con una institución principal verificada y activa asignada.'
          );
          err.status = 409;
          err.codigo = 'CIUDAD_SIN_INSTITUCION_PRINCIPAL';
          throw err;
        }

        await connection.query(`UPDATE ciudades SET activa = 1 WHERE id_ciudad = ?`, [idNum]);

        // Vincular operativamente a ciudadanos residentes en esta ciudad que aún tenían id_ciudad = NULL
        await connection.query(
          `UPDATE usuarios u
           INNER JOIN ciudadanos ci ON ci.id_usuario = u.id_usuario
           SET u.id_ciudad = ?
           WHERE u.id_ciudad IS NULL
             AND LOWER(TRIM(ci.ciudad)) = LOWER(TRIM(?))
             AND LOWER(TRIM(ci.provincia)) = LOWER(TRIM(?))`,
          [idNum, ciudad.nombre, ciudad.provincia]
        );

        await AuditoriaModel.registrar(
          {
            idActor: idAdmin,
            entidadTipo: 'ciudad',
            entidadId: idNum,
            accion: 'ACTIVAR_CIUDAD',
            motivo: motivoLimpio,
            datosAnteriores: { activa: Number(ciudad.activa) },
            datosNuevos: {
              activa: 1,
              id_institucion_principal: principal.id_institucion,
              institucion_principal_nombre: principal.nombre,
            },
          },
          connection
        );

        await connection.commit();
        return {
          id: idNum,
          id_ciudad: idNum,
          nombre: ciudad.nombre,
          provincia: ciudad.provincia,
          activa: 1,
          estado: 'activa',
          id_institucion_principal: principal.id_institucion,
          institucion_principal_nombre: principal.nombre,
        };
      } else {
        await connection.query(`UPDATE ciudades SET activa = 0 WHERE id_ciudad = ?`, [idNum]);

        await AuditoriaModel.registrar(
          {
            idActor: idAdmin,
            entidadTipo: 'ciudad',
            entidadId: idNum,
            accion: 'DESACTIVAR_CIUDAD',
            motivo: motivoLimpio,
            datosAnteriores: { activa: Number(ciudad.activa) },
            datosNuevos: { activa: 0 },
          },
          connection
        );

        await connection.commit();
        return {
          id: idNum,
          id_ciudad: idNum,
          nombre: ciudad.nombre,
          provincia: ciudad.provincia,
          activa: 0,
          estado: 'inactiva',
        };
      }
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  },

  /**
   * Designa o reemplaza la institución principal de una ciudad asegurando que pertenezca a ella,
   * esté verificada y activa.
   */
  async designarInstitucionPrincipal({ idCiudad, idInstitucion, idAdmin = null }) {
    const idCiudadNum = Number(idCiudad);
    const idInstNum = Number(idInstitucion);

    if (!Number.isSafeInteger(idCiudadNum) || idCiudadNum <= 0) {
      const err = new Error('Identificador de ciudad inválido.');
      err.status = 400;
      throw err;
    }
    if (!Number.isSafeInteger(idInstNum) || idInstNum <= 0) {
      const err = new Error('Debe seleccionar una institución válida.');
      err.status = 400;
      throw err;
    }

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const [ciudadRows] = await connection.query(
        `SELECT id_ciudad, nombre, provincia, activa FROM ciudades WHERE id_ciudad = ? LIMIT 1`,
        [idCiudadNum]
      );
      const ciudad = ciudadRows && ciudadRows[0] ? ciudadRows[0] : null;
      if (!ciudad) {
        const err = new Error('Ciudad no encontrada.');
        err.status = 404;
        throw err;
      }

      const [instRows] = await connection.query(
        `SELECT i.id_institucion, i.nombre, i.id_ciudad, i.verificada, i.status, u.activo
         FROM instituciones i
         INNER JOIN usuarios u ON u.id_usuario = i.id_usuario
         WHERE i.id_institucion = ?
         LIMIT 1`,
        [idInstNum]
      );
      const inst = instRows && instRows[0] ? instRows[0] : null;
      if (!inst) {
        const err = new Error('Institución no encontrada.');
        err.status = 404;
        throw err;
      }

      if (Number(inst.id_ciudad) !== idCiudadNum) {
        const err = new Error('La institución seleccionada no pertenece a esta ciudad.');
        err.status = 400;
        err.codigo = 'INSTITUCION_DE_OTRA_CIUDAD';
        throw err;
      }

      if (Number(inst.verificada) !== 1 || inst.status === 'rejected' || Number(inst.activo) !== 1) {
        const err = new Error(
          'Solo una institución verificada, aprobada y activa puede ser designada como institución principal.'
        );
        err.status = 400;
        err.codigo = 'INSTITUCION_PRINCIPAL_INVALIDA';
        throw err;
      }

      const [prevPrincipalRows] = await connection.query(
        `SELECT id_institucion, nombre FROM instituciones WHERE id_ciudad = ? AND es_principal = 1 LIMIT 1`,
        [idCiudadNum]
      );
      const prevPrincipal = prevPrincipalRows && prevPrincipalRows[0] ? prevPrincipalRows[0] : null;

      await connection.query(`UPDATE instituciones SET es_principal = 0 WHERE id_ciudad = ?`, [idCiudadNum]);
      await connection.query(
        `UPDATE instituciones SET es_principal = 1 WHERE id_institucion = ? AND id_ciudad = ?`,
        [idInstNum, idCiudadNum]
      );

      await AuditoriaModel.registrar(
        {
          idActor: idAdmin,
          entidadTipo: 'ciudad',
          entidadId: idCiudadNum,
          accion: 'DESIGNAR_INSTITUCION_PRINCIPAL',
          datosAnteriores: prevPrincipal
            ? { id_institucion: prevPrincipal.id_institucion, nombre: prevPrincipal.nombre }
            : null,
          datosNuevos: {
            id_ciudad: idCiudadNum,
            id_institucion: idInstNum,
            institucion_nombre: inst.nombre,
          },
        },
        connection
      );

      await connection.commit();
      return {
        id_ciudad: idCiudadNum,
        ciudad_nombre: ciudad.nombre,
        id_institucion_principal: idInstNum,
        institucion_principal_nombre: inst.nombre,
      };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  },
};

module.exports = cityService;
