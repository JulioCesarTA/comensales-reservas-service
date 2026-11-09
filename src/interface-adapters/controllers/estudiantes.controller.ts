import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  AsignarBecaUseCase, CrearEstudianteUseCase, ListarEstudiantesUseCase, ObtenerEstudianteUseCase,
} from '../../use-cases/GestionarEstudiantes';
import { TipoBeca } from '../../entities/Beca';
import { presentarEstudiante, presentarEstudiantes } from '../presenters/estudiante.presenter';
import { presentarBecaAsignada } from '../presenters/beca.presenter';

@Controller('estudiantes')
export class EstudiantesController {
  constructor(
    private readonly listarEstudiantes: ListarEstudiantesUseCase,
    private readonly crearEstudiante: CrearEstudianteUseCase,
    private readonly obtenerEstudiante: ObtenerEstudianteUseCase,
    private readonly asignarBeca: AsignarBecaUseCase,
  ) {}

  @Get()
  async listar() { return presentarEstudiantes(await this.listarEstudiantes.execute()); }

  @Post()
  async crear(@Body() b: { registroUniv: string; nombre: string; email: string; telefono?: string }) {
    return presentarEstudiante(await this.crearEstudiante.execute(b));
  }

  @Get(':id')
  async uno(@Param('id') id: string) { return presentarEstudiante(await this.obtenerEstudiante.execute(id)); }

  // POST /estudiantes/:id/beca { tipo, mesesVigencia?, cupoRacionesMes? }
  @Post(':id/beca')
  async beca(@Param('id') id: string, @Body() b: { tipo: TipoBeca; mesesVigencia?: number; cupoRacionesMes?: number }) {
    return presentarBecaAsignada(await this.asignarBeca.execute(id, b));
  }
}
