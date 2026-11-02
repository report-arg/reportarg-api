const path = require('path');
const db = require('../config/db');

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
};

module.exports = cityService;
