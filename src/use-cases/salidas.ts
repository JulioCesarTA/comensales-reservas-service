import { Estudiante } from '../entities/Estudiante';
import { Beca, TipoBeca } from '../entities/Beca';
import { EstadoReserva, Reserva } from '../entities/Reserva';
import { Asistencia, TipoMarca } from '../entities/Asistencia';
import { Turno } from '../entities/Turno';

// Modelos de salida: datos planos que los casos de uso entregan hacia afuera (nunca las entidades).
// Los presentadores de interface-adapters los convierten en la respuesta HTTP, GraphQL o MCP.

export interface EstudianteSalida {
  id: string;
  registroUniv: string;
  nombre: string;
  email: string;
  telefono?: string | null;
}

export const estudianteSalida = (e: Estudiante): EstudianteSalida => ({
  id: e.id, registroUniv: e.registroUniv, nombre: e.nombre, email: e.email, telefono: e.telefono,
});

export interface BecaSalida {
  id: string;
  estudianteId: string;
  tipo: TipoBeca;
  cupoRacionesMes: number;
  racionesUsadasMes: number;
  vigenteDesde: Date;
  vigenteHasta: Date;
}

export const becaSalida = (b: Beca): BecaSalida => ({
  id: b.id, estudianteId: b.estudianteId, tipo: b.tipo, cupoRacionesMes: b.cupoRacionesMes,
  racionesUsadasMes: b.racionesUsadasMes, vigenteDesde: b.vigenteDesde, vigenteHasta: b.vigenteHasta,
});

/** Resultado de consultar la beca de un estudiante: sin beca solo trae `tieneBeca: false`. */
export interface ConsultaBecaSalida {
  tieneBeca: boolean;
  tipo?: TipoBeca;
  cupoRacionesMes?: number;
  racionesUsadasMes?: number;
  cubreHoy?: boolean;
  vigenteDesde?: Date;
  vigenteHasta?: Date;
}

export interface ReservaSalida {
  id: string;
  estudianteId: string;
  menuId: string;
  platoId: string;
  fecha: Date;
  turno: Turno;
  estado: EstadoReserva;
  qrCode?: string;
  createdAt: Date;
}

export const reservaSalida = (r: Reserva): ReservaSalida => ({
  id: r.id, estudianteId: r.estudianteId, menuId: r.menuId, platoId: r.platoId, fecha: r.fecha,
  turno: r.turno, estado: r.estado, qrCode: r.qrCode, createdAt: r.createdAt,
});

/** Una reserva lista para mostrar: la fecha como día (AAAA-MM-DD) y el QR o null. */
export interface ReservaPlanaSalida {
  id: string;
  estudianteId: string;
  menuId: string;
  platoId: string;
  fecha: string;
  turno: Turno;
  estado: EstadoReserva;
  qr: string | null;
  creada: Date;
}

export interface ReservaConfirmadaSalida {
  reservaId: string;
  qr: string;
}

export interface ValidacionIngresoSalida {
  ok: boolean;
  reservaId?: string;
  motivo?: string;
}

export interface AsistenciaSalida {
  id: string;
  usuario: string;
  rol: string;
  tipo: TipoMarca;
  lat: number;
  lon: number;
  distanciaM: number;
  dentro: boolean;
  simulada: boolean;
  sospechosa: boolean;
  marcadaEn: Date;
  registradaEn: Date;
}

export const asistenciaSalida = (a: Asistencia): AsistenciaSalida => ({
  id: a.id, usuario: a.usuario, rol: a.rol, tipo: a.tipo, lat: a.lat, lon: a.lon, distanciaM: a.distanciaM,
  dentro: a.dentro, simulada: a.simulada, sospechosa: a.sospechosa, marcadaEn: a.marcadaEn, registradaEn: a.registradaEn,
});

export interface LugarComedorSalida {
  lat: number;
  lon: number;
  radioM: number;
  actualizadoPor: string | null;
  actualizadoEn: Date | null;
}

export interface MarcaAsistenciaSalida {
  id: string;
  tipo: TipoMarca;
  marcadaEn: Date;
  distanciaM: number;
  dentro: boolean;
  simulada: boolean;
}

export interface EstadoAsistenciaSalida {
  usuario: string;
  presente: boolean;
  desde: Date | null;
  marcas: MarcaAsistenciaSalida[];
}

export interface ReservaAnaliticaSalida {
  id: string;
  fecha: string;
  turno: Turno;
  plato: string;
  estado: EstadoReserva;
  creada: Date;
  matricula: string | null;
  estudiante: string | null;
  menuId: string;
}

export interface BecaAnaliticaSalida {
  id: string;
  matricula: string | null;
  estudiante: string | null;
  tipo: TipoBeca;
  cupoMensual: number;
  usadas: number;
  desde: Date;
  hasta: Date;
}

export interface AsistenciaAnaliticaSalida {
  id: string;
  fecha: string;
  hora: string;
  usuario: string;
  rol: string;
  tipo: 'Entrada' | 'Salida';
  distancia: number;
  ubicacion: 'En el comedor' | 'Fuera del comedor';
  revisar: 'Sí' | 'No';
}
