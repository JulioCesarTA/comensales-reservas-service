import { Injectable } from '@nestjs/common';
import { AsistenciaRepo } from '../../use-cases/ports';
import { Asistencia, TipoMarca } from '../../entities/Asistencia';
import { AlmacenAsistencias, FilaAsistencia } from './almacenes';

@Injectable()
export class AsistenciaGateway extends AsistenciaRepo {
  constructor(private readonly almacen: AlmacenAsistencias) { super(); }

  private toDomain(o: FilaAsistencia): Asistencia {
    return new Asistencia(o.id, o.usuario, o.rol, o.tipo as TipoMarca, Number(o.lat), Number(o.lon),
      o.distanciaM, o.dentro, o.simulada, new Date(o.marcadaEn), new Date(o.registradaEn));
  }

  async save(a: Asistencia): Promise<Asistencia> {
    await this.almacen.guardar({
      id: a.id, usuario: a.usuario, rol: a.rol, tipo: a.tipo, lat: a.lat, lon: a.lon,
      distanciaM: a.distanciaM, dentro: a.dentro, simulada: a.simulada,
      marcadaEn: a.marcadaEn, registradaEn: a.registradaEn,
    });
    return a;
  }

  async ultimaDe(usuario: string): Promise<Asistencia | null> {
    const o = await this.almacen.ultimaDe(usuario);
    return o ? this.toDomain(o) : null;
  }

  async listarDe(usuario: string, limite: number): Promise<Asistencia[]> {
    const l = await this.almacen.listarDe(usuario, limite);
    return l.map(o => this.toDomain(o));
  }

  async listarTodas(): Promise<Asistencia[]> {
    const l = await this.almacen.todas(5000);
    return l.map(o => this.toDomain(o));
  }
}

