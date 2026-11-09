import { Injectable } from '@nestjs/common';
import { UbicacionComedor } from '../../use-cases/ports';

/** Dónde está el comedor (COMEDOR_LAT / COMEDOR_LON) y el radio aceptado (COMEDOR_RADIO_M).
 *  El radio es amplio a propósito: dentro de un edificio el GPS se equivoca fácil por decenas de metros. */
@Injectable()
export class UbicacionComedorEnv extends UbicacionComedor {
  readonly lat = Number(process.env.COMEDOR_LAT ?? -17.80497);
  readonly lon = Number(process.env.COMEDOR_LON ?? -63.15052);
  readonly radioM = Number(process.env.COMEDOR_RADIO_M ?? 1000);
}
