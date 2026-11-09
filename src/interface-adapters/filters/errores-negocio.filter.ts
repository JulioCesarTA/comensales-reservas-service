import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { NoEncontradoError, ReglaDeNegocioError } from '../../entities/errores';

/** Traduce los errores del negocio (que no saben de HTTP) a respuestas HTTP, con el mismo formato de siempre. */
@Catch(ReglaDeNegocioError, NoEncontradoError)
export class ErroresNegocioFilter implements ExceptionFilter {
  catch(e: Error, host: ArgumentsHost) {
    if (host.getType<string>() === 'graphql') return e;      // en GraphQL el error viaja en la respuesta, no como código HTTP
    const noExiste = e instanceof NoEncontradoError;
    const status = noExiste ? 404 : 409;
    host.switchToHttp().getResponse().status(status).json({ statusCode: status, message: e.message, error: noExiste ? 'Not Found' : 'Conflict' });
  }
}
