import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AlmacenAsistencias, AlmacenBecas, AlmacenEstudiantes, AlmacenLugarComedor, AlmacenReservas,
  FilaAsistencia, FilaBeca, FilaEstudiante, FilaLugarComedor, FilaReserva,
} from '../../../interface-adapters/gateways/almacenes';
import { LugarComedorOrm } from './lugar-comedor.entity';
import { EstudianteOrm } from './estudiante.entity';
import { BecaOrm } from './beca.entity';
import { ReservaOrm } from './reserva.entity';
import { AsistenciaOrm } from './asistencia.entity';

// Implementaciones de los almacenes con TypeORM sobre PostgreSQL (las mismas consultas de siempre).

@Injectable()
export class AlmacenEstudiantesTypeOrm extends AlmacenEstudiantes {
  constructor(@InjectRepository(EstudianteOrm) private readonly repo: Repository<EstudianteOrm>) { super(); }

  porId(id: string): Promise<FilaEstudiante | null> { return this.repo.findOneBy({ id }); }
  porRegistro(registroUniv: string): Promise<FilaEstudiante | null> { return this.repo.findOneBy({ registroUniv }); }
  async guardar(fila: FilaEstudiante): Promise<void> { await this.repo.save(fila as EstudianteOrm); }
  todos(): Promise<FilaEstudiante[]> { return this.repo.find({ order: { nombre: 'ASC' } }); }
}

@Injectable()
export class AlmacenBecasTypeOrm extends AlmacenBecas {
  constructor(@InjectRepository(BecaOrm) private readonly repo: Repository<BecaOrm>) { super(); }

  vigenteDe(estudianteId: string, hoy: Date): Promise<FilaBeca | null> {
    return this.repo.createQueryBuilder('b')
      .where('b.estudianteId = :id', { id: estudianteId })
      .andWhere('b.vigenteDesde <= :hoy AND b.vigenteHasta >= :hoy', { hoy })
      .getOne();
  }
  async guardar(fila: FilaBeca): Promise<void> { await this.repo.save(fila); }
  todas(): Promise<FilaBeca[]> { return this.repo.find(); }
}

@Injectable()
export class AlmacenReservasTypeOrm extends AlmacenReservas {
  constructor(@InjectRepository(ReservaOrm) private readonly repo: Repository<ReservaOrm>) { super(); }

  porId(id: string): Promise<FilaReserva | null> { return this.repo.findOneBy({ id }); }
  porEstudiante(estudianteId: string): Promise<FilaReserva[]> { return this.repo.find({ where: { estudianteId } }); }
  // `fecha` llega como texto AAAA-MM-DD (columna `date`), igual que antes de separar el almacén.
  async guardar(fila: FilaReserva): Promise<void> { await this.repo.save(fila as any); }
  todas(): Promise<FilaReserva[]> { return this.repo.find({ order: { createdAt: 'ASC' } }); }
}

@Injectable()
export class AlmacenLugarComedorTypeOrm extends AlmacenLugarComedor {
  constructor(@InjectRepository(LugarComedorOrm) private readonly repo: Repository<LugarComedorOrm>) { super(); }

  leer(id: string): Promise<FilaLugarComedor | null> { return this.repo.findOneBy({ id }); }
  async guardar(fila: FilaLugarComedor): Promise<void> { await this.repo.save(fila as LugarComedorOrm); }
}

@Injectable()
export class AlmacenAsistenciasTypeOrm extends AlmacenAsistencias {
  constructor(@InjectRepository(AsistenciaOrm) private readonly repo: Repository<AsistenciaOrm>) { super(); }

  async guardar(fila: FilaAsistencia): Promise<void> { await this.repo.save(fila as AsistenciaOrm); }
  ultimaDe(usuario: string): Promise<FilaAsistencia | null> {
    return this.repo.findOne({ where: { usuario }, order: { marcadaEn: 'DESC' } });
  }
  listarDe(usuario: string, limite: number): Promise<FilaAsistencia[]> {
    return this.repo.find({ where: { usuario }, order: { marcadaEn: 'DESC' }, take: limite });
  }
  todas(limite: number): Promise<FilaAsistencia[]> {
    return this.repo.find({ order: { marcadaEn: 'DESC' }, take: limite });
  }
}
