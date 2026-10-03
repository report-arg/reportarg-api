/**
 * Tests de HU-19: Seguimiento de tiempos de gestión / Indicador de demora
 * 
 * Verifica que la función seguimiento() calcule correctamente:
 * - dias en estado actual
 * - indicador demorado (solo Pendiente >= 5 días)
 * Tests unitarios con fechas controladas (sin Date.now() real).
 */

const { seguimiento, compararAtencion } = require('../../src/modules/reclamos/services/claimTrackingService');
const { CLAIM_STATUSES } = require('../../src/constants/publication');

const DIA_MS = 86400000;

/**
 * Crea un reclamo mock con fecha calculada a partir de diasAtras.
 */
function reclamoConDias(estado, diasAtras) {
  const fecha = new Date(Date.now() - diasAtras * DIA_MS).toISOString();
  return {
    id_reclamo: 1,
    estado,
    titulo: 'Test',
    fecha_creacion: fecha,
    fecha_ultimo_cambio_estado: fecha,
  };
}

describe('HU-19: Indicador de demora (claimTrackingService)', () => {

  test('Pendiente 0 días → NO demorado', () => {
    const ahora = Date.now();
    const reclamo = reclamoConDias(CLAIM_STATUSES.PENDIENTE, 0);
    const resultado = seguimiento(reclamo, ahora);
    expect(resultado.demorado).toBe(false);
    expect(resultado.diasEnEstado).toBe(0);
  });

  test('Pendiente 4 días → NO demorado (umbral exacto)', () => {
    const ahora = Date.now();
    const fecha = new Date(ahora - 4 * DIA_MS).toISOString();
    const reclamo = { ...reclamoConDias(CLAIM_STATUSES.PENDIENTE, 0), fecha_ultimo_cambio_estado: fecha };
    const resultado = seguimiento(reclamo, ahora);
    expect(resultado.demorado).toBe(false);
  });

  test('Pendiente exactamente 5 días → Demorado', () => {
    const ahora = Date.now();
    // Exactamente 5 días en ms
    const fecha = new Date(ahora - 5 * DIA_MS).toISOString();
    const reclamo = {
      id_reclamo: 1, estado: CLAIM_STATUSES.PENDIENTE, titulo: 'Demorado',
      fecha_creacion: fecha, fecha_ultimo_cambio_estado: fecha,
    };
    const resultado = seguimiento(reclamo, ahora);
    expect(resultado.demorado).toBe(true);
    expect(resultado.diasEnEstado).toBe(5);
  });

  test('Pendiente 10 días → Demorado', () => {
    const ahora = Date.now();
    const reclamo = reclamoConDias(CLAIM_STATUSES.PENDIENTE, 10);
    const resultado = seguimiento(reclamo, ahora);
    expect(resultado.demorado).toBe(true);
    expect(resultado.diasEnEstado).toBe(10);
  });

  test('En revisión 10 días → NO demorado (solo Pendiente se marca)', () => {
    const ahora = Date.now();
    const reclamo = reclamoConDias(CLAIM_STATUSES.EN_REVISION, 10);
    const resultado = seguimiento(reclamo, ahora);
    expect(resultado.demorado).toBe(false);
  });

  test('En proceso 10 días → NO demorado', () => {
    const ahora = Date.now();
    const reclamo = reclamoConDias(CLAIM_STATUSES.EN_PROCESO, 10);
    const resultado = seguimiento(reclamo, ahora);
    expect(resultado.demorado).toBe(false);
  });

  test('Resuelto 100 días → NO demorado', () => {
    const ahora = Date.now();
    const reclamo = reclamoConDias(CLAIM_STATUSES.RESUELTO, 100);
    const resultado = seguimiento(reclamo, ahora);
    expect(resultado.demorado).toBe(false);
  });

  test('Cancelado 100 días → NO demorado', () => {
    const ahora = Date.now();
    const reclamo = reclamoConDias(CLAIM_STATUSES.CANCELADO, 100);
    const resultado = seguimiento(reclamo, ahora);
    expect(resultado.demorado).toBe(false);
  });

  test('El tiempo se calcula desde fecha_ultimo_cambio_estado, no desde creacion', () => {
    const ahora = Date.now();
    // Creado hace 30 días, pero el estado cambió hace 2 días
    const fechaCreacion = new Date(ahora - 30 * DIA_MS).toISOString();
    const fechaCambioEstado = new Date(ahora - 2 * DIA_MS).toISOString();
    const reclamo = {
      id_reclamo: 1,
      estado: CLAIM_STATUSES.PENDIENTE,
      titulo: 'Test',
      fecha_creacion: fechaCreacion,
      fecha_ultimo_cambio_estado: fechaCambioEstado,
    };
    const resultado = seguimiento(reclamo, ahora);
    // 2 días desde el último cambio → NO demorado (umbral es 5)
    expect(resultado.demorado).toBe(false);
    expect(resultado.diasEnEstado).toBe(2);
  });

  test('Seguimiento devuelve tiempoEstadoMs consistente', () => {
    const ahora = Date.now();
    const esperadoMs = 3 * DIA_MS;
    const fecha = new Date(ahora - esperadoMs).toISOString();
    const reclamo = {
      id_reclamo: 1, estado: CLAIM_STATUSES.PENDIENTE, titulo: 'Test',
      fecha_creacion: fecha, fecha_ultimo_cambio_estado: fecha,
    };
    const resultado = seguimiento(reclamo, ahora);
    // La diferencia debe estar dentro de un rango razonable (ms de ejecución)
    expect(resultado.tiempoEstadoMs).toBeGreaterThanOrEqual(esperadoMs - 1000);
    expect(resultado.tiempoEstadoMs).toBeLessThanOrEqual(esperadoMs + 1000);
  });

  test('compararAtencion: demorado tiene prioridad sobre no demorado', () => {
    const ahora = Date.now();
    const demorado = seguimiento(reclamoConDias(CLAIM_STATUSES.PENDIENTE, 10), ahora);
    const noDemorado = seguimiento(reclamoConDias(CLAIM_STATUSES.PENDIENTE, 1), ahora);
    expect(compararAtencion(demorado, noDemorado)).toBeLessThan(0); // demorado primero
  });

  test('compararAtencion: más afectados tienen prioridad entre iguales', () => {
    const ahora = Date.now();
    const base = reclamoConDias(CLAIM_STATUSES.PENDIENTE, 1);
    const masAfectados = { ...seguimiento(base, ahora), afectadosCount: 10 };
    const menosAfectados = { ...seguimiento(base, ahora), afectadosCount: 1 };
    expect(compararAtencion(masAfectados, menosAfectados)).toBeLessThan(0); // más afectados primero
  });

});
