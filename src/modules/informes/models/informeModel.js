const db = require('../../../config/db');

/** Obtiene la cohorte completa del informe; no contiene reglas de cálculo. */
async function getCohorteInstitucion(idInstitucion, desde, hasta) {
  const [rows] = await db.query(`
    SELECT
      r.id_reclamo AS id,
      r.titulo,
      r.estado,
      r.fecha_creacion,
      r.fecha_resolucion,
      r.fecha_ultimo_cambio_estado,
      r.id_categoria AS categoriaId,
      c.nombre AS categoriaNombre,
      (SELECT COUNT(*) FROM reclamos_afectados ra WHERE ra.id_reclamo = r.id_reclamo) AS afectadosCount
    FROM reclamos r
    LEFT JOIN categorias c ON c.id_categoria = r.id_categoria
    WHERE r.id_institucion = ?
      AND r.fecha_creacion >= ?
      AND r.fecha_creacion < ?
    ORDER BY r.fecha_creacion DESC
  `, [idInstitucion, desde, hasta]);
  return rows;
}

module.exports = { getCohorteInstitucion };
