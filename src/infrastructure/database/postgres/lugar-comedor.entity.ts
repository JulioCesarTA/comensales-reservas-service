import { Column, Entity, PrimaryColumn } from 'typeorm';

/** Una sola fila (id «comedor»): dónde está el comedor y el radio en que vale marcar asistencia. */
@Entity('lugar_comedor')
export class LugarComedorOrm {
  @PrimaryColumn() id: string;
  @Column('double precision') lat: number;
  @Column('double precision') lon: number;
  @Column('int') radioM: number;
  @Column({ type: 'varchar', nullable: true }) actualizadoPor: string | null;
  @Column('timestamp', { default: () => 'now()' }) actualizadoEn: Date;
}
