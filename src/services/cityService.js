const db = require('../config/db');

/**
 * Servicio centralizado para resolución territorial y ciudades activas.
 */
const cityService = {
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
