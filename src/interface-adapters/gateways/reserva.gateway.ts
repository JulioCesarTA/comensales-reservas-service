import { Injectable } from '@nestjs/common';
import { ReservaRepo } from '../../use-cases/ports';
import { EstadoReserva, Reserva } from '../../entities/Reserva';
import { Turno } from '../../entities/Turno';
import { AlmacenReservas, FilaReserva } from './almacenes';

@Injectable()
export class ReservaGateway extends ReservaRepo {
  constructor(private readonly almacen: AlmacenReservas) { super(); }

  private toDomain(o: FilaReserva): Reserva {
    return new Reserva(o.id, o.estudianteId, o.menuId, o.platoId, new Date(o.fecha),
      o.turno as Turno, o.estado as EstadoReserva, o.qrCode, o.createdAt);
  }
  async save(r: Reserva): Promise<Reserva> {
    const fechaStr = r.fecha instanceof Date && !isNaN(r.fecha.getTime())
      ? r.fecha.toISOString().slice(0, 10)
      : String(r.fecha).slice(0, 10);
    await this.almacen.guardar({
      id: r.id, estudianteId: r.estudianteId, menuId: r.menuId, platoId: r.platoId,
      fecha: fechaStr, turno: r.turno, estado: r.estado, qrCode: r.qrCode,
    });
    return r;
  }
  async findById(id: string): Promise<Reserva | null> {
    const o = await this.almacen.porId(id);
    return o ? this.toDomain(o) : null;
  }
  async findByEstudiante(estId: string): Promise<Reserva[]> {
    const os = await this.almacen.porEstudiante(estId);
    return os.map(o => this.toDomain(o));
  }
  async listarTodas(): Promise<Reserva[]> {
    const os = await this.almacen.todas();
    return os.map(o => this.toDomain(o));
  }
}
