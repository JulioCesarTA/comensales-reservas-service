import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { NoEncontradoError, PermisoDenegadoError, ReglaDeNegocioError } from '../../entities/errores';

/** Traduce los errores del negocio (que no saben de HTTP) a respuestas HTTP, con el mismo formato de siempre. */
@Catch(ReglaDeNegocioError, NoEncontradoError, PermisoDenegadoError)
export class ErroresNegocioFilter implements ExceptionFilter {
  catch(e: Error, host: ArgumentsHost) {
    if (host.getType<string>() === 'graphql') return e;      // en GraphQL el error viaja en la respuesta, no como código HTTP
    const [status, error] = e instanceof NoEncontradoError ? [404, 'Not Found']
      : e instanceof PermisoDenegadoError ? [403, 'Forbidden'] : [409, 'Conflict'];
    host.switchToHttp().getResponse().status(status).json({ statusCode: status, message: e.message, error });
  }
}
