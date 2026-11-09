import { Controller, Get } from '@nestjs/common';
import { ListarBecasAnaliticasUseCase, ListarReservasAnaliticasUseCase } from '../../use-cases/ConsultasAnaliticas';
import { ListarAsistenciaAnaliticaUseCase } from '../../use-cases/MarcarAsistencia';

/** Lecturas planas (solo consulta) para el generador de reportes. */
@Controller('analitica')
export class AnaliticaController {
  constructor(
    private readonly reservas: ListarReservasAnaliticasUseCase,
    private readonly becas: ListarBecasAnaliticasUseCase,
    private readonly asistencia: ListarAsistenciaAnaliticaUseCase,
  ) {}

  @Get('reservas')
  listarReservas() { return this.reservas.execute(); }

  @Get('asistencia')
  listarAsistencia() { return this.asistencia.execute(); }

  @Get('becas')
  listarBecas() { return this.becas.execute(); }
}
