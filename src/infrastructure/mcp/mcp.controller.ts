import { Body, Controller, Get, HttpCode, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ConsultarBecaUseCase } from '../../use-cases/ConsultarBeca';
import { ReservarRacionUseCase } from '../../use-cases/ReservarRacion';
import { Turno } from '../../entities/Turno';
import { presentarConsultaBeca } from '../../interface-adapters/presenters/beca.presenter';
import { presentarReservaCreada } from '../../interface-adapters/presenters/reserva.presenter';

/**
 * Servidor MCP (Model Context Protocol) por HTTP: JSON-RPC 2.0 en POST /mcp, sin estado.
 * Métodos: initialize, ping, tools/list y tools/call. Las notificaciones (sin id) se aceptan con 202.
 * Herramientas que este microservicio ofrece a los agentes de IA (SPEC §3.2): consultar_beca y crear_reserva.
 */
const VERSION = '2025-06-18';
const VERSIONES = new Set(['2025-06-18', '2025-03-26', '2024-11-05']);

type Herramienta = { description: string; inputSchema: object; accion: (a: Record<string, any>) => Promise<unknown> };

function texto(a: Record<string, any>, campo: string): string {
  const v = a[campo];
  if (v === undefined || v === null || String(v).trim() === '') throw new Error(`Falta el argumento «${campo}»`);
  return String(v);
}

class ErrorJsonRpc extends Error {
  constructor(readonly codigo: number, mensaje: string) { super(mensaje); }
}

@Controller('mcp')
export class McpController {
  private readonly herramientas: Record<string, Herramienta>;

  constructor(beca: ConsultarBecaUseCase, reservar: ReservarRacionUseCase) {
    this.herramientas = {
      consultar_beca: {
        description: 'Beca comedor de un estudiante (por UUID o matrícula): tipo, cupo del mes, raciones usadas y si cubre hoy.',
        inputSchema: { type: 'object', properties: { estudianteId: { type: 'string' } }, required: ['estudianteId'] },
        accion: async (a) => presentarConsultaBeca(await beca.execute(texto(a, 'estudianteId'))),
      },
      crear_reserva: {
        description: 'Crea una reserva en estado pendiente para un plato de un menú (paso 1 de la Saga 1).',
        inputSchema: {
          type: 'object',
          properties: {
            estudianteId: { type: 'string' }, menuId: { type: 'string' }, platoId: { type: 'string' },
            fecha: { type: 'string', description: 'AAAA-MM-DD' }, turno: { type: 'string', enum: ['DESAYUNO', 'ALMUERZO', 'CENA'] },
          },
          required: ['estudianteId', 'menuId', 'platoId', 'fecha', 'turno'],
        },
        accion: async (a) => {
          const r = await reservar.execute({
            estudianteId: texto(a, 'estudianteId'), menuId: texto(a, 'menuId'), platoId: texto(a, 'platoId'),
            fecha: texto(a, 'fecha'), turno: texto(a, 'turno').toUpperCase() as Turno,
          });
          return presentarReservaCreada(r);
        },
      },
    };
  }

  @Get()
  @HttpCode(405)
  sinStream() { return ''; }

  @Post()
  async recibir(@Body() msg: any, @Res({ passthrough: true }) res: Response) {
    const id = msg?.id;
    if (id === undefined || id === null) { res.status(202); return; }        // notificación: no lleva respuesta
    res.status(200);
    const params = msg.params ?? {};
    try {
      let result: unknown;
      switch (msg.method) {
        case 'initialize':
          result = {
            protocolVersion: VERSIONES.has(params.protocolVersion) ? params.protocolVersion : VERSION,
            capabilities: { tools: { listChanged: false } },
            serverInfo: { name: 'comensales-reservas-service', version: '1.0.0' },
          };
          break;
        case 'ping': result = {}; break;
        case 'tools/list':
          result = { tools: Object.entries(this.herramientas).map(([name, h]) => ({ name, description: h.description, inputSchema: h.inputSchema })) };
          break;
        case 'tools/call': result = await this.llamar(params); break;
        default: throw new ErrorJsonRpc(-32601, `Método no soportado: ${msg.method}`);
      }
      return { jsonrpc: '2.0', id, result };
    } catch (e: any) {
      return { jsonrpc: '2.0', id, error: { code: e instanceof ErrorJsonRpc ? e.codigo : -32603, message: e.message } };
    }
  }

  private async llamar(params: any) {
    const h = this.herramientas[params?.name];
    if (!h) throw new ErrorJsonRpc(-32602, `Herramienta desconocida: ${params?.name}`);
    try {
      const r = await h.accion(params.arguments ?? {});
      return { content: [{ type: 'text', text: JSON.stringify(r) }], structuredContent: { resultado: r }, isError: false };
    } catch (e: any) {            // error al ejecutar (regla de negocio, argumento que falta): resultado con isError
      return { content: [{ type: 'text', text: e?.message ?? String(e) }], isError: true };
    }
  }
}
