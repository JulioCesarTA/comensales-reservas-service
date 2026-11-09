import { v4 as uuid } from 'uuid';
import { BecaRepo, EstudianteRepo, ReservaRepo, EventBusPort } from './ports';
import { ResolverEstudianteUseCase, esUuid } from './ResolverEstudiante';
import { Reserva } from '../entities/Reserva';
import { Estudiante } from '../entities/Estudiante';
import { Turno } from '../entities/Turno';
import { ReglaDeNegocioError } from '../entities/errores';

/**
 * Paso 1 de la Saga 1: crea una reserva en estado `pendiente`.
 */
export class ReservarRacionUseCase {
  constructor(
    private readonly estudiantes: EstudianteRepo,
    private readonly reservas: ReservaRepo,
    private readonly bus: EventBusPort,
    private readonly resolver: ResolverEstudianteUseCase,
    private readonly becas: BecaRepo,
  ) {}

  /** Si la referencia es una matrícula/usuario que aún no está en el padrón, se registra (idempotente). */
  private async estudianteDe(ref: string): Promise<Estudiante> {
    const existente = await this.resolver.execute(ref);
    if (existente) return existente;
    if (esUuid(ref)) throw new Error(`Estudiante no existe: ${ref}`);
    return this.estudiantes.save(new Estudiante(uuid(), ref, ref, `${ref}@uagrm.edu.bo`));
  }

  async execute(input: {
    estudianteId: string;
    menuId: string;
    platoId: string;
    fecha: string;
    turno: Turno;
    sagaId?: string;
  }): Promise<Reserva> {
    const est = await this.estudianteDe(input.estudianteId);

    // Parseo robusto: acepta "YYYY-MM-DD" o ISO completo
    const fechaRaw = input.fecha.length === 10 ? input.fecha + 'T00:00:00Z' : input.fecha;
    const fecha = new Date(fechaRaw);
    if (isNaN(fecha.getTime())) throw new Error(`fecha inválida: ${input.fecha}`);

    // Quien paga puede reservar todas las raciones que quiera en el día. Con beca activa la beca cubre UNA ración por día.
    const dia = fecha.toISOString().slice(0, 10);
    if (await this.becas.findActivaByEstudiante(est.id)) {
      const previas = await this.reservas.findByEstudiante(est.id);
      if (previas.some(r => r.estado !== 'cancelada' && new Date(r.fecha).toISOString().slice(0, 10) === dia)) {
        throw new ReglaDeNegocioError(`Con beca solo puedes reservar una ración por día (ya tienes una para el ${dia}).`);
      }
    }

    const saved = await this.reservas.save(
      new Reserva(uuid(), est.id, input.menuId, input.platoId, fecha, input.turno, 'pendiente'));
    await this.bus.publish('dominio-reservas', {
      type: 'ReservaCreadaEvent',
      sagaId: input.sagaId,
      reservaId: saved.id,
      estudianteId: saved.estudianteId,
      menuId: saved.menuId,
      platoId: saved.platoId,
    });
    return saved;
  }
}
