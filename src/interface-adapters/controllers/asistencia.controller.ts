import { Body, Controller, Get, Headers, Param, Post, Put } from '@nestjs/common';
import {
  ConsultarAsistenciaUseCase, ConsultarLugarComedorUseCase, GuardarLugarComedorUseCase, MarcarAsistenciaUseCase,
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

class LugarDto {
  lat: number;
  lon: number;
  radioM?: number;
}

@Controller('asistencia')
export class AsistenciaController {
  constructor(
    private readonly marcar: MarcarAsistenciaUseCase,
    private readonly consultar: ConsultarAsistenciaUseCase,
    private readonly lugarComedor: ConsultarLugarComedorUseCase,
    private readonly guardarLugar: GuardarLugarComedorUseCase,
  ) {}

  /** Dónde está el comedor y hasta qué distancia vale marcar (la app lo muestra antes de marcar). */
  @Get('lugar')
  async lugar() {
    return presentarLugar(await this.lugarComedor.execute());
  }

  /** Solo el administrador. Usuario y roles los pone el api-gateway a partir del token (el cliente no puede fijarlos). */
  @Put('lugar')
  async cambiarLugar(@Body() body: LugarDto, @Headers('x-usuario') usuario?: string, @Headers('x-roles') roles?: string) {
    return presentarLugar(await this.guardarLugar.execute({
      usuario: usuario || '', roles: (roles || '').split(',').map(r => r.trim()).filter(Boolean),
      lat: body?.lat, lon: body?.lon, radioM: body?.radioM,
    }));
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
