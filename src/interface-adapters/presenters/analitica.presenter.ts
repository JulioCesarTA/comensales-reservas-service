import {
  AsistenciaAnaliticaSalida, BecaAnaliticaSalida, ReservaAnaliticaSalida,
} from '../../use-cases/salidas';

// Filas planas para el generador de reportes: las columnas son el contrato con el catálogo de reportes.

export const presentarReservasAnaliticas = (l: ReservaAnaliticaSalida[]) => l.map(r => ({
  id: r.id, fecha: r.fecha, turno: r.turno, plato: r.plato, estado: r.estado,
  creada: r.creada, matricula: r.matricula, estudiante: r.estudiante, menuId: r.menuId,
}));

export const presentarBecasAnaliticas = (l: BecaAnaliticaSalida[]) => l.map(b => ({
  id: b.id, matricula: b.matricula, estudiante: b.estudiante, tipo: b.tipo,
  cupoMensual: b.cupoMensual, usadas: b.usadas, desde: b.desde, hasta: b.hasta,
}));

export const presentarAsistenciaAnalitica = (l: AsistenciaAnaliticaSalida[]) => l.map(m => ({
  id: m.id, fecha: m.fecha, hora: m.hora, usuario: m.usuario, rol: m.rol, tipo: m.tipo,
  distancia: m.distancia, ubicacion: m.ubicacion, revisar: m.revisar,
}));
