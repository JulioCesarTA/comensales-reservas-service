import { Asistencia, TipoMarca } from '../entities/Asistencia';
import { AsistenciaRepo, GeneradorIds, UbicacionComedor } from './ports';
import {
  AsistenciaAnaliticaSalida, AsistenciaSalida, EstadoAsistenciaSalida, LugarComedorSalida, asistenciaSalida,
} from './salidas';
import { PermisoDenegadoError, ReglaDeNegocioError } from '../entities/errores';

const TIPOS: TipoMarca[] = ['entrada', 'salida'];
const ROL_ADMIN = 'administrador';
const RADIO_MIN_M = 50;
const RADIO_MAX_M = 5000;

const ubicacionValida = (lat: number, lon: number) =>
  Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;

const metros = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1).replace('.', ',')} km` : `${m} m`);

/** Marca la entrada o la salida del personal. La distancia al comedor se calcula AQUÍ, no en el teléfono,
 *  y fuera del radio la marca NO se registra. */
export class MarcarAsistenciaUseCase {
  constructor(
    private readonly repo: AsistenciaRepo,
    private readonly comedor: UbicacionComedor,
    private readonly ids: GeneradorIds,
  ) {}

  async execute(input: {
    usuario: string;
    rol?: string;
    tipo: TipoMarca;
    lat: number;
    lon: number;
    simulada?: boolean;
    marcadaEn?: string;
  }): Promise<AsistenciaSalida> {
    const usuario = (input.usuario || '').trim();
    if (!usuario) throw new ReglaDeNegocioError('Falta el usuario que marca.');
    if (!TIPOS.includes(input.tipo)) throw new ReglaDeNegocioError('El tipo debe ser «entrada» o «salida».');
    const { lat, lon } = input;
    if (!ubicacionValida(lat, lon)) {
      throw new ReglaDeNegocioError('La ubicación no es válida.');
    }

    // Solo cuenta si está dentro del radio del comedor (lo fija el administrador en su perfil)
    const comedor = await this.comedor.obtener();
    const distancia = Asistencia.distancia(lat, lon, comedor.lat, comedor.lon);
    if (distancia > comedor.radioM) {
      throw new ReglaDeNegocioError(
        `Estás a ${metros(distancia)} del comedor: solo se puede marcar dentro de ${metros(comedor.radioM)}. No se registró la ${input.tipo}.`);
    }

    // El turno se abre con una entrada y se cierra con una salida: no se repite lo mismo dos veces seguidas,
    // y no se puede cerrar un turno que nunca se abrió.
    const ultima = await this.repo.ultimaDe(usuario);
    const abierto = ultima?.tipo === 'entrada';
    if (input.tipo === 'entrada' && abierto) {
      throw new ReglaDeNegocioError('Ya tienes una entrada abierta: marca la salida primero.');
    }
    if (input.tipo === 'salida' && !abierto) {
      throw new ReglaDeNegocioError('No hay una entrada abierta para cerrar.');
    }

    const marcada = input.marcadaEn ? new Date(input.marcadaEn) : new Date();
    const a = new Asistencia(
      this.ids.nuevo(), usuario, input.rol || 'personal', input.tipo, lat, lon, distancia,
      true, !!input.simulada,
      isNaN(marcada.getTime()) ? new Date() : marcada,
    );
    return asistenciaSalida(await this.repo.save(a));
  }
}

const lugarSalida = (l: { lat: number; lon: number; radioM: number; actualizadoPor?: string | null; actualizadoEn?: Date | null }): LugarComedorSalida =>
  ({ lat: l.lat, lon: l.lon, radioM: l.radioM, actualizadoPor: l.actualizadoPor ?? null, actualizadoEn: l.actualizadoEn ?? null });

/** Dónde está el comedor y hasta qué distancia vale marcar (la app lo muestra antes de marcar). */
export class ConsultarLugarComedorUseCase {
  constructor(private readonly comedor: UbicacionComedor) {}

  async execute(): Promise<LugarComedorSalida> {
    return lugarSalida(await this.comedor.obtener());
  }
}

/** El administrador fija dónde está el comedor (latitud, longitud) y el radio en que vale marcar asistencia. */
export class GuardarLugarComedorUseCase {
  constructor(private readonly comedor: UbicacionComedor) {}

  async execute(input: { usuario: string; roles: string[]; lat: number; lon: number; radioM?: number }): Promise<LugarComedorSalida> {
    if (!input.roles.includes(ROL_ADMIN)) {
      throw new PermisoDenegadoError('Solo un administrador puede cambiar la ubicación del comedor.');
    }
    const lat = Number(input.lat), lon = Number(input.lon);
    if (!ubicacionValida(lat, lon) || (lat === 0 && lon === 0)) {
      throw new ReglaDeNegocioError('La latitud debe estar entre -90 y 90 y la longitud entre -180 y 180.');
    }
    const actual = await this.comedor.obtener();
    const radioM = input.radioM === undefined || input.radioM === null ? actual.radioM : Math.round(Number(input.radioM));
    if (!Number.isFinite(radioM) || radioM < RADIO_MIN_M || radioM > RADIO_MAX_M) {
      throw new ReglaDeNegocioError(`El radio debe estar entre ${RADIO_MIN_M} y ${RADIO_MAX_M} metros.`);
    }
    return lugarSalida(await this.comedor.guardar({
      lat, lon, radioM, actualizadoPor: (input.usuario || '').trim() || null, actualizadoEn: new Date(),
    }));
  }
}

/** Las marcas de una persona (las más recientes primero) y si ahora mismo está dentro del turno. */
export class ConsultarAsistenciaUseCase {
  constructor(private readonly repo: AsistenciaRepo) {}

  async execute(usuario: string): Promise<EstadoAsistenciaSalida> {
    const marcas = await this.repo.listarDe(usuario, 60);
    const ultima = marcas[0] ?? null;
    return {
      usuario,
      presente: ultima?.tipo === 'entrada',
      desde: ultima?.tipo === 'entrada' ? ultima.marcadaEn : null,
      marcas: marcas.map(m => ({
        id: m.id, tipo: m.tipo, marcadaEn: m.marcadaEn, distanciaM: m.distanciaM,
        dentro: m.dentro, simulada: m.simulada,
      })),
    };
  }
}

/** Lectura plana para los reportes: todas las marcas con su estado. */
export class ListarAsistenciaAnaliticaUseCase {
  constructor(private readonly repo: AsistenciaRepo) {}

  async execute(): Promise<AsistenciaAnaliticaSalida[]> {
    return (await this.repo.listarTodas()).map(m => ({
      id: m.id,
      fecha: m.marcadaEn.toISOString().slice(0, 10),
      hora: m.marcadaEn.toISOString().slice(11, 16),
      usuario: m.usuario,
      rol: m.rol,
      tipo: m.tipo === 'entrada' ? 'Entrada' : 'Salida',
      distancia: m.distanciaM,
      ubicacion: m.dentro ? 'En el comedor' : 'Fuera del comedor',
      revisar: m.sospechosa ? 'Sí' : 'No',
    }));
  }
}
