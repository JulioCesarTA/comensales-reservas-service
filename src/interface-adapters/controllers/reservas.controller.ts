import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ReservarRacionUseCase } from '../../use-cases/ReservarRacion';
import { ConfirmarReservaUseCase } from '../../use-cases/ConfirmarReserva';
import { CancelarReservaUseCase } from '../../use-cases/CancelarReserva';
import { ValidarIngresoUseCase } from '../../use-cases/ValidarIngreso';
import { ConsultarBecaUseCase } from '../../use-cases/ConsultarBeca';
import { ListarReservasEstudianteUseCase, ObtenerReservaUseCase } from '../../use-cases/ConsultasReserva';
import { Turno } from '../../entities/Turno';

class CrearReservaDto {
  estudianteId: string;
  menuId: string;
  platoId: string;
  fecha: string;
  turno: Turno;
  sagaId?: string;
}

@Controller()
export class ReservasController {
  constructor(
    private readonly reservar: ReservarRacionUseCase,
    private readonly confirmar: ConfirmarReservaUseCase,
    private readonly cancelar: CancelarReservaUseCase,
    private readonly validar: ValidarIngresoUseCase,
    private readonly consultarBeca: ConsultarBecaUseCase,
    private readonly listarReservas: ListarReservasEstudianteUseCase,
    private readonly obtenerReserva: ObtenerReservaUseCase,
  ) {}

  @Get('health') health() { return { status: 'UP', service: 'comensales-reservas' }; }

  @Post('reservas')
  async crear(@Body() body: CrearReservaDto) {
    const r = await this.reservar.execute(body);
    return { id: r.id, estado: r.estado };
  }

  @Get('reservas/:id')
  async una(@Param('id') id: string) { return this.obtenerReserva.execute(id); }

  @Post('reservas/:id/confirmar')
  async confirmarR(@Param('id') id: string) { return this.confirmar.execute(id); }

  @Post('reservas/:id/cancelar')
  async cancelarR(@Param('id') id: string) {
    await this.cancelar.execute(id);
    return { ok: true, reservaId: id };
  }

  @Post('ingreso/validar-qr')
  async validarQr(@Body() body: { qr: string }) { return this.validar.execute(body.qr); }

  @Get('estudiantes/:id/beca')
  async beca(@Param('id') id: string) { return this.consultarBeca.execute(id); }

  @Get('estudiantes/:id/reservas')
  async reservasDe(@Param('id') id: string) { return this.listarReservas.execute(id); }
}
