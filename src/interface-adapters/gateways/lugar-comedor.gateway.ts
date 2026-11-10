import { Injectable } from '@nestjs/common';
import { LugarComedor, UbicacionComedor } from '../../use-cases/ports';
import { AlmacenLugarComedor, LugarInicialComedor } from './almacenes';

const ID = 'comedor';

/** Ubicación del comedor: la que guardó el administrador; si todavía no guardó ninguna, la de la configuración. */
@Injectable()
export class LugarComedorGateway extends UbicacionComedor {
  constructor(private readonly almacen: AlmacenLugarComedor, private readonly porDefecto: LugarInicialComedor) { super(); }

  async obtener(): Promise<LugarComedor> {
    const f = await this.almacen.leer(ID);
    if (!f) return { lat: this.porDefecto.lat, lon: this.porDefecto.lon, radioM: this.porDefecto.radioM, actualizadoPor: null, actualizadoEn: null };
    return { lat: Number(f.lat), lon: Number(f.lon), radioM: f.radioM, actualizadoPor: f.actualizadoPor, actualizadoEn: new Date(f.actualizadoEn) };
  }

  async guardar(l: LugarComedor): Promise<LugarComedor> {
    const actualizadoEn = l.actualizadoEn ?? new Date();
    await this.almacen.guardar({ id: ID, lat: l.lat, lon: l.lon, radioM: l.radioM, actualizadoPor: l.actualizadoPor ?? null, actualizadoEn });
    return { ...l, actualizadoEn };
  }
}
