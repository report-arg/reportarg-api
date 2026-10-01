const { CLAIM_STATUSES } = require('../../../constants/publication');

function filtrosReclamo(query) {
  const { estado, categoria, orderBy } = query;
  if (estado !== undefined && !Object.values(CLAIM_STATUSES).includes(estado)) {
    throw Object.assign(new Error('Filtro de estado inválido'), { status: 400 });
  }
  if (categoria !== undefined && (typeof categoria !== 'string' || !/^[1-9]\d*$/.test(categoria) || !Number.isSafeInteger(Number(categoria)))) {
    throw Object.assign(new Error('Filtro de categoría inválido'), { status: 400 });
  }
  if (orderBy !== undefined && !['recientes', 'antiguos', 'impacto', 'atencion'].includes(orderBy)) {
    throw Object.assign(new Error('Ordenamiento inválido'), { status: 400 });
  }
  return { estado: estado || null, categoria: categoria ? Number(categoria) : null, orderBy: orderBy || 'recientes' };
}

module.exports = { filtrosReclamo };
