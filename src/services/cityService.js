const db = require('../config/db');

/**
 * Servicio centralizado para resolución territorial y ciudades activas.
 */
const cityService = {
  /**
   * Busca el ID de una ciudad activa en ReportARG a partir del nombre y provincia.
   * @param {string} nombreNombre - Nombre de la localidad/ciudad.
   * @param {string} provinciaNombre - Nombre de la provincia.
   * @param {object} [connection] - Conexión o cliente opcional de transacción MySQL.
   * @returns {Promise<number|null>} ID de la ciudad activa o null si no se encuentra activa.
   */
  async findActiveCity(nombreNombre, provinciaNombre, connection = db) {
    if (!nombreNombre) return null;

    const nombreClean = String(nombreNombre).trim().toLowerCase();
    const provinciaClean = provinciaNombre ? String(provinciaNombre).trim().toLowerCase() : null;

    if (provinciaClean) {
      const [rows] = await connection.query(
        `SELECT id_ciudad FROM ciudades 
         WHERE LOWER(nombre) = ? AND LOWER(provincia) = ? AND activa = 1 
         LIMIT 1`,
        [nombreClean, provinciaClean]
      );
      if (rows.length > 0) return rows[0].id_ciudad;
    }

    // Fallback: búsqueda solo por nombre de ciudad activa si la provincia no coincide exactamente
    const [rowsByName] = await connection.query(
      `SELECT id_ciudad FROM ciudades 
       WHERE LOWER(nombre) = ? AND activa = 1 
       LIMIT 1`,
      [nombreClean]
    );

    return rowsByName[0] ? rowsByName[0].id_ciudad : null;
  },

  /**
   * Obtiene la primera ciudad activa de ReportARG para visitantes anónimos / fallback público.
   * @returns {Promise<number|null>}
   */
  async getFirstActiveCity() {
    const [activeCities] = await db.query('SELECT id_ciudad FROM ciudades WHERE activa = 1 LIMIT 1');
    return activeCities[0]?.id_ciudad || null;
  }
};

module.exports = cityService;
