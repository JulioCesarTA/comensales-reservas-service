import { Args, Mutation, Parent, Query, ResolveField, ResolveReference, Resolver } from '@nestjs/graphql';
import { TipoBeca } from '../../entities/Beca';
import { ConsultarBecaUseCase } from '../../use-cases/ConsultarBeca';
import { AsignarBecaUseCase, ListarEstudiantesUseCase, ObtenerEstudianteUseCase } from '../../use-cases/GestionarEstudiantes';
import { ValidarIngresoUseCase } from '../../use-cases/ValidarIngreso';
import { presentarEstudiante, presentarEstudiantes } from '../presenters/estudiante.presenter';
import { presentarConsultaBecaGraphql } from '../presenters/beca.presenter';
import { presentarValidacionQr } from '../presenters/reserva.presenter';

@Resolver('Estudiante')
export class EstudianteResolver {
  constructor(
    private readonly listar: ListarEstudiantesUseCase,
    private readonly obtener: ObtenerEstudianteUseCase,
    private readonly consultarBeca: ConsultarBecaUseCase,
    private readonly asignar: AsignarBecaUseCase,
  ) {}

  private async becaDe(ref: string) {
    return presentarConsultaBecaGraphql(await this.consultarBeca.execute(ref));
  }

  @Query('estudiantes')
  async estudiantes() { return presentarEstudiantes(await this.listar.execute()); }

  @Query('estudiante')
  async estudiante(@Args('id') id: string) { return presentarEstudiante(await this.obtener.execute(id)); }

  @Query('beca')
  beca(@Args('estudianteId') id: string) { return this.becaDe(id); }

  @ResolveField('beca')
  becaDelEstudiante(@Parent() e: { id: string }) { return this.becaDe(e.id); }

  /** Federation: otro subgrafo (pagos) pide un Estudiante por cualquiera de sus dos claves. */
  @ResolveReference()
  async referencia(ref: { id?: string; registroUniv?: string }) {
    return presentarEstudiante(await this.obtener.execute((ref.id ?? ref.registroUniv) as string));
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
  async validarQr(@Args('qr') qr: string) { return presentarValidacionQr(await this.validar.execute(qr)); }
}
