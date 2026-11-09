// Almacenes: lo que los gateways necesitan de la base de datos, con filas planas (sin TypeORM ni entidades del dominio).
// Los gateways traducen fila <-> entidad; la infraestructura (database/postgres) implementa estos almacenes.

export interface FilaEstudiante {
  id: string;
  registroUniv: string;
  nombre: string;
  email: string;
  telefono?: string | null;
}

export abstract class AlmacenEstudiantes {
  abstract porId(id: string): Promise<FilaEstudiante | null>;
  abstract porRegistro(registroUniv: string): Promise<FilaEstudiante | null>;
  abstract guardar(fila: FilaEstudiante): Promise<void>;
  /** Todos, ordenados por nombre. */
  abstract todos(): Promise<FilaEstudiante[]>;
}

export interface FilaBeca {
  id: string;
  estudianteId: string;
  tipo: string;
  cupoRacionesMes: number;
  racionesUsadasMes: number;
  vigenteDesde: Date;
  vigenteHasta: Date;
}

export abstract class AlmacenBecas {
  /** La beca del estudiante vigente en la fecha `hoy`. */
  abstract vigenteDe(estudianteId: string, hoy: Date): Promise<FilaBeca | null>;
  abstract guardar(fila: FilaBeca): Promise<void>;
  abstract todas(): Promise<FilaBeca[]>;
}

/** Fila de reserva. `fecha` es el día: al guardar va como texto AAAA-MM-DD; al leer llega como la entrega el driver. */
export interface FilaReserva {
  id: string;
  estudianteId: string;
  menuId: string;
  platoId: string;
  fecha: Date | string;
  turno: string;
  estado: string;
  qrCode?: string | null;
  /** Lo pone la base de datos al insertar: no se envía al guardar. */
  createdAt?: Date;
}

export abstract class AlmacenReservas {
  abstract porId(id: string): Promise<FilaReserva | null>;
  abstract porEstudiante(estudianteId: string): Promise<FilaReserva[]>;
  abstract guardar(fila: FilaReserva): Promise<void>;
  /** Todas, de la más antigua a la más nueva. */
  abstract todas(): Promise<FilaReserva[]>;
}

export interface FilaAsistencia {
  id: string;
  usuario: string;
  rol: string;
  tipo: string;
  lat: number | string;
  lon: number | string;
  distanciaM: number;
  dentro: boolean;
  simulada: boolean;
  marcadaEn: Date | string;
  registradaEn: Date | string;
}

export abstract class AlmacenAsistencias {
  abstract guardar(fila: FilaAsistencia): Promise<void>;
  /** La marca más reciente de esa persona. */
  abstract ultimaDe(usuario: string): Promise<FilaAsistencia | null>;
  /** Las marcas de esa persona, la más reciente primero. */
  abstract listarDe(usuario: string, limite: number): Promise<FilaAsistencia[]>;
  /** Todas las marcas, la más reciente primero, hasta `limite`. */
  abstract todas(limite: number): Promise<FilaAsistencia[]>;
}
