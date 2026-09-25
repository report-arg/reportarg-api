const InstitutionModel = require('../models/institutionModel');

/**
 * Servicio para determinar automáticamente la institución responsable de un reclamo
 * según la Ciudad y la Categoría del reclamo (HU-04 / HU-05).
 *
 * Criterio de asignación:
 * 1. Busca una institución explícitamente asociada a la categoría en esa ciudad.
 * 2. Si no encuentra ninguna, recurre a la institución marcada como "Principal" de la ciudad.
 * 3. Si no hay institución principal, retorna null.
 *
 * @param {number} idCiudad ID de la ciudad del reclamo
 * @param {number} idCategoria ID de la categoría del reclamo
 * @returns {Promise<number|null>} ID de la institución asignada o null
 */
async function resolverInstitucionAsignada(idCiudad = 1, idCategoria) {
  if (!idCategoria) return null;

  // 1. Asignación directa por Categoría + Ciudad
  const instCategoria = await InstitutionModel.getPorCategoriaYCiudad(idCategoria, idCiudad);
  if (instCategoria && instCategoria.id) {
    return instCategoria.id;
  }

  // 2. Respaldo a la Institución Principal de la ciudad (HU-05)
  const instPrincipal = await InstitutionModel.getPrincipalDeCiudad(idCiudad);
  if (instPrincipal && instPrincipal.id) {
    return instPrincipal.id;
  }

  return null;
}

module.exports = {
  resolverInstitucionAsignada,
};
