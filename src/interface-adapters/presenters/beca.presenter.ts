import { BecaSalida, ConsultaBecaSalida } from '../../use-cases/salidas';

/** Consulta de beca para REST y MCP: sin beca solo `{ tieneBeca: false }`; las fechas viajan como Date (JSON las hace ISO). */
export function presentarConsultaBeca(c: ConsultaBecaSalida) {
  if (!c.tieneBeca) return { tieneBeca: false };
  return {
    tieneBeca: true,
    tipo: c.tipo,
    cupoRacionesMes: c.cupoRacionesMes,
    racionesUsadasMes: c.racionesUsadasMes,
    cubreHoy: c.cubreHoy,
    vigenteDesde: c.vigenteDesde,
    vigenteHasta: c.vigenteHasta,
  };
}

const texto = (v: unknown) => (v instanceof Date ? v.toISOString() : (v as string | undefined));

/** Consulta de beca para GraphQL (`type Beca`): las fechas como texto ISO. */
export function presentarConsultaBecaGraphql(c: ConsultaBecaSalida) {
  return { ...c, vigenteDesde: texto(c.vigenteDesde), vigenteHasta: texto(c.vigenteHasta) };
}

/** Respuesta REST de POST /estudiantes/:id/beca. */
export function presentarBecaAsignada(b: BecaSalida) {
  return {
    ok: true,
    beca: {
      id: b.id, estudianteId: b.estudianteId, tipo: b.tipo, cupoRacionesMes: b.cupoRacionesMes,
      racionesUsadasMes: b.racionesUsadasMes, vigenteDesde: b.vigenteDesde, vigenteHasta: b.vigenteHasta,
    },
  };
}
