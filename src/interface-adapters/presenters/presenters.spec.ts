// Los presentadores no deben cambiar NI UNA coma de lo que reciben el orquestador, los frontends y n8n:
// se compara el JSON exacto (con el orden de las claves) contra lo que se respondía antes, cuando salían las entidades.
import { Estudiante } from '../../entities/Estudiante';
import { Beca } from '../../entities/Beca';
import { Reserva } from '../../entities/Reserva';
import { Asistencia } from '../../entities/Asistencia';
import { Turno } from '../../entities/Turno';
import { asistenciaSalida, becaSalida, estudianteSalida, reservaSalida } from '../../use-cases/salidas';
import { presentarEstudiante, presentarEstudiantes } from './estudiante.presenter';
import { presentarBecaAsignada, presentarConsultaBeca, presentarConsultaBecaGraphql } from './beca.presenter';
import {
  presentarReserva, presentarReservaCancelada, presentarReservaConfirmada, presentarReservaCreada, presentarValidacionQr,
} from './reserva.presenter';
import { presentarEstadoAsistencia, presentarLugar, presentarMarca } from './asistencia.presenter';
import { presentarAsistenciaAnalitica, presentarBecasAnaliticas, presentarReservasAnaliticas } from './analitica.presenter';

const json = (v: unknown) => JSON.stringify(v);
const desde = new Date('2026-01-01T00:00:00.000Z');
const hasta = new Date('2027-01-01T00:00:00.000Z');

describe('Presentador de estudiantes', () => {
  it('igual que serializar la entidad: con teléfono, sin teléfono (undefined) y con teléfono null de la base', () => {
    for (const tel of ['70000000', undefined, null]) {
      const e = new Estudiante('e1', '220001', 'Ana', 'a@x', tel as any);
      expect(json(presentarEstudiante(estudianteSalida(e)))).toBe(json(e));
      expect(json(presentarEstudiantes([estudianteSalida(e)]))).toBe(json([e]));
    }
  });

  it('un estudiante que no existe sigue siendo null', () => {
    expect(presentarEstudiante(null)).toBeNull();
  });
});

describe('Presentador de becas', () => {
  const beca = new Beca('b1', 'e1', 'media', 30, 2, desde, hasta);

  it('POST /estudiantes/:id/beca responde { ok, beca } con la beca serializada como antes', () => {
    expect(json(presentarBecaAsignada(becaSalida(beca)))).toBe(json({ ok: true, beca }));
  });

  it('la consulta REST/MCP conserva claves y orden; sin beca solo { tieneBeca: false }', () => {
    const consulta = {
      tieneBeca: true, tipo: beca.tipo, cupoRacionesMes: 30, racionesUsadasMes: 2, cubreHoy: true,
      vigenteDesde: desde, vigenteHasta: hasta,
    };
    expect(json(presentarConsultaBeca({ ...consulta }))).toBe(json(consulta));
    expect(presentarConsultaBeca({ tieneBeca: false })).toEqual({ tieneBeca: false });
    expect(Object.keys(presentarConsultaBeca({ tieneBeca: false }))).toEqual(['tieneBeca']);
  });

  it('la consulta GraphQL lleva las fechas como texto ISO', () => {
    expect(presentarConsultaBecaGraphql({ tieneBeca: true, tipo: 'media', vigenteDesde: desde, vigenteHasta: hasta }))
      .toEqual({ tieneBeca: true, tipo: 'media', vigenteDesde: desde.toISOString(), vigenteHasta: hasta.toISOString() });
    expect(presentarConsultaBecaGraphql({ tieneBeca: false })).toEqual({ tieneBeca: false, vigenteDesde: undefined, vigenteHasta: undefined });
  });
});

describe('Presentador de reservas', () => {
  const r = new Reserva('r1', 'e1', 'm1', 'p1', new Date('2026-11-09T00:00:00Z'), Turno.ALMUERZO, 'pendiente');

  it('reserva creada: solo id y estado', () => {
    expect(json(presentarReservaCreada(reservaSalida(r)))).toBe(json({ id: 'r1', estado: 'pendiente' }));
  });

  it('reserva plana, confirmada y cancelada', () => {
    const plana = { id: 'r1', estudianteId: 'e1', menuId: 'm1', platoId: 'p1', fecha: '2026-11-09', turno: Turno.ALMUERZO,
      estado: 'pendiente' as const, qr: null, creada: desde };
    expect(json(presentarReserva(plana))).toBe(json(plana));
    expect(json(presentarReservaConfirmada({ reservaId: 'r1', qr: 'q' }))).toBe(json({ reservaId: 'r1', qr: 'q' }));
    expect(json(presentarReservaCancelada('r1'))).toBe(json({ ok: true, reservaId: 'r1' }));
  });

  it('validación de QR: solo los campos que aplican', () => {
    expect(Object.keys(presentarValidacionQr({ ok: true, reservaId: 'r1' }))).toEqual(['ok', 'reservaId']);
    expect(Object.keys(presentarValidacionQr({ ok: false, motivo: 'QR inválido' }))).toEqual(['ok', 'motivo']);
  });
});

describe('Presentador de asistencia', () => {
  const a = new Asistencia('a1', 'caja', 'servicio_caja', 'entrada', -17.8, -63.1, 4000, false, false, desde, hasta);

  it('POST /asistencia/marcar: revisar es la marca sospechosa', () => {
    expect(json(presentarMarca(asistenciaSalida(a)))).toBe(json({
      id: a.id, tipo: a.tipo, marcadaEn: a.marcadaEn, distanciaM: a.distanciaM,
      dentro: a.dentro, simulada: a.simulada, revisar: a.sospechosa,
    }));
  });

  it('estado de asistencia y lugar del comedor', () => {
    const estado = { usuario: 'caja', presente: true, desde, marcas: [
      { id: 'a1', tipo: 'entrada' as const, marcadaEn: desde, distanciaM: 4000, dentro: false, simulada: false }] };
    expect(json(presentarEstadoAsistencia(estado))).toBe(json(estado));
    expect(json(presentarLugar({ lat: 1, lon: 2, radioM: 3 }))).toBe(json({ lat: 1, lon: 2, radioM: 3 }));
  });
});

describe('Presentador de analítica', () => {
  it('copia las filas con las mismas columnas y en el mismo orden', () => {
    const reserva = { id: 'r1', fecha: '2026-11-09', turno: Turno.CENA, plato: 'p1', estado: 'consumida' as const,
      creada: desde, matricula: null, estudiante: null, menuId: 'm1' };
    const beca = { id: 'b1', matricula: '220001', estudiante: 'Ana', tipo: 'completa' as const, cupoMensual: 60, usadas: 1, desde, hasta };
    const marca = { id: 'a1', fecha: '2026-11-09', hora: '12:00', usuario: 'caja', rol: 'r', tipo: 'Entrada' as const,
      distancia: 5, ubicacion: 'En el comedor' as const, revisar: 'No' as const };
    expect(json(presentarReservasAnaliticas([reserva]))).toBe(json([reserva]));
    expect(json(presentarBecasAnaliticas([beca]))).toBe(json([beca]));
    expect(json(presentarAsistenciaAnalitica([marca]))).toBe(json([marca]));
  });
});
