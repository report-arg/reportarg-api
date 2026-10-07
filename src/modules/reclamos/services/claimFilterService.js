const { CLAIM_STATUSES } = require('../../../constants/publication');

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
  if (visibilidad !== undefined && !['publico', 'privado'].includes(visibilidad)) {
    throw Object.assign(new Error('Filtro de visibilidad inválido'), { status: 400 });
  }

  return { 
    estado: estado === 'Todos' ? null : (estado || null), 
    categoria: categoria === 'Todas' ? null : (categoria ? Number(categoria) : null), 
    orderBy: orderBy || 'recientes',
    busqueda: busqueda ? String(busqueda).trim() : null,
    visibilidad: visibilidad || null,
    fechaDesde: fechaDesde ? new Date(fechaDesde) : null,
    fechaHasta: fechaHasta ? new Date(fechaHasta) : null,
    demorado: demorado === 'true' || demorado === true,
    pagina: Math.max(1, Number(pagina) || 1),
    limite: Math.min(100, Math.max(1, Number(limite) || 20))
  };
}

module.exports = { filtrosReclamo };
