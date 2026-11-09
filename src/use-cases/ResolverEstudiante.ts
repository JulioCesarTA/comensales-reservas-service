import { EstudianteRepo } from './ports';
import { EstudianteSalida, estudianteSalida } from './salidas';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const esUuid = (ref: string): boolean => UUID_RE.test(ref);

/** Un estudiante se nombra por su ID (UUID) o por su matrícula/usuario: esta es la única regla que lo decide. */
export class ResolverEstudianteUseCase {
  constructor(private readonly estudiantes: EstudianteRepo) {}

  async execute(ref: string): Promise<EstudianteSalida | null> {
    const e = await (esUuid(ref) ? this.estudiantes.findById(ref) : this.estudiantes.findByRegistro(ref));
    return e ? estudianteSalida(e) : null;
  }
}
