import { Injectable } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { GeneradorIds } from '../../use-cases/ports';

/** Identificadores de producción: UUID v4 (las columnas `id` son de tipo uuid). */
@Injectable()
export class GeneradorUuid extends GeneradorIds {
  nuevo(): string { return uuid(); }
}
