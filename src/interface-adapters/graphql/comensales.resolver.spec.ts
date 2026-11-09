// Levanta el subgrafo de verdad (GraphQL por HTTP) con casos de uso falsos: lo que el gateway de Apollo le pregunta.
import 'reflect-metadata';
import { ApolloFederationDriver, ApolloFederationDriverConfig } from '@nestjs/apollo';
import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { GraphQLModule } from '@nestjs/graphql';
import { Test } from '@nestjs/testing';
import { NoEncontradoError } from '../../entities/errores';
import { ConsultarBecaUseCase } from '../../use-cases/ConsultarBeca';
import { AsignarBecaUseCase, ListarEstudiantesUseCase, ObtenerEstudianteUseCase } from '../../use-cases/GestionarEstudiantes';
import { ValidarIngresoUseCase } from '../../use-cases/ValidarIngreso';
import { ErroresNegocioFilter } from '../filters/errores-negocio.filter';
import { EstudianteResolver, IngresoResolver } from './comensales.resolver';
import { ESQUEMA } from './esquema';

const ana = { id: 'e1', registroUniv: '220567', nombre: 'Ana', email: 'a@uagrm.edu.bo' };
const desde = new Date('2026-01-01T00:00:00.000Z');

describe('Subgrafo de comensales', () => {
  let app: INestApplication;
  let url: string;
  const asignar = { execute: jest.fn(async (id: string) => { if (id === 'nadie') throw new NoEncontradoError('Estudiante no existe'); }) };

  const pedir = async (query: string, variables?: object) => {
    const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) });
    return r.json() as Promise<any>;
  };

  beforeAll(async () => {
    const m = await Test.createTestingModule({
      imports: [GraphQLModule.forRoot<ApolloFederationDriverConfig>({ driver: ApolloFederationDriver, typeDefs: ESQUEMA, path: '/graphql', playground: false })],
      providers: [
        EstudianteResolver, IngresoResolver,
        { provide: APP_FILTER, useClass: ErroresNegocioFilter },
        { provide: ListarEstudiantesUseCase, useValue: { execute: async () => [ana] } },
        { provide: ObtenerEstudianteUseCase, useValue: { execute: async (r: string) => (r === 'e1' || r === '220567' ? ana : null) } },
        { provide: ConsultarBecaUseCase, useValue: { execute: async () => ({ tieneBeca: true, tipo: 'media', vigenteDesde: desde }) } },
        { provide: AsignarBecaUseCase, useValue: asignar },
        { provide: ValidarIngresoUseCase, useValue: { execute: async (q: string) => (q === 'bueno' ? { ok: true, reservaId: 'r1' } : { ok: false, motivo: 'QR inválido' }) } },
      ],
    }).compile();
    app = m.createNestApplication();
    await app.listen(0);
    url = `${await app.getUrl()}/graphql`.replace('[::1]', 'localhost');
  });
  afterAll(() => app.close());

  it('publica su esquema para que el gateway lo componga (federation)', async () => {
    const r = await pedir('{ _service { sdl } }');
    expect(r.data._service.sdl).toContain('federation/v2');
    expect(r.data._service.sdl).toContain('type Estudiante');
  });

  it('lista estudiantes con su beca, con la fecha como texto', async () => {
    const r = await pedir('{ estudiantes { id nombre beca { tieneBeca tipo vigenteDesde } } }');
    expect(r.errors).toBeUndefined();
    expect(r.data.estudiantes[0]).toEqual({ id: 'e1', nombre: 'Ana', beca: { tieneBeca: true, tipo: 'media', vigenteDesde: desde.toISOString() } });
  });

  it('otro subgrafo puede pedir un Estudiante por su matrícula (entidad)', async () => {
    const r = await pedir('query($r: [_Any!]!) { _entities(representations: $r) { ... on Estudiante { nombre } } }',
      { r: [{ __typename: 'Estudiante', registroUniv: '220567' }] });
    expect(r.errors).toBeUndefined();
    expect(r.data._entities[0].nombre).toBe('Ana');
  });

  it('valida el QR por mutación', async () => {
    const r = await pedir('mutation { validarQr(qr: "bueno") { ok reservaId motivo } }');
    expect(r.data.validarQr).toEqual({ ok: true, reservaId: 'r1', motivo: null });
  });

  it('un error de negocio llega como error de GraphQL con su motivo', async () => {
    const r = await pedir('mutation { asignarBeca(estudianteId: "nadie", tipo: "media", mesesVigencia: 6) { tieneBeca } }');
    expect(r.errors[0].message).toBe('Estudiante no existe');
  });
});
