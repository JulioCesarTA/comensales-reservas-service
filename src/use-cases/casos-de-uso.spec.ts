// Los casos de uso funcionan solos: con repositorios en memoria, sin Nest ni base de datos.
import { Beca } from '../entities/Beca';
import { Estudiante } from '../entities/Estudiante';
import { Reserva } from '../entities/Reserva';
import { Turno } from '../entities/Turno';
import { NoEncontradoError } from '../entities/errores';
import { AsistenciaRepo, BecaRepo, EstudianteRepo, EventBusPort, GeneradorIds, ReservaRepo } from './ports';
import { ResolverEstudianteUseCase } from './ResolverEstudiante';
import { ReservarRacionUseCase } from './ReservarRacion';
import { ConsultarBecaUseCase } from './ConsultarBeca';
import { AsignarBecaUseCase, CrearEstudianteUseCase } from './GestionarEstudiantes';
import { ListarReservasAnaliticasUseCase } from './ConsultasAnaliticas';
import { ListarReservasEstudianteUseCase, ObtenerReservaUseCase } from './ConsultasReserva';
import {
  ConsultarAsistenciaUseCase, ConsultarLugarComedorUseCase, GuardarLugarComedorUseCase, ListarAsistenciaAnaliticaUseCase,
  MarcarAsistenciaUseCase,
} from './MarcarAsistencia';
import { LugarComedor, UbicacionComedor } from './ports';
import { PermisoDenegadoError } from '../entities/errores';
import { Asistencia } from '../entities/Asistencia';
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
/** Ids deterministas con forma de UUID (el resolvedor de estudiantes distingue UUID de matrícula). */
class IdsSecuenciales extends GeneradorIds {
  private n = 0;
  nuevo() { return `00000000-0000-4000-8000-${String(++this.n).padStart(12, '0')}`; }
}
class BusEspia extends EventBusPort {
  eventos: any[] = [];
  async publish(_t: string, p: any) { this.eventos.push(p); }
}

const armar = () => {
  const estudiantes = new EstudiantesEnMemoria(), becas = new BecasEnMemoria(), reservas = new ReservasEnMemoria(), bus = new BusEspia();
  const ids = new IdsSecuenciales();
  const resolver = new ResolverEstudianteUseCase(estudiantes);
  return { estudiantes, becas, reservas, bus, resolver, ids, reservar: new ReservarRacionUseCase(estudiantes, reservas, bus, resolver, becas, ids) };
};
const pedido = (estudianteId: string, fecha = '2026-11-09') => ({ estudianteId, menuId: 'm1', platoId: 'p1', fecha, turno: Turno.ALMUERZO });

describe('ReservarRacion', () => {
  it('registra en el padrón a quien reserva por primera vez y publica el evento', async () => {
    const { reservar, estudiantes, bus } = armar();
    const r = await reservar.execute(pedido('juan.perez'));
    expect(r.estado).toBe('pendiente');
    expect(r).not.toBeInstanceOf(Reserva);                       // sale un modelo de datos, no la entidad
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
    const guardada = await reservas.findById(primera.id);
    guardada.cancelar();
    await reservas.save(guardada);
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
    const crear = new CrearEstudianteUseCase(estudiantes, new IdsSecuenciales());
    const a = await crear.execute({ registroUniv: '220001', nombre: 'Ana', email: 'a@x' });
    const b = await crear.execute({ registroUniv: '220001', nombre: 'Otro', email: 'o@x' });
    expect(b.id).toBe(a.id);
    expect(estudiantes.datos).toHaveLength(1);
  });

  it('la beca toma el cupo según su tipo y se consulta por matrícula o por ID', async () => {
    const { estudiantes, becas, resolver } = armar();
    const est = await new CrearEstudianteUseCase(estudiantes, new IdsSecuenciales()).execute({ registroUniv: '220001', nombre: 'Ana', email: 'a@x' });
    const beca = await new AsignarBecaUseCase(becas, resolver, new IdsSecuenciales()).execute('220001', { tipo: 'media' });
    expect(beca.cupoRacionesMes).toBe(30);
    const consultar = new ConsultarBecaUseCase(becas, resolver);
    expect(await consultar.execute('220001')).toMatchObject({ tieneBeca: true, tipo: 'media', cubreHoy: true });
    expect(await consultar.execute(est.id)).toMatchObject({ tieneBeca: true });
    expect(await consultar.execute('desconocido')).toEqual({ tieneBeca: false });
  });

  it('asignar beca a alguien que no existe es un error de "no encontrado"', async () => {
    const { becas, resolver } = armar();
    await expect(new AsignarBecaUseCase(becas, resolver, new IdsSecuenciales()).execute('nadie', { tipo: 'completa' })).rejects.toBeInstanceOf(NoEncontradoError);
  });
});

describe('Consultas para reportes', () => {
  it('une cada reserva con los datos del estudiante', async () => {
    const { reservar, estudiantes, reservas } = armar();
    await new CrearEstudianteUseCase(estudiantes, new IdsSecuenciales()).execute({ registroUniv: '220001', nombre: 'Ana Rojas', email: 'a@x' });
    await reservar.execute(pedido('220001'));
    const filas = await new ListarReservasAnaliticasUseCase(reservas, estudiantes).execute();
    expect(filas).toHaveLength(1);
    expect(filas[0]).toMatchObject({ fecha: '2026-11-09', turno: 'ALMUERZO', plato: 'p1', matricula: '220001', estudiante: 'Ana Rojas' });
  });
});

// ----------------------------- asistencia del personal (GPS) -----------------------------

class AsistenciasEnMemoria extends AsistenciaRepo {
  datos: Asistencia[] = [];
  async save(a: Asistencia) { this.datos.unshift(a); return a; }
  async ultimaDe(u: string) { return this.datos.find(x => x.usuario === u) ?? null; }
  async listarDe(u: string, n: number) { return this.datos.filter(x => x.usuario === u).slice(0, n); }
  async listarTodas() { return this.datos; }
}
class LugarEnMemoria extends UbicacionComedor {
  lugar: LugarComedor = { lat: -17.80497, lon: -63.15052, radioM: 1000, actualizadoPor: null, actualizadoEn: null };
  async obtener() { return { ...this.lugar }; }
  async guardar(l: LugarComedor) { this.lugar = { ...l }; return { ...l }; }
}
const armarAsistencia = () => {
  const repo = new AsistenciasEnMemoria();
  const comedor = new LugarEnMemoria();
  return {
    repo, comedor, marcar: new MarcarAsistenciaUseCase(repo, comedor, new IdsSecuenciales()),
    consultar: new ConsultarAsistenciaUseCase(repo), guardarLugar: new GuardarLugarComedorUseCase(comedor),
  };
};
const enElComedor = { lat: -17.80501, lon: -63.15049 };
const lejos = { lat: -17.7833, lon: -63.1821 };            // ~4 km

describe('MarcarAsistencia', () => {
  it('marca la entrada dentro del comedor y la cuenta como presente', async () => {
    const { marcar, consultar } = armarAsistencia();
    const a = await marcar.execute({ usuario: 'caja.demo', rol: 'servicio_caja', tipo: 'entrada', ...enElComedor });
    expect(a.dentro).toBe(true);
    expect(a.distanciaM).toBeLessThan(50);
    const estado = await consultar.execute('caja.demo');
    expect(estado.presente).toBe(true);
    expect(estado.marcas).toHaveLength(1);
  });

  it('fuera del radio la marca NO se registra y dice a qué distancia está', async () => {
    const { marcar, repo } = armarAsistencia();
    await expect(marcar.execute({ usuario: 'admin.comedor', tipo: 'entrada', ...lejos }))
      .rejects.toThrow(/Estás a \d,\d km del comedor: solo se puede marcar dentro de 1,0 km/);
    expect(repo.datos).toHaveLength(0);
  });

  it('el radio y el lugar que guarda el administrador son los que valen al marcar', async () => {
    const { marcar, guardarLugar } = armarAsistencia();
    await guardarLugar.execute({ usuario: 'admin.comedor', roles: ['administrador'], ...lejos, radioM: 200 });
    const a = await marcar.execute({ usuario: 'caja.demo', tipo: 'entrada', lat: lejos.lat + 0.001, lon: lejos.lon });
    expect(a.distanciaM).toBeLessThan(200);
    await expect(marcar.execute({ usuario: 'otro', tipo: 'entrada', ...enElComedor })).rejects.toThrow('dentro de 200 m');
  });

  it('solo el administrador cambia la ubicación, con datos válidos', async () => {
    const { guardarLugar, comedor } = armarAsistencia();
    await expect(guardarLugar.execute({ usuario: 'caja.demo', roles: ['servicio_caja'], ...lejos }))
      .rejects.toBeInstanceOf(PermisoDenegadoError);
    await expect(guardarLugar.execute({ usuario: 'a', roles: ['administrador'], lat: 120, lon: 0 })).rejects.toThrow('latitud');
    await expect(guardarLugar.execute({ usuario: 'a', roles: ['administrador'], ...lejos, radioM: 10 })).rejects.toThrow('radio');
    const r = await guardarLugar.execute({ usuario: 'admin.comedor', roles: ['administrador'], ...lejos });
    expect(r).toMatchObject({ ...lejos, radioM: 1000, actualizadoPor: 'admin.comedor' });
    expect(comedor.lugar.lat).toBe(lejos.lat);
  });

  it('una ubicación simulada queda señalada aunque esté dentro del radio', async () => {
    const { marcar } = armarAsistencia();
    const a = await marcar.execute({ usuario: 'cocina', tipo: 'entrada', ...enElComedor, simulada: true });
    expect(a.dentro).toBe(true);
    expect(a.sospechosa).toBe(true);
  });

  it('no se marca dos veces seguidas lo mismo', async () => {
    const { marcar } = armarAsistencia();
    await marcar.execute({ usuario: 'caja.demo', tipo: 'entrada', ...enElComedor });
    await expect(marcar.execute({ usuario: 'caja.demo', tipo: 'entrada', ...enElComedor }))
      .rejects.toThrow('marca la salida primero');
    await expect(marcar.execute({ usuario: 'otro', tipo: 'salida', ...enElComedor }))
      .rejects.toThrow('No hay una entrada abierta');
  });

  it('entrada y salida cierran el turno', async () => {
    const { marcar, consultar } = armarAsistencia();
    await marcar.execute({ usuario: 'caja.demo', tipo: 'entrada', ...enElComedor });
    await marcar.execute({ usuario: 'caja.demo', tipo: 'salida', ...enElComedor });
    const estado = await consultar.execute('caja.demo');
    expect(estado.presente).toBe(false);
    expect(estado.marcas.map(m => m.tipo)).toEqual(['salida', 'entrada']);
  });

  it('rechaza datos inválidos', async () => {
    const { marcar } = armarAsistencia();
    await expect(marcar.execute({ usuario: '', tipo: 'entrada', ...enElComedor })).rejects.toThrow('usuario');
    await expect(marcar.execute({ usuario: 'x', tipo: 'otra' as any, ...enElComedor })).rejects.toThrow('entrada');
    await expect(marcar.execute({ usuario: 'x', tipo: 'entrada', lat: 999, lon: 0 })).rejects.toThrow('ubicación');
  });

  it('el lugar del comedor sale como datos planos', async () => {
    expect(await new ConsultarLugarComedorUseCase(new LugarEnMemoria()).execute())
      .toEqual({ lat: -17.80497, lon: -63.15052, radioM: 1000, actualizadoPor: null, actualizadoEn: null });
  });

  it('la distancia se calcula en metros', () => {
    expect(Asistencia.distancia(-17.80497, -63.15052, -17.80497, -63.15052)).toBe(0);
    const d = Asistencia.distancia(-17.80497, -63.15052, -17.81397, -63.15052);   // 0,009° de latitud ≈ 1 km
    expect(d).toBeGreaterThan(950);
    expect(d).toBeLessThan(1050);
  });

  it('la lectura para reportes trae las columnas que espera el catálogo', async () => {
    const { marcar, repo } = armarAsistencia();
    await marcar.execute({ usuario: 'caja.demo', rol: 'servicio_caja', tipo: 'entrada', ...enElComedor, simulada: true });
    const filas = await new ListarAsistenciaAnaliticaUseCase(repo).execute();
    expect(Object.keys(filas[0]).sort()).toEqual(
      ['distancia', 'fecha', 'hora', 'id', 'revisar', 'rol', 'tipo', 'ubicacion', 'usuario']);
    expect(filas[0]).toMatchObject({ tipo: 'Entrada', ubicacion: 'En el comedor', revisar: 'Sí' });
  });
});
