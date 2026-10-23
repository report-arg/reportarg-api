const { CLAIM_STATUSES } = require('../../../constants/publication');

function parseFechaArgentina(value, field) {
  if (!value) return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw Object.assign(new Error(`Filtro ${field} invalido`), { status: 400 });
  }
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 3));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw Object.assign(new Error(`Filtro ${field} invalido`), { status: 400 });
  }
  return date;
}

function filtrosReclamo(query) {
  const { 
    estado, 
    categoria, 
    orderBy,
    busqueda,
    visibilidad,
    fechaDesde,
    fechaHasta,
    demorado,
    pagina = 1,
    limite = 20
  } = query;

  if (estado !== undefined && estado !== 'Todos' && !Object.values(CLAIM_STATUSES).includes(estado)) {
    throw Object.assign(new Error('Filtro de estado inválido'), { status: 400 });
  }
  if (categoria !== undefined && categoria !== 'Todas' && (typeof categoria !== 'string' || !/^[1-9]\d*$/.test(categoria) || !Number.isSafeInteger(Number(categoria)))) {
    throw Object.assign(new Error('Filtro de categoría inválido'), { status: 400 });
  }
  if (orderBy !== undefined && !['recientes', 'antiguos', 'impacto', 'atencion'].includes(orderBy)) {
    throw Object.assign(new Error('Ordenamiento inválido'), { status: 400 });
  }
  if (visibilidad !== undefined && visibilidad !== 'Todas' && visibilidad !== '' && !['publico', 'privado'].includes(visibilidad)) {
    throw Object.assign(new Error('Filtro de visibilidad inválido'), { status: 400 });
  }
  if (demorado !== undefined && demorado !== '' && !['true', 'false', '1', '0', true, false].includes(demorado)) {
    throw Object.assign(new Error('Filtro de demorado inválido'), { status: 400 });
  }
  if (pagina !== undefined && pagina !== '' && (!/^\d+$/.test(String(pagina)) || Number(pagina) < 1)) {
    throw Object.assign(new Error('Número de página inválido'), { status: 400 });
  }
  if (limite !== undefined && limite !== '' && (!/^\d+$/.test(String(limite)) || Number(limite) < 1 || Number(limite) > 100)) {
    throw Object.assign(new Error('Límite de paginación inválido'), { status: 400 });
  }

  const parsedFechaDesde = parseFechaArgentina(fechaDesde, 'fechaDesde');
  const parsedFechaHasta = parseFechaArgentina(fechaHasta, 'fechaHasta');
  if (parsedFechaDesde && parsedFechaHasta && parsedFechaDesde > parsedFechaHasta) {
    throw Object.assign(new Error('fechaDesde no puede ser posterior a fechaHasta'), { status: 400 });
  }

  return { 
    estado: estado === 'Todos' ? null : (estado || null), 
    categoria: categoria === 'Todas' ? null : (categoria ? Number(categoria) : null), 
    orderBy: orderBy || 'recientes',
    busqueda: busqueda ? String(busqueda).trim() : null,
    visibilidad: (!visibilidad || visibilidad === 'Todas') ? null : visibilidad,
    fechaDesde: parsedFechaDesde,
    fechaHasta: parsedFechaHasta,
    demorado: demorado === 'true' || demorado === '1' || demorado === true,
    pagina: Math.max(1, Number(pagina) || 1),
    limite: Math.min(100, Math.max(1, Number(limite) || 20))
  };
}

module.exports = { filtrosReclamo };
