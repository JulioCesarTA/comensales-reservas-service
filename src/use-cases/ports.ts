import { Estudiante } from '../entities/Estudiante';
import { Beca } from '../entities/Beca';
import { Reserva } from '../entities/Reserva';
import { Asistencia } from '../entities/Asistencia';

// Puertos: lo que los casos de uso necesitan del mundo exterior. Los implementan los gateways y la infraestructura.

export abstract class EstudianteRepo {
  abstract findById(id: string): Promise<Estudiante | null>;
  abstract findByRegistro(registro: string): Promise<Estudiante | null>;
  abstract save(e: Estudiante): Promise<Estudiante>;
  abstract listar(): Promise<Estudiante[]>;
}

export abstract class BecaRepo {
  abstract findActivaByEstudiante(estId: string): Promise<Beca | null>;
  abstract save(b: Beca): Promise<Beca>;
  abstract listarTodas(): Promise<Beca[]>;
}

export abstract class ReservaRepo {
  abstract save(r: Reserva): Promise<Reserva>;
  abstract findById(id: string): Promise<Reserva | null>;
  abstract findByEstudiante(estId: string): Promise<Reserva[]>;
  abstract listarTodas(): Promise<Reserva[]>;
}

export abstract class AsistenciaRepo {
  abstract save(a: Asistencia): Promise<Asistencia>;
  /** La marca más reciente de esa persona (para saber si tiene la entrada abierta). */
  abstract ultimaDe(usuario: string): Promise<Asistencia | null>;
  abstract listarDe(usuario: string, limite: number): Promise<Asistencia[]>;
  abstract listarTodas(): Promise<Asistencia[]>;
}

/** Dónde está el comedor y hasta qué distancia se acepta una marca. Se configura con variables de entorno. */
export abstract class UbicacionComedor {
  abstract readonly lat: number;
  abstract readonly lon: number;
  abstract readonly radioM: number;
}

export abstract class EventBusPort {
  abstract publish(topic: string, payload: any): Promise<void>;
}

export abstract class QrGeneratorPort {
  abstract generar(payload: object): Promise<string>;
}

/** Fuente de identificadores únicos para las entidades nuevas (en producción, UUID v4). */
export abstract class GeneradorIds {
  abstract nuevo(): string;
}
