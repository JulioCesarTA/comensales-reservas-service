import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('asistencias')
export class AsistenciaOrm {
  @PrimaryColumn('uuid') id: string;
  @Index() @Column() usuario: string;
  @Column() rol: string;
  @Column() tipo: string;                                  // entrada | salida
  @Column('double precision') lat: number;
  @Column('double precision') lon: number;
  @Column('int') distanciaM: number;
  @Column({ default: true }) dentro: boolean;
  @Column({ default: false }) simulada: boolean;
  @Column('timestamp') marcadaEn: Date;
  @Column('timestamp', { default: () => 'now()' }) registradaEn: Date;
}
