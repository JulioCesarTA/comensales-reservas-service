import { BecaRepo, EstudianteRepo, GeneradorIds } from './ports';
import { ResolverEstudianteUseCase } from './ResolverEstudiante';
import { BecaSalida, EstudianteSalida, becaSalida, estudianteSalida } from './salidas';
import { Estudiante } from '../entities/Estudiante';
import { Beca, TipoBeca } from '../entities/Beca';
import { NoEncontradoError } from '../entities/errores';

export class ListarEstudiantesUseCase {
  constructor(private readonly estudiantes: EstudianteRepo) {}
  async execute(): Promise<EstudianteSalida[]> { return (await this.estudiantes.listar()).map(estudianteSalida); }
}

export class ObtenerEstudianteUseCase {
  constructor(private readonly resolver: ResolverEstudianteUseCase) {}
  execute(ref: string): Promise<EstudianteSalida | null> { return this.resolver.execute(ref); }
}

/** Da de alta un estudiante; si ya existe esa matrícula, devuelve el existente (idempotente). */
export class CrearEstudianteUseCase {
  constructor(private readonly estudiantes: EstudianteRepo, private readonly ids: GeneradorIds) {}

  async execute(d: { registroUniv: string; nombre: string; email: string; telefono?: string }): Promise<EstudianteSalida> {
    const existente = await this.estudiantes.findByRegistro(d.registroUniv);
    if (existente) return estudianteSalida(existente);
    return estudianteSalida(await this.estudiantes.save(new Estudiante(this.ids.nuevo(), d.registroUniv, d.nombre, d.email, d.telefono)));
  }
}

const CUPO_POR_TIPO: Record<TipoBeca, number> = { completa: 60, media: 30, parcial: 15 };

export class AsignarBecaUseCase {
  constructor(
    private readonly becas: BecaRepo,
    private readonly resolver: ResolverEstudianteUseCase,
    private readonly ids: GeneradorIds,
  ) {}

  async execute(ref: string, d: { tipo: TipoBeca; mesesVigencia?: number; cupoRacionesMes?: number }): Promise<BecaSalida> {
    const est = await this.resolver.execute(ref);
    if (!est) throw new NoEncontradoError(`Estudiante no existe: ${ref}`);
    const desde = new Date();
    const hasta = new Date(desde);
    hasta.setMonth(hasta.getMonth() + (d.mesesVigencia || 12));
    return becaSalida(await this.becas.save(
      new Beca(this.ids.nuevo(), est.id, d.tipo, d.cupoRacionesMes ?? CUPO_POR_TIPO[d.tipo] ?? 30, 0, desde, hasta)));
  }
}
