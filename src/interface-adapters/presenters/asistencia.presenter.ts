import { AsistenciaSalida, EstadoAsistenciaSalida, LugarComedorSalida } from '../../use-cases/salidas';

/** Lugar del comedor que la app muestra antes de marcar. */
export const presentarLugar = (c: LugarComedorSalida) => ({ lat: c.lat, lon: c.lon, radioM: c.radioM });

/** Respuesta de POST /asistencia/marcar: `revisar` es la marca sospechosa (fuera del radio o ubicación simulada). */
export const presentarMarca = (a: AsistenciaSalida) => ({
  id: a.id, tipo: a.tipo, marcadaEn: a.marcadaEn, distanciaM: a.distanciaM,
  dentro: a.dentro, simulada: a.simulada, revisar: a.sospechosa,
});

/** Respuesta de GET /asistencia/:usuario. */
export const presentarEstadoAsistencia = (e: EstadoAsistenciaSalida) => ({
  usuario: e.usuario,
  presente: e.presente,
  desde: e.desde,
  marcas: e.marcas.map(m => ({
    id: m.id, tipo: m.tipo, marcadaEn: m.marcadaEn, distanciaM: m.distanciaM, dentro: m.dentro, simulada: m.simulada,
  })),
});
