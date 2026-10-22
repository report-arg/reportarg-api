const { CLAIM_STATUSES } = require('../../../constants/publication');
const { seguimiento } = require('../../reclamos/services/reclamoTrackingService');

const TIME_ZONE = 'America/Argentina/Buenos_Aires';
const DAY_MS = 24 * 60 * 60 * 1000;

function localDateParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  return Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, Number(part.value)]));
}

function argentinaStart(year, month, day) {
  // Argentina does not currently observe DST; this represents midnight in the required zone.
  return new Date(Date.UTC(year, month - 1, day, 3, 0, 0, 0));
}

function parseDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
  const [year, month, day] = value.split('-').map(Number);
  const result = argentinaStart(year, month, day);
  return result.getUTCFullYear() === year && result.getUTCMonth() === month - 1 && result.getUTCDate() === day ? result : null;
}

function formatDate(date) {
  const parts = localDateParts(date);
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

function getPeriodo({ periodo = 'este_mes', desde, hasta }, now = new Date()) {
  const today = localDateParts(now);
  let start;
  let end;
  let label;

  if (periodo === 'personalizado') {
    start = parseDate(desde);
    const endDay = parseDate(hasta);
    if (!start || !endDay || endDay < start) {
      const error = new Error('El período personalizado debe incluir fechas válidas y ordenadas.');
      error.status = 400;
      throw error;
    }
    end = new Date(endDay.getTime() + DAY_MS);
    label = `${desde} a ${hasta}`;
  } else if (periodo === 'mes_anterior') {
    const previousMonth = today.month === 1 ? 12 : today.month - 1;
    const previousYear = today.month === 1 ? today.year - 1 : today.year;
    start = argentinaStart(previousYear, previousMonth, 1);
    end = argentinaStart(today.year, today.month, 1);
    label = 'Mes anterior';
  } else if (periodo === 'ultimos_30_dias') {
    end = argentinaStart(today.year, today.month, today.day + 1);
    start = new Date(end.getTime() - 30 * DAY_MS);
    label = 'Últimos 30 días';
  } else if (periodo === 'este_mes') {
    start = argentinaStart(today.year, today.month, 1);
    end = argentinaStart(today.year, today.month + 1, 1);
    label = 'Este mes';
  } else {
    const error = new Error('Período no válido.');
    error.status = 400;
    throw error;
  }
  return { periodo, label, desde: formatDate(start), hasta: formatDate(new Date(end.getTime() - DAY_MS)), start, end };
}

function distribution(items, key, fallback) {
  const counts = new Map();
  items.forEach((item) => {
    const value = item[key] || fallback;
    counts.set(value, (counts.get(value) || 0) + 1);
  });
  return [...counts.entries()].map(([nombre, cantidad]) => ({ nombre, cantidad })).sort((a, b) => b.cantidad - a.cantidad || a.nombre.localeCompare(b.nombre));
}

function dailySeries(items) {
  const values = new Map();
  items.forEach((item) => {
    const fecha = new Date(item.fecha_creacion);
    if (Number.isNaN(fecha.getTime())) return;
    const key = formatDate(fecha);
    values.set(key, (values.get(key) || 0) + 1);
  });
  return [...values.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([fecha, recibidos]) => ({ fecha, etiqueta: fecha.slice(8, 10) + '/' + fecha.slice(5, 7), recibidos }));
}

function calculateReport(reclamos, periodo, now = Date.now()) {
  const conSeguimiento = reclamos.map((reclamo) => seguimiento(reclamo, now));
  const resueltos = conSeguimiento.filter((reclamo) => reclamo.estado === CLAIM_STATUSES.RESUELTO);
  const computables = conSeguimiento.filter((reclamo) => reclamo.estado !== CLAIM_STATUSES.CANCELADO);
  const tiempos = resueltos
    .map((reclamo) => new Date(reclamo.fecha_resolucion).getTime() - new Date(reclamo.fecha_creacion).getTime())
    .filter((duration) => Number.isFinite(duration) && duration >= 0);
  const promedioDias = tiempos.length ? tiempos.reduce((sum, duration) => sum + duration, 0) / tiempos.length / DAY_MS : null;

  return {
    periodo: { tipo: periodo.periodo, etiqueta: periodo.label, desde: periodo.desde, hasta: periodo.hasta },
    kpis: {
      recibidos: conSeguimiento.length,
      resueltos: resueltos.length,
      porcentajeResolucion: computables.length ? (resueltos.length / computables.length) * 100 : null,
      tiempoPromedioResolucionDias: promedioDias,
      demorados: conSeguimiento.filter((reclamo) => reclamo.demorado).length,
    },
    porEstado: distribution(conSeguimiento, 'estado', 'Sin estado'),
    porCategoria: distribution(conSeguimiento, 'categoriaNombre', 'Sin categoría'),
    porDia: dailySeries(conSeguimiento),
    mayorImpacto: [...conSeguimiento]
      .sort((a, b) => Number(b.afectadosCount || 0) - Number(a.afectadosCount || 0) || new Date(b.fecha_creacion) - new Date(a.fecha_creacion))
      .slice(0, 5)
      .map(({ id, titulo, estado, categoriaNombre, afectadosCount, fecha_creacion }) => ({ id, titulo, estado, categoriaNombre, afectadosCount: Number(afectadosCount || 0), fecha_creacion })),
  };
}

async function consultarInforme(idInstitucion, query, now = new Date()) {
  const periodo = getPeriodo(query, now);
  // Carga diferida: mantiene las reglas de cálculo testeables sin abrir una conexión a DB.
  const InformeModel = require('../models/informeModel');
  const reclamos = await InformeModel.getCohorteInstitucion(idInstitucion, periodo.start, periodo.end);
  return calculateReport(reclamos, periodo, now.getTime());
}

module.exports = { TIME_ZONE, getPeriodo, calculateReport, consultarInforme };
