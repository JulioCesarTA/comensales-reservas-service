import {
  ReservaConfirmadaSalida, ReservaPlanaSalida, ReservaSalida, ValidacionIngresoSalida,
} from '../../use-cases/salidas';

/** Reserva recién creada (REST POST /reservas y herramienta MCP crear_reserva): solo id y estado. */
export const presentarReservaCreada = (r: ReservaSalida) => ({ id: r.id, estado: r.estado });

/** Una reserva para mostrar (GET /reservas/:id y la lista de GET /estudiantes/:id/reservas). */
export const presentarReserva = (r: ReservaPlanaSalida) => ({
  id: r.id, estudianteId: r.estudianteId, menuId: r.menuId, platoId: r.platoId, fecha: r.fecha, turno: r.turno,
  estado: r.estado, qr: r.qr, creada: r.creada,
});

export const presentarReservas = (l: ReservaPlanaSalida[]) => l.map(presentarReserva);

export const presentarReservaConfirmada = (c: ReservaConfirmadaSalida) => ({ reservaId: c.reservaId, qr: c.qr });

export const presentarReservaCancelada = (reservaId: string) => ({ ok: true, reservaId });

/** Validación del QR (REST y GraphQL `ValidacionQr`): solo los campos que aplican. */
export function presentarValidacionQr(v: ValidacionIngresoSalida): { ok: boolean; reservaId?: string; motivo?: string } {
  const r: { ok: boolean; reservaId?: string; motivo?: string } = { ok: v.ok };
  if ('reservaId' in v) r.reservaId = v.reservaId;
  if ('motivo' in v) r.motivo = v.motivo;
  return r;
}
