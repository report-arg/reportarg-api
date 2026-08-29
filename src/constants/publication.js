const CLAIM_STATUSES = Object.freeze({
  RECIBIDO: 'recibido',
  EN_PROCESO: 'en_proceso',
  RESUELTO: 'resuelto',
  RECHAZADO: 'rechazado',
});

const COMMUNICATION_STATUSES = Object.freeze({
  PUBLICADO: 'publicado',
  BORRADOR: 'borrador',
});

const CATEGORY_TYPES = Object.freeze({
  RECLAMO: 'reclamo',
  COMUNICADO: 'comunicado',
  AMBOS: 'ambos',
});

module.exports = {
  CLAIM_STATUSES,
  COMMUNICATION_STATUSES,
  CATEGORY_TYPES,
};
