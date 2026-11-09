/** Marca de asistencia del personal del comedor (administrador y cocina): entrada o salida, con su ubicación. */
export type TipoMarca = 'entrada' | 'salida';

export class Asistencia {
  constructor(
    public readonly id: string,
    public readonly usuario: string,
    public readonly rol: string,
    public readonly tipo: TipoMarca,
    public readonly lat: number,
    public readonly lon: number,
    /** Metros entre donde marcó y el comedor. */
    public readonly distanciaM: number,
    /** `true` si estaba dentro del radio permitido: lo decide el SERVIDOR, nunca el teléfono. */
    public readonly dentro: boolean,
    /** El teléfono informó que la ubicación venía de una app de ubicación simulada. */
    public readonly simulada: boolean,
    public readonly marcadaEn: Date,
    public readonly registradaEn: Date = new Date(),
  ) {}

  /** Distancia en metros entre dos puntos (fórmula del semiverseno). */
  static distancia(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
    const rad = (g: number) => (g * Math.PI) / 180;
    const dLat = rad(lat2 - lat1);
    const dLon = rad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
    return Math.round(2 * R * Math.asin(Math.sqrt(a)));
  }

  /** Una marca sospechosa no se rechaza: queda registrada para que el administrador la revise. */
  get sospechosa(): boolean {
    return this.simulada || !this.dentro;
  }
}
