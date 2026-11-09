// Si falta registrar un caso de uso en el módulo, TypeScript compila y las pruebas de los casos de uso pasan,
// pero Nest se cae AL ARRANCAR el servicio. Esta prueba arma los controladores y proveedores REALES del módulo
// (con la base de datos reemplazada por un doble) para que ese error salga aquí y no en producción.
import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AppModule } from './app.module';
import { AsistenciaOrm } from '../database/postgres/asistencia.entity';
import { BecaOrm } from '../database/postgres/beca.entity';
import { EstudianteOrm } from '../database/postgres/estudiante.entity';
import { ReservaOrm } from '../database/postgres/reserva.entity';

describe('AppModule: inyección de dependencias', () => {
  it('todos los controladores se pueden construir con sus casos de uso', async () => {
    const controllers: any[] = Reflect.getMetadata('controllers', AppModule);
    const providers: any[] = Reflect.getMetadata('providers', AppModule);
    const repos = [EstudianteOrm, BecaOrm, ReservaOrm, AsistenciaOrm].map(orm => ({
      provide: getRepositoryToken(orm), useValue: {},
    }));

    const modulo = await Test.createTestingModule({ controllers, providers: [...providers, ...repos] }).compile();

    expect(controllers.length).toBeGreaterThanOrEqual(4);
    for (const c of controllers) {
      expect(modulo.get(c)).toBeInstanceOf(c);
    }
  });
});
