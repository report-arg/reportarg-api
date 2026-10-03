/**
 * Tests de HU-10: Filtros de Reclamos
 * 
 * Verifica el servicio claimFilterService y la integración
 * de filtros en consultas de bandeja y mis-reclamos.
 * Tests unitarios sin dependencias de base de datos.
 */

const { filtrosReclamo } = require('../../src/modules/reclamos/services/claimFilterService');
const { CLAIM_STATUSES } = require('../../src/constants/publication');

describe('HU-10: Servicio de Filtros de Reclamos (claimFilterService)', () => {

  test('Sin parámetros: devuelve valores por defecto', () => {
    const result = filtrosReclamo({});
    expect(result.estado).toBeNull();
    expect(result.categoria).toBeNull();
    expect(result.orderBy).toBe('recientes');
  });

  test('Filtro por estado válido (Pendiente)', () => {
    const result = filtrosReclamo({ estado: CLAIM_STATUSES.PENDIENTE });
    expect(result.estado).toBe('Pendiente');
  });

  test('Filtro por todos los estados válidos', () => {
    for (const estado of Object.values(CLAIM_STATUSES)) {
      const result = filtrosReclamo({ estado });
      expect(result.estado).toBe(estado);
    }
  });

  test('Estado inválido lanza error 400', () => {
    expect(() => filtrosReclamo({ estado: 'Rechazado' })).toThrow();
    expect(() => filtrosReclamo({ estado: 'recibido' })).toThrow();
    expect(() => filtrosReclamo({ estado: '' })).toThrow();
  });

  test('Estado inválido: el error tiene status 400', () => {
    try {
      filtrosReclamo({ estado: 'EstadoInexistente' });
      fail('Debería haber lanzado error');
    } catch (err) {
      expect(err.status).toBe(400);
    }
  });

  test('Filtro por categoría válida (número positivo como string)', () => {
    const result = filtrosReclamo({ categoria: '3' });
    expect(result.categoria).toBe(3);
  });

  test('Categoría inválida (0) lanza error 400', () => {
    expect(() => filtrosReclamo({ categoria: '0' })).toThrow();
  });

  test('Categoría inválida (negativa) lanza error 400', () => {
    expect(() => filtrosReclamo({ categoria: '-1' })).toThrow();
  });

  test('Categoría inválida (texto) lanza error 400', () => {
    expect(() => filtrosReclamo({ categoria: 'abc' })).toThrow();
  });

  test('Combinación de estado y categoría válidos', () => {
    const result = filtrosReclamo({ estado: 'Pendiente', categoria: '5' });
    expect(result.estado).toBe('Pendiente');
    expect(result.categoria).toBe(5);
  });

  test('Ordenamiento válido: recientes, antiguos, impacto, atencion', () => {
    for (const orderBy of ['recientes', 'antiguos', 'impacto', 'atencion']) {
      const result = filtrosReclamo({ orderBy });
      expect(result.orderBy).toBe(orderBy);
    }
  });

  test('Ordenamiento inválido lanza error 400', () => {
    expect(() => filtrosReclamo({ orderBy: 'random' })).toThrow();
    expect(() => filtrosReclamo({ orderBy: 'DESC' })).toThrow();
  });

  test('Limpiar filtros: sin parámetros retorna nulls y default', () => {
    // Simula la acción de "Limpiar filtros" del frontend
    const result = filtrosReclamo({});
    expect(result.estado).toBeNull();
    expect(result.categoria).toBeNull();
    expect(result.orderBy).toBe('recientes');
  });

});
