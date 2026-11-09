import { Controller, Get } from '@nestjs/common';
import { ListarBecasAnaliticasUseCase, ListarReservasAnaliticasUseCase } from '../../use-cases/ConsultasAnaliticas';
import { ListarAsistenciaAnaliticaUseCase } from '../../use-cases/MarcarAsistencia';
import {
  presentarAsistenciaAnalitica, presentarBecasAnaliticas, presentarReservasAnaliticas,
} from '../presenters/analitica.presenter';

/** Lecturas planas (solo consulta) para el generador de reportes. */
@Controller('analitica')
export class AnaliticaController {
  constructor(
    private readonly reservas: ListarReservasAnaliticasUseCase,
    private readonly becas: ListarBecasAnaliticasUseCase,
    private readonly asistencia: ListarAsistenciaAnaliticaUseCase,
  ) {}

  @Get('reservas')
  async listarReservas() { return presentarReservasAnaliticas(await this.reservas.execute()); }

  @Get('asistencia')
  async listarAsistencia() { return presentarAsistenciaAnalitica(await this.asistencia.execute()); }

  @Get('becas')
  async listarBecas() { return presentarBecasAnaliticas(await this.becas.execute()); }
}
