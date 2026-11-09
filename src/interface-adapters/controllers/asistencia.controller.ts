import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  ConsultarAsistenciaUseCase, ConsultarLugarComedorUseCase, MarcarAsistenciaUseCase,
} from '../../use-cases/MarcarAsistencia';
import { TipoMarca } from '../../entities/Asistencia';
import { presentarEstadoAsistencia, presentarLugar, presentarMarca } from '../presenters/asistencia.presenter';

class MarcarDto {
  usuario: string;
  rol?: string;
  tipo: TipoMarca;
  lat: number;
  lon: number;
  simulada?: boolean;
  marcadaEn?: string;
}

@Controller('asistencia')
export class AsistenciaController {
  constructor(
    private readonly marcar: MarcarAsistenciaUseCase,
    private readonly consultar: ConsultarAsistenciaUseCase,
    private readonly lugarComedor: ConsultarLugarComedorUseCase,
  ) {}

  /** Dónde está el comedor y hasta qué distancia vale marcar (la app lo muestra antes de marcar). */
  @Get('lugar')
  async lugar() {
    return presentarLugar(await this.lugarComedor.execute());
  }

  @Post('marcar')
  async marcarAsistencia(@Body() body: MarcarDto) {
    return presentarMarca(await this.marcar.execute(body));
  }

  @Get(':usuario')
  async mias(@Param('usuario') usuario: string) {
    return presentarEstadoAsistencia(await this.consultar.execute(usuario));
  }
}
