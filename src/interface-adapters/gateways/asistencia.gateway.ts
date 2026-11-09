import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AsistenciaRepo, UbicacionComedor } from '../../use-cases/ports';
import { Asistencia, TipoMarca } from '../../entities/Asistencia';
import { AsistenciaOrm } from '../../infrastructure/database/postgres/asistencia.entity';

@Injectable()
export class AsistenciaGateway extends AsistenciaRepo {
  constructor(@InjectRepository(AsistenciaOrm) private readonly repo: Repository<AsistenciaOrm>) { super(); }

  private toDomain(o: AsistenciaOrm): Asistencia {
    return new Asistencia(o.id, o.usuario, o.rol, o.tipo as TipoMarca, Number(o.lat), Number(o.lon),
      o.distanciaM, o.dentro, o.simulada, new Date(o.marcadaEn), new Date(o.registradaEn));
  }

  async save(a: Asistencia): Promise<Asistencia> {
    await this.repo.save({
      id: a.id, usuario: a.usuario, rol: a.rol, tipo: a.tipo, lat: a.lat, lon: a.lon,
      distanciaM: a.distanciaM, dentro: a.dentro, simulada: a.simulada,
      marcadaEn: a.marcadaEn, registradaEn: a.registradaEn,
    });
    return a;
  }

  async ultimaDe(usuario: string): Promise<Asistencia | null> {
    const o = await this.repo.findOne({ where: { usuario }, order: { marcadaEn: 'DESC' } });
    return o ? this.toDomain(o) : null;
  }

  async listarDe(usuario: string, limite: number): Promise<Asistencia[]> {
    const l = await this.repo.find({ where: { usuario }, order: { marcadaEn: 'DESC' }, take: limite });
    return l.map(o => this.toDomain(o));
  }

  async listarTodas(): Promise<Asistencia[]> {
    const l = await this.repo.find({ order: { marcadaEn: 'DESC' }, take: 5000 });
    return l.map(o => this.toDomain(o));
  }
}

/** Dónde está el comedor (COMEDOR_LAT / COMEDOR_LON) y el radio aceptado (COMEDOR_RADIO_M).
 *  El radio es amplio a propósito: dentro de un edificio el GPS se equivoca fácil por decenas de metros. */
@Injectable()
export class UbicacionComedorEnv extends UbicacionComedor {
  readonly lat = Number(process.env.COMEDOR_LAT ?? -17.80497);
  readonly lon = Number(process.env.COMEDOR_LON ?? -63.15052);
  readonly radioM = Number(process.env.COMEDOR_RADIO_M ?? 1000);
}
