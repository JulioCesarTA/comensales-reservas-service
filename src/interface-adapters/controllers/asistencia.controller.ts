import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ConsultarAsistenciaUseCase, MarcarAsistenciaUseCase } from '../../use-cases/MarcarAsistencia';
import { UbicacionComedor } from '../../use-cases/ports';
import { TipoMarca } from '../../entities/Asistencia';

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
    private readonly comedor: UbicacionComedor,
  ) {}

  /** Dónde está el comedor y hasta qué distancia vale marcar (la app lo muestra antes de marcar). */
  @Get('lugar')
  lugar() {
    return { lat: this.comedor.lat, lon: this.comedor.lon, radioM: this.comedor.radioM };
  }

  @Post('marcar')
  async marcarAsistencia(@Body() body: MarcarDto) {
    const a = await this.marcar.execute(body);
    return {
      id: a.id, tipo: a.tipo, marcadaEn: a.marcadaEn, distanciaM: a.distanciaM,
      dentro: a.dentro, simulada: a.simulada, revisar: a.sospechosa,
    };
  }

  @Get(':usuario')
  async mias(@Param('usuario') usuario: string) {
    return this.consultar.execute(usuario);
  }
}
