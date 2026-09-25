const CLAIM_STATUSES = Object.freeze({
  PENDIENTE: 'Pendiente',
  EN_REVISION: 'En revisión',
  EN_PROCESO: 'En proceso',
  RESUELTO: 'Resuelto',
  CANCELADO: 'Cancelado',
});

const CLAIM_VISIBILITY = Object.freeze({
  PUBLICO: 'publico',
  PRIVADO: 'privado',
});

const HISTORIAL_EVENTS = Object.freeze({
  CREACION: 'CREACION',
  EDICION: 'EDICION',
  CAMBIO_ESTADO: 'CAMBIO_ESTADO',
  CANCELACION: 'CANCELACION',
  RESOLUCION: 'RESOLUCION',
  REAPERTURA: 'REAPERTURA',
  REASIGNACION: 'REASIGNACION',
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
  CLAIM_VISIBILITY,
  HISTORIAL_EVENTS,
  COMMUNICATION_STATUSES,
  CATEGORY_TYPES,
};

