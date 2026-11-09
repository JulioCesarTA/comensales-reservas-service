import { Injectable } from '@nestjs/common';
import { BecaRepo } from '../../use-cases/ports';
import { Beca, TipoBeca } from '../../entities/Beca';
import { AlmacenBecas, FilaBeca } from './almacenes';

@Injectable()
export class BecaGateway extends BecaRepo {
  constructor(private readonly almacen: AlmacenBecas) { super(); }

  private toDomain(o: FilaBeca): Beca {
    return new Beca(o.id, o.estudianteId, o.tipo as TipoBeca, o.cupoRacionesMes,
      o.racionesUsadasMes, o.vigenteDesde, o.vigenteHasta);
  }

  async findActivaByEstudiante(estId: string): Promise<Beca | null> {
    const o = await this.almacen.vigenteDe(estId, new Date());
    return o ? this.toDomain(o) : null;
  }
  async save(b: Beca): Promise<Beca> {
    await this.almacen.guardar({
      id: b.id, estudianteId: b.estudianteId, tipo: b.tipo,
      cupoRacionesMes: b.cupoRacionesMes, racionesUsadasMes: b.racionesUsadasMes,
      vigenteDesde: b.vigenteDesde, vigenteHasta: b.vigenteHasta,
    });
    return b;
  }
  async listarTodas(): Promise<Beca[]> {
    const rows = await this.almacen.todas();
    return rows.map(o => this.toDomain(o));
  }
}
