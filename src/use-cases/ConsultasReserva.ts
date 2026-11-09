import { ReservaRepo } from './ports';
import { ResolverEstudianteUseCase } from './ResolverEstudiante';
import { Reserva } from '../entities/Reserva';
import { NoEncontradoError } from '../entities/errores';

const dia = (f: Date | string) => new Date(f).toISOString().slice(0, 10);
const plana = (r: Reserva) => ({
  id: r.id, estudianteId: r.estudianteId, menuId: r.menuId, platoId: r.platoId, fecha: dia(r.fecha), turno: r.turno,
  estado: r.estado, qr: r.qrCode ?? null, creada: r.createdAt,
});

/** Las reservas de un estudiante (más recientes primero). `ref`: UUID, matrícula o usuario, como llegan desde el portal. */
export class ListarReservasEstudianteUseCase {
  constructor(private readonly reservas: ReservaRepo, private readonly resolver: ResolverEstudianteUseCase) {}

  async execute(ref: string) {
    const est = await this.resolver.execute(ref);
    if (!est) return [];
    const todas = await this.reservas.findByEstudiante(est.id);
    return todas
      .sort((a, b) => dia(b.fecha).localeCompare(dia(a.fecha)) || +new Date(b.createdAt) - +new Date(a.createdAt))
      .slice(0, 200)
      .map(plana);
  }
}

export class ObtenerReservaUseCase {
  constructor(private readonly reservas: ReservaRepo) {}

  async execute(id: string) {
    const r = await this.reservas.findById(id);
    if (!r) throw new NoEncontradoError('Reserva no existe');
    return plana(r);
  }
}
