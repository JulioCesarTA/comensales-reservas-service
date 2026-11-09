import { v4 as uuid } from 'uuid';
import { Asistencia, TipoMarca } from '../entities/Asistencia';
import { AsistenciaRepo, UbicacionComedor } from './ports';
import { ReglaDeNegocioError } from '../entities/errores';

const TIPOS: TipoMarca[] = ['entrada', 'salida'];

/** Marca la entrada o la salida del personal. La distancia al comedor se calcula AQUÍ, no en el teléfono. */
export class MarcarAsistenciaUseCase {
  constructor(private readonly repo: AsistenciaRepo, private readonly comedor: UbicacionComedor) {}

  async execute(input: {
    usuario: string;
    rol?: string;
    tipo: TipoMarca;
    lat: number;
    lon: number;
    simulada?: boolean;
    marcadaEn?: string;
  }): Promise<Asistencia> {
    const usuario = (input.usuario || '').trim();
    if (!usuario) throw new ReglaDeNegocioError('Falta el usuario que marca.');
    if (!TIPOS.includes(input.tipo)) throw new ReglaDeNegocioError('El tipo debe ser «entrada» o «salida».');
    const { lat, lon } = input;
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
      throw new ReglaDeNegocioError('La ubicación no es válida.');
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

    const distancia = Asistencia.distancia(lat, lon, this.comedor.lat, this.comedor.lon);
    const marcada = input.marcadaEn ? new Date(input.marcadaEn) : new Date();
    const a = new Asistencia(
      uuid(), usuario, input.rol || 'personal', input.tipo, lat, lon, distancia,
      distancia <= this.comedor.radioM, !!input.simulada,
      isNaN(marcada.getTime()) ? new Date() : marcada,
    );
    return this.repo.save(a);
  }
}

/** Las marcas de una persona (las más recientes primero) y si ahora mismo está dentro del turno. */
export class ConsultarAsistenciaUseCase {
  constructor(private readonly repo: AsistenciaRepo) {}

  async execute(usuario: string) {
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

  async execute() {
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
