import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EstudianteOrm } from '../database/postgres/estudiante.entity';
import { BecaOrm } from '../database/postgres/beca.entity';
import { ReservaOrm } from '../database/postgres/reserva.entity';
import { AsistenciaOrm } from '../database/postgres/asistencia.entity';
import { EstudianteGateway } from '../../interface-adapters/gateways/estudiante.gateway';
import { BecaGateway } from '../../interface-adapters/gateways/beca.gateway';
import { ReservaGateway } from '../../interface-adapters/gateways/reserva.gateway';
import { AsistenciaGateway, UbicacionComedorEnv } from '../../interface-adapters/gateways/asistencia.gateway';
import { ErroresNegocioFilter } from '../../interface-adapters/filters/errores-negocio.filter';
import { SnsBus } from '../messaging/sns.bus';
import { QrGenerator } from '../qr/qr.generator';
import { ReservarRacionUseCase } from '../../use-cases/ReservarRacion';
import { ConfirmarReservaUseCase } from '../../use-cases/ConfirmarReserva';
import { CancelarReservaUseCase } from '../../use-cases/CancelarReserva';
import { ValidarIngresoUseCase } from '../../use-cases/ValidarIngreso';
import { ConsultarBecaUseCase } from '../../use-cases/ConsultarBeca';
import { ListarReservasEstudianteUseCase, ObtenerReservaUseCase } from '../../use-cases/ConsultasReserva';
import { ResolverEstudianteUseCase } from '../../use-cases/ResolverEstudiante';
import {
  AsignarBecaUseCase, CrearEstudianteUseCase, ListarEstudiantesUseCase, ObtenerEstudianteUseCase,
} from '../../use-cases/GestionarEstudiantes';
import { ListarBecasAnaliticasUseCase, ListarReservasAnaliticasUseCase } from '../../use-cases/ConsultasAnaliticas';
import { EstudianteRepo, BecaRepo, ReservaRepo, EventBusPort, QrGeneratorPort, AsistenciaRepo, UbicacionComedor } from '../../use-cases/ports';
import { ReservasController } from '../../interface-adapters/controllers/reservas.controller';
import { EstudiantesController } from '../../interface-adapters/controllers/estudiantes.controller';
import { ConsultarAsistenciaUseCase, ListarAsistenciaAnaliticaUseCase, MarcarAsistenciaUseCase } from '../../use-cases/MarcarAsistencia';
import { AsistenciaController } from '../../interface-adapters/controllers/asistencia.controller';
import { AnaliticaController } from '../../interface-adapters/controllers/analitica.controller';

// Los casos de uso no conocen a Nest: aquí (la capa más externa) se les entregan sus puertos.
const casoDeUso = <T>(clase: new (...args: any[]) => T, ...inject: any[]) =>
  ({ provide: clase, useFactory: (...deps: any[]) => new clase(...deps), inject });

/** Todas las tablas del servicio. Una entidad que falte aquí compila bien pero falla con «No metadata for … was found»
 *  al primer uso: por eso la lista es una sola y una prueba la compara contra todas las clases @Entity. */
export const ENTIDADES = [EstudianteOrm, BecaOrm, ReservaOrm, AsistenciaOrm];

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: ENTIDADES,
      synchronize: true,
    }),
    TypeOrmModule.forFeature(ENTIDADES),
  ],
  controllers: [ReservasController, EstudiantesController, AnaliticaController, AsistenciaController],
  providers: [
    EstudianteGateway, BecaGateway, ReservaGateway, AsistenciaGateway, UbicacionComedorEnv, SnsBus, QrGenerator,
    { provide: EstudianteRepo, useExisting: EstudianteGateway },
    { provide: BecaRepo, useExisting: BecaGateway },
    { provide: ReservaRepo, useExisting: ReservaGateway },
    { provide: AsistenciaRepo, useExisting: AsistenciaGateway },
    { provide: UbicacionComedor, useExisting: UbicacionComedorEnv },
    { provide: EventBusPort, useExisting: SnsBus },
    { provide: QrGeneratorPort, useExisting: QrGenerator },
    { provide: APP_FILTER, useClass: ErroresNegocioFilter },
    casoDeUso(ResolverEstudianteUseCase, EstudianteRepo),
    casoDeUso(ReservarRacionUseCase, EstudianteRepo, ReservaRepo, EventBusPort, ResolverEstudianteUseCase, BecaRepo),
    casoDeUso(ListarReservasEstudianteUseCase, ReservaRepo, ResolverEstudianteUseCase),
    casoDeUso(ObtenerReservaUseCase, ReservaRepo),
    casoDeUso(ConfirmarReservaUseCase, ReservaRepo, EventBusPort, QrGeneratorPort),
    casoDeUso(CancelarReservaUseCase, ReservaRepo, EventBusPort),
    casoDeUso(ValidarIngresoUseCase, ReservaRepo),
    casoDeUso(ConsultarBecaUseCase, BecaRepo, ResolverEstudianteUseCase),
    casoDeUso(ListarEstudiantesUseCase, EstudianteRepo),
    casoDeUso(ObtenerEstudianteUseCase, ResolverEstudianteUseCase),
    casoDeUso(CrearEstudianteUseCase, EstudianteRepo),
    casoDeUso(AsignarBecaUseCase, BecaRepo, ResolverEstudianteUseCase),
    casoDeUso(ListarReservasAnaliticasUseCase, ReservaRepo, EstudianteRepo),
    casoDeUso(ListarBecasAnaliticasUseCase, BecaRepo, EstudianteRepo),
    casoDeUso(MarcarAsistenciaUseCase, AsistenciaRepo, UbicacionComedor),
    casoDeUso(ConsultarAsistenciaUseCase, AsistenciaRepo),
    casoDeUso(ListarAsistenciaAnaliticaUseCase, AsistenciaRepo),
  ],
})
export class AppModule {}
