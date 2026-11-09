import { EstudianteSalida } from '../../use-cases/salidas';

/** Un estudiante tal como lo ven REST y GraphQL: id, registroUniv, nombre, email, telefono. */
export interface EstudianteVista {
  id: string;
  registroUniv: string;
  nombre: string;
  email: string;
  telefono?: string | null;
}

export function presentarEstudiante(e: EstudianteSalida): EstudianteVista;
export function presentarEstudiante(e: EstudianteSalida | null): EstudianteVista | null;
export function presentarEstudiante(e: EstudianteSalida | null): EstudianteVista | null {
  if (!e) return null;
  return { id: e.id, registroUniv: e.registroUniv, nombre: e.nombre, email: e.email, telefono: e.telefono };
}

export const presentarEstudiantes = (l: EstudianteSalida[]): EstudianteVista[] => l.map(e => presentarEstudiante(e));
