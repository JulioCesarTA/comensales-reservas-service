// Si una clase @Entity no está en la lista de la conexión, TypeScript compila y los casos de uso pasan,
// pero la primera consulta falla en producción con «No metadata for … was found» (error 500).
import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { getMetadataArgsStorage } from 'typeorm';
import { ENTIDADES } from './app.module';

describe('Entidades de la base de datos', () => {
  it('todas las clases @Entity del proyecto están registradas en la conexión', () => {
    // se cargan TODOS los archivos de entidades, estén o no importados por el módulo
    const carpeta = path.join(__dirname, '..', 'database', 'postgres');
    for (const f of fs.readdirSync(carpeta).filter(n => n.endsWith('.entity.ts'))) {
      require(path.join(carpeta, f));
    }
    const declaradas = getMetadataArgsStorage().tables.map(t => (t.target as Function).name).sort();
    const registradas = ENTIDADES.map(e => e.name).sort();
    expect(declaradas.length).toBeGreaterThanOrEqual(4);
    expect(registradas).toEqual(declaradas);
  });
});
