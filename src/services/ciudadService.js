const db = require('../config/db');

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
   * Verifica si una ciudad existe en el catálogo territorial oficial o en la tabla `ciudades` (activa o inactiva).
   */
  async existsCity(nombreNombre, provinciaNombre, connection = db) {
    if (!nombreNombre || !provinciaNombre) return false;

    const nombreClean = String(nombreNombre).trim().toLowerCase();
    const provinciaClean = String(provinciaNombre).trim().toLowerCase();

    if (!nombreClean || !provinciaClean || nombreClean === 'otra') {
      return false;
    }

    const listaProvincia = CATALOGO_CIUDADES_AR[provinciaClean];
    if (Array.isArray(listaProvincia) && listaProvincia.includes(nombreClean)) {
      return true;
    }

    const [rows] = await connection.query(
      `SELECT id_ciudad, nombre, provincia, activa FROM ciudades
       WHERE LOWER(nombre) = ? AND LOWER(provincia) = ?
       LIMIT 1`,
      [nombreClean, provinciaClean]
    );

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
