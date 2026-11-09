// Los gateways traducen entidad <-> fila sin saber de TypeORM: se prueban con almacenes en memoria.
import { Reserva } from '../../entities/Reserva';
import { Turno } from '../../entities/Turno';
import { Estudiante } from '../../entities/Estudiante';
import { Asistencia } from '../../entities/Asistencia';
import {
  AlmacenAsistencias, AlmacenEstudiantes, AlmacenReservas, FilaAsistencia, FilaEstudiante, FilaReserva,
} from './almacenes';
import { ReservaGateway } from './reserva.gateway';
import { EstudianteGateway } from './estudiante.gateway';
import { AsistenciaGateway } from './asistencia.gateway';

class ReservasEnMemoria extends AlmacenReservas {
  filas: FilaReserva[] = [];
  async porId(id: string) { return this.filas.find(f => f.id === id) ?? null; }
  async porEstudiante(e: string) { return this.filas.filter(f => f.estudianteId === e); }
  async guardar(f: FilaReserva) { this.filas.push(f); }
  async todas() { return this.filas; }
}

describe('ReservaGateway', () => {
  it('guarda la fecha como día AAAA-MM-DD y sin createdAt (lo pone la base)', async () => {
    const almacen = new ReservasEnMemoria();
    await new ReservaGateway(almacen).save(
      new Reserva('r1', 'e1', 'm1', 'p1', new Date('2026-11-09T00:00:00Z'), Turno.ALMUERZO, 'confirmada', 'qr'));
    expect(almacen.filas[0]).toEqual({
      id: 'r1', estudianteId: 'e1', menuId: 'm1', platoId: 'p1', fecha: '2026-11-09', turno: 'ALMUERZO', estado: 'confirmada', qrCode: 'qr',
    });
    expect(Object.keys(almacen.filas[0])).not.toContain('createdAt');
  });

  it('reconstruye la entidad desde la fila (fecha como texto del driver)', async () => {
    const almacen = new ReservasEnMemoria();
    const creada = new Date('2026-11-01T10:00:00Z');
    almacen.filas.push({ id: 'r1', estudianteId: 'e1', menuId: 'm1', platoId: 'p1', fecha: '2026-11-09', turno: 'CENA', estado: 'pendiente', qrCode: null, createdAt: creada });
    const r = await new ReservaGateway(almacen).findById('r1');
    expect(r).toBeInstanceOf(Reserva);
    expect(r.fecha.toISOString()).toBe('2026-11-09T00:00:00.000Z');
    expect(r.turno).toBe(Turno.CENA);
    expect(r.createdAt).toBe(creada);
    expect(await new ReservaGateway(almacen).findById('x')).toBeNull();
  });
});

describe('EstudianteGateway', () => {
  it('ida y vuelta entidad <-> fila', async () => {
    const filas: FilaEstudiante[] = [];
    const almacen = new (class extends AlmacenEstudiantes {
      async porId(id: string) { return filas.find(f => f.id === id) ?? null; }
      async porRegistro(r: string) { return filas.find(f => f.registroUniv === r) ?? null; }
      async guardar(f: FilaEstudiante) { filas.push(f); }
      async todos() { return filas; }
    })();
    const g = new EstudianteGateway(almacen);
    await g.save(new Estudiante('e1', '220001', 'Ana', 'a@x'));
    expect(filas[0]).toEqual({ id: 'e1', registroUniv: '220001', nombre: 'Ana', email: 'a@x', telefono: undefined });
    expect(await g.findByRegistro('220001')).toBeInstanceOf(Estudiante);
    expect((await g.listar()).map(e => e.nombre)).toEqual(['Ana']);
  });
});

describe('AsistenciaGateway', () => {
  it('convierte a número las coordenadas y a Date las fechas que llegan del driver', async () => {
    const fila: FilaAsistencia = { id: 'a1', usuario: 'u', rol: 'r', tipo: 'entrada', lat: '-17.8', lon: '-63.1', distanciaM: 5,
      dentro: true, simulada: false, marcadaEn: '2026-11-09T12:00:00Z', registradaEn: '2026-11-09T12:00:01Z' };
    const almacen = new (class extends AlmacenAsistencias {
      async guardar() {}
      async ultimaDe() { return fila; }
      async listarDe() { return [fila]; }
      async todas(limite: number) { return limite === 5000 ? [fila] : []; }
    })();
    const g = new AsistenciaGateway(almacen);
    const a = await g.ultimaDe('u');
    expect(a).toBeInstanceOf(Asistencia);
    expect(a.lat).toBe(-17.8);
    expect(a.marcadaEn).toBeInstanceOf(Date);
    expect(await g.listarTodas()).toHaveLength(1);
  });
});
