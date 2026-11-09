// Los casos de uso funcionan solos: con repositorios en memoria, sin Nest ni base de datos.
import { Beca } from '../entities/Beca';
import { Estudiante } from '../entities/Estudiante';
import { Reserva } from '../entities/Reserva';
import { Turno } from '../entities/Turno';
import { NoEncontradoError } from '../entities/errores';
import { BecaRepo, EstudianteRepo, EventBusPort, ReservaRepo } from './ports';
import { ResolverEstudianteUseCase } from './ResolverEstudiante';
import { ReservarRacionUseCase } from './ReservarRacion';
import { ConsultarBecaUseCase } from './ConsultarBeca';
import { AsignarBecaUseCase, CrearEstudianteUseCase } from './GestionarEstudiantes';
import { ListarReservasAnaliticasUseCase } from './ConsultasAnaliticas';
import { ListarReservasEstudianteUseCase, ObtenerReservaUseCase } from './ConsultasReserva';
import { ReglaDeNegocioError } from '../entities/errores';

class EstudiantesEnMemoria extends EstudianteRepo {
  datos: Estudiante[] = [];
  async findById(id: string) { return this.datos.find(e => e.id === id) ?? null; }
  async findByRegistro(r: string) { return this.datos.find(e => e.registroUniv === r) ?? null; }
  async save(e: Estudiante) { this.datos = this.datos.filter(x => x.id !== e.id).concat(e); return e; }
  async listar() { return this.datos; }
}
class BecasEnMemoria extends BecaRepo {
  datos: Beca[] = [];
  async findActivaByEstudiante(id: string) { return this.datos.find(b => b.estudianteId === id && b.estaVigente()) ?? null; }
  async save(b: Beca) { this.datos.push(b); return b; }
  async listarTodas() { return this.datos; }
}
class ReservasEnMemoria extends ReservaRepo {
  datos: Reserva[] = [];
  async save(r: Reserva) { this.datos = this.datos.filter(x => x.id !== r.id).concat(r); return r; }
  async findById(id: string) { return this.datos.find(r => r.id === id) ?? null; }
  async findByEstudiante(id: string) { return this.datos.filter(r => r.estudianteId === id); }
  async listarTodas() { return this.datos; }
}
class BusEspia extends EventBusPort {
  eventos: any[] = [];
  async publish(_t: string, p: any) { this.eventos.push(p); }
}

const armar = () => {
  const estudiantes = new EstudiantesEnMemoria(), becas = new BecasEnMemoria(), reservas = new ReservasEnMemoria(), bus = new BusEspia();
  const resolver = new ResolverEstudianteUseCase(estudiantes);
  return { estudiantes, becas, reservas, bus, resolver, reservar: new ReservarRacionUseCase(estudiantes, reservas, bus, resolver, becas) };
};
const pedido = (estudianteId: string, fecha = '2026-11-09') => ({ estudianteId, menuId: 'm1', platoId: 'p1', fecha, turno: Turno.ALMUERZO });

describe('ReservarRacion', () => {
  it('registra en el padrón a quien reserva por primera vez y publica el evento', async () => {
    const { reservar, estudiantes, bus } = armar();
    const r = await reservar.execute(pedido('juan.perez'));
    expect(r.estado).toBe('pendiente');
    expect((await estudiantes.findByRegistro('juan.perez'))?.email).toBe('juan.perez@uagrm.edu.bo');
    expect(bus.eventos.map(e => e.type)).toEqual(['ReservaCreadaEvent']);
  });

  it('con beca activa solo se reserva una ración por día; cancelarla libera el día', async () => {
    const { reservar, estudiantes, becas, reservas } = armar();
    const e = await estudiantes.save(new Estudiante('11111111-1111-4111-8111-111111111111', 'becaria', 'Becaria', 'b@uagrm.edu.bo'));
    await becas.save(new Beca('b1', e.id, 'completa', 60, 0, new Date(Date.now() - 1e9), new Date(Date.now() + 1e9)));
    const primera = await reservar.execute(pedido('becaria'));
    await expect(reservar.execute(pedido('becaria'))).rejects.toBeInstanceOf(ReglaDeNegocioError);
    await expect(reservar.execute(pedido('becaria'))).rejects.toThrow('Con beca solo puedes reservar una ración por día');
    await expect(reservar.execute(pedido('becaria', '2026-11-10'))).resolves.toBeDefined();   // otro día sí
    primera.cancelar();
    await reservas.save(primera);
    await expect(reservar.execute(pedido('becaria'))).resolves.toBeDefined();                // cancelada: el día vuelve a estar libre
  });

  it('una beca vencida no limita: se comporta como quien paga', async () => {
    const { reservar, estudiantes, becas } = armar();
    const e = await estudiantes.save(new Estudiante('22222222-2222-4222-8222-222222222222', 'exbecario', 'Ex', 'x@uagrm.edu.bo'));
    await becas.save(new Beca('b2', e.id, 'media', 40, 0, new Date(Date.now() - 2e9), new Date(Date.now() - 1e9)));
    await reservar.execute(pedido('exbecario'));
    await expect(reservar.execute(pedido('exbecario'))).resolves.toBeDefined();
  });

  it('Mis reservas: lista las del estudiante (la más reciente primero) y una reserva se consulta por id', async () => {
    const { reservar, reservas, resolver } = armar();
    const a = await reservar.execute(pedido('carla', '2026-11-09'));
    const b = await reservar.execute(pedido('carla', '2026-11-12'));
    await reservar.execute(pedido('otra', '2026-11-10'));
    const lista = await new ListarReservasEstudianteUseCase(reservas, resolver).execute('carla');
    expect(lista.map(r => r.id)).toEqual([b.id, a.id]);
    expect(lista[0]).toMatchObject({ fecha: '2026-11-12', estado: 'pendiente', qr: null });
    expect(await new ListarReservasEstudianteUseCase(reservas, resolver).execute('nadie')).toEqual([]);
    expect(await new ObtenerReservaUseCase(reservas).execute(a.id)).toMatchObject({ id: a.id, platoId: 'p1', turno: 'ALMUERZO' });
    await expect(new ObtenerReservaUseCase(reservas).execute('no-existe')).rejects.toBeInstanceOf(NoEncontradoError);
  });

  it('un estudiante puede reservar más de una ración el mismo día', async () => {
    const { reservar, reservas } = armar();
    const a = await reservar.execute(pedido('ana'));
    const b = await reservar.execute(pedido('ana'));
    const c = await reservar.execute(pedido('ana', '2026-11-10'));
    expect(new Set([a.id, b.id, c.id]).size).toBe(3);
    expect((await reservas.findByEstudiante(a.estudianteId)).length).toBe(3);
  });

  it('un UUID que no existe es un error, no se inventa un estudiante', async () => {
    const { reservar } = armar();
    await expect(reservar.execute(pedido('0b1c2d3e-0000-4000-8000-000000000000'))).rejects.toThrow('Estudiante no existe');
  });

  it('rechaza fechas inválidas', async () => {
    const { reservar } = armar();
    await expect(reservar.execute(pedido('ana', 'mañana'))).rejects.toThrow('fecha inválida');
  });
});

describe('Estudiantes y becas', () => {
  it('crear es idempotente por matrícula', async () => {
    const { estudiantes } = armar();
    const crear = new CrearEstudianteUseCase(estudiantes);
    const a = await crear.execute({ registroUniv: '220001', nombre: 'Ana', email: 'a@x' });
    const b = await crear.execute({ registroUniv: '220001', nombre: 'Otro', email: 'o@x' });
    expect(b.id).toBe(a.id);
    expect(estudiantes.datos).toHaveLength(1);
  });

  it('la beca toma el cupo según su tipo y se consulta por matrícula o por ID', async () => {
    const { estudiantes, becas, resolver } = armar();
    const est = await new CrearEstudianteUseCase(estudiantes).execute({ registroUniv: '220001', nombre: 'Ana', email: 'a@x' });
    const beca = await new AsignarBecaUseCase(becas, resolver).execute('220001', { tipo: 'media' });
    expect(beca.cupoRacionesMes).toBe(30);
    const consultar = new ConsultarBecaUseCase(becas, resolver);
    expect(await consultar.execute('220001')).toMatchObject({ tieneBeca: true, tipo: 'media', cubreHoy: true });
    expect(await consultar.execute(est.id)).toMatchObject({ tieneBeca: true });
    expect(await consultar.execute('desconocido')).toEqual({ tieneBeca: false });
  });

  it('asignar beca a alguien que no existe es un error de "no encontrado"', async () => {
    const { becas, resolver } = armar();
    await expect(new AsignarBecaUseCase(becas, resolver).execute('nadie', { tipo: 'completa' })).rejects.toBeInstanceOf(NoEncontradoError);
  });
});

describe('Consultas para reportes', () => {
  it('une cada reserva con los datos del estudiante', async () => {
    const { reservar, estudiantes, reservas } = armar();
    await new CrearEstudianteUseCase(estudiantes).execute({ registroUniv: '220001', nombre: 'Ana Rojas', email: 'a@x' });
    await reservar.execute(pedido('220001'));
    const filas = await new ListarReservasAnaliticasUseCase(reservas, estudiantes).execute();
    expect(filas).toHaveLength(1);
    expect(filas[0]).toMatchObject({ fecha: '2026-11-09', turno: 'ALMUERZO', plato: 'p1', matricula: '220001', estudiante: 'Ana Rojas' });
  });
});
