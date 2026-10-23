const { getPeriodo, calculateReport } = require('../../src/modules/informes/services/informeService');

const NOW = new Date('2026-10-21T15:00:00.000Z'); // 12:00 en Argentina

describe('SCRUM-259 - informe institucional de gestión', () => {
  test('usa este mes por defecto en America/Argentina/Buenos_Aires', () => {
    const periodo = getPeriodo({}, NOW);
    expect(periodo).toMatchObject({ periodo: 'este_mes', desde: '2026-10-01', hasta: '2026-10-31' });
  });

  test('calcula KPIs con el estado actual, excluye cancelados y reutiliza la demora', () => {
    const report = calculateReport([
      { id: 1, titulo: 'Resuelto', estado: 'Resuelto', categoriaNombre: 'Calles', afectadosCount: 3, fecha_creacion: '2026-10-01T03:00:00.000Z', fecha_resolucion: '2026-10-03T03:00:00.000Z', fecha_ultimo_cambio_estado: '2026-10-03T03:00:00.000Z' },
      { id: 2, titulo: 'Demorado', estado: 'Pendiente', categoriaNombre: 'Luminaria', afectadosCount: 7, fecha_creacion: '2026-10-02T03:00:00.000Z', fecha_ultimo_cambio_estado: '2026-10-02T03:00:00.000Z' },
      { id: 3, titulo: 'Cancelado', estado: 'Cancelado', categoriaNombre: 'Calles', afectadosCount: 1, fecha_creacion: '2026-10-04T03:00:00.000Z', fecha_ultimo_cambio_estado: '2026-10-04T03:00:00.000Z' },
    ], { periodo: 'este_mes', label: 'Este mes', desde: '2026-10-01', hasta: '2026-10-31' }, NOW.getTime());
    expect(report.kpis).toMatchObject({ recibidos: 3, resueltos: 1, demorados: 1, tiempoPromedioResolucionDias: 2 });
    expect(report.kpis.porcentajeResolucion).toBe(50);
    expect(report.porEstado).toEqual(expect.arrayContaining([{ nombre: 'Resuelto', cantidad: 1 }]));
    expect(report.porDia).toEqual(expect.arrayContaining([{ fecha: '2026-10-01', etiqueta: '01/10', recibidos: 1 }]));
    expect(report.mayorImpacto[0]).toMatchObject({ id: 2, afectadosCount: 7 });
  });

  test('representa ausencia de datos sin dividir por cero', () => {
    const report = calculateReport([], { periodo: 'este_mes', label: 'Este mes', desde: '2026-10-01', hasta: '2026-10-31' }, NOW.getTime());
    expect(report.kpis.porcentajeResolucion).toBeNull();
    expect(report.kpis.tiempoPromedioResolucionDias).toBeNull();
  });
});
