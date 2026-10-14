const { CLAIM_STATUSES } = require('../../../constants/publication');
const DIA_MS = 86400000;

// El reloj del estado se reinicia únicamente ante una transición real.
function seguimiento(reclamo, ahora = Date.now()) {
  const inicio = new Date(reclamo.fecha_ultimo_cambio_estado || reclamo.fecha_creacion).getTime();
  const tiempoEstadoMs = Number.isFinite(inicio) ? Math.max(0, Number(ahora) - inicio) : 0;
  return { ...reclamo, tiempoEstadoMs, diasEnEstado: Math.floor(tiempoEstadoMs / DIA_MS),
    demorado: reclamo.estado === CLAIM_STATUSES.PENDIENTE && tiempoEstadoMs >= 5 * DIA_MS };
}

function compararAtencion(a, b) {
  return Number(b.demorado) - Number(a.demorado)
    || Number(b.afectadosCount || 0) - Number(a.afectadosCount || 0)
    || b.tiempoEstadoMs - a.tiempoEstadoMs || Number(a.id) - Number(b.id);
}

module.exports = { seguimiento, compararAtencion };
