import { Injectable } from '@nestjs/common';
import { EstudianteRepo } from '../../use-cases/ports';
import { Estudiante } from '../../entities/Estudiante';
import { AlmacenEstudiantes, FilaEstudiante } from './almacenes';

@Injectable()
export class EstudianteGateway extends EstudianteRepo {
  constructor(private readonly almacen: AlmacenEstudiantes) { super(); }

  private toDomain(o: FilaEstudiante): Estudiante {
    return new Estudiante(o.id, o.registroUniv, o.nombre, o.email, o.telefono);
  }

  async findById(id: string): Promise<Estudiante | null> {
    const o = await this.almacen.porId(id);
    return o ? this.toDomain(o) : null;
  }
  async findByRegistro(registro: string): Promise<Estudiante | null> {
    const o = await this.almacen.porRegistro(registro);
    return o ? this.toDomain(o) : null;
  }
  async save(e: Estudiante): Promise<Estudiante> {
    await this.almacen.guardar({
      id: e.id, registroUniv: e.registroUniv, nombre: e.nombre, email: e.email, telefono: e.telefono,
    });
    return e;
  }
  async listar(): Promise<Estudiante[]> {
    const rows = await this.almacen.todos();
    return rows.map(o => this.toDomain(o));
  }
}
