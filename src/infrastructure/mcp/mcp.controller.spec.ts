import { McpController } from './mcp.controller';

// Respuesta falsa de express: solo registra el código de estado.
const respuesta = () => { const r: any = { codigo: 0 }; r.status = (c: number) => { r.codigo = c; return r; }; return r; };

describe('Servidor MCP de comensales', () => {
  const beca = { execute: jest.fn(async (ref: string) => (ref === 'e1' ? { tieneBeca: true, tipo: 'completa' } : { tieneBeca: false })) };
  const reservar = { execute: jest.fn(async () => ({ id: 'r1', estado: 'pendiente' })) };
  const mcp = new McpController(beca as any, reservar as any);
  const pedir = (method: string, params?: any) => mcp.recibir({ jsonrpc: '2.0', id: 1, method, params }, respuesta());

  it('initialize responde la versión y que ofrece herramientas', async () => {
    const r: any = await pedir('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '1' } });
    expect(r.result.protocolVersion).toBe('2025-06-18');
    expect(r.result.capabilities.tools).toBeDefined();
  });

  it('una notificación responde 202 sin cuerpo', async () => {
    const res = respuesta();
    expect(await mcp.recibir({ jsonrpc: '2.0', method: 'notifications/initialized' }, res)).toBeUndefined();
    expect(res.codigo).toBe(202);
  });

  it('tools/list trae consultar_beca y crear_reserva', async () => {
    const r: any = await pedir('tools/list');
    expect(r.result.tools.map((t: any) => t.name)).toEqual(['consultar_beca', 'crear_reserva']);
  });

  it('tools/call devuelve el resultado estructurado', async () => {
    const r: any = await pedir('tools/call', { name: 'consultar_beca', arguments: { estudianteId: 'e1' } });
    expect(r.result.isError).toBe(false);
    expect(r.result.structuredContent.resultado).toEqual({ tieneBeca: true, tipo: 'completa' });
  });

  it('crear_reserva sin argumentos es un error de la herramienta, no del protocolo', async () => {
    const r: any = await pedir('tools/call', { name: 'crear_reserva', arguments: {} });
    expect(r.result.isError).toBe(true);
    expect(reservar.execute).not.toHaveBeenCalled();
  });

  it('herramienta o método desconocido es error JSON-RPC', async () => {
    expect(((await pedir('tools/call', { name: 'x' })) as any).error.code).toBe(-32602);
    expect(((await pedir('resources/list')) as any).error.code).toBe(-32601);
  });
});
