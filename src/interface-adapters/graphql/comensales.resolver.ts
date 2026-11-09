import { Args, Mutation, Parent, Query, ResolveField, ResolveReference, Resolver } from '@nestjs/graphql';
import { TipoBeca } from '../../entities/Beca';
import { ConsultarBecaUseCase } from '../../use-cases/ConsultarBeca';
import { AsignarBecaUseCase, ListarEstudiantesUseCase, ObtenerEstudianteUseCase } from '../../use-cases/GestionarEstudiantes';
import { ValidarIngresoUseCase } from '../../use-cases/ValidarIngreso';

const texto = (v: unknown) => (v instanceof Date ? v.toISOString() : (v as string | undefined));

@Resolver('Estudiante')
export class EstudianteResolver {
  constructor(
    private readonly listar: ListarEstudiantesUseCase,
    private readonly obtener: ObtenerEstudianteUseCase,
    private readonly consultarBeca: ConsultarBecaUseCase,
    private readonly asignar: AsignarBecaUseCase,
  ) {}

  private async becaDe(ref: string) {
    const b: any = await this.consultarBeca.execute(ref);
    return { ...b, vigenteDesde: texto(b.vigenteDesde), vigenteHasta: texto(b.vigenteHasta) };
  }

  @Query('estudiantes')
  estudiantes() { return this.listar.execute(); }

  @Query('estudiante')
  estudiante(@Args('id') id: string) { return this.obtener.execute(id); }

  @Query('beca')
  beca(@Args('estudianteId') id: string) { return this.becaDe(id); }

  @ResolveField('beca')
  becaDelEstudiante(@Parent() e: { id: string }) { return this.becaDe(e.id); }

  /** Federation: otro subgrafo (pagos) pide un Estudiante por cualquiera de sus dos claves. */
  @ResolveReference()
  referencia(ref: { id?: string; registroUniv?: string }) {
    return this.obtener.execute((ref.id ?? ref.registroUniv) as string);
  }

  @Mutation('asignarBeca')
  async asignarBeca(@Args('estudianteId') id: string, @Args('tipo') tipo: string, @Args('mesesVigencia') meses: number) {
    await this.asignar.execute(id, { tipo: tipo as TipoBeca, mesesVigencia: meses });
    return this.becaDe(id);
  }
}

@Resolver()
export class IngresoResolver {
  constructor(private readonly validar: ValidarIngresoUseCase) {}

  @Mutation('validarQr')
  validarQr(@Args('qr') qr: string) { return this.validar.execute(qr); }
}
