// Tipos del sistema

export type UserRole = 'mecanico' | 'admin';

export interface User {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

export interface Vehicle {
  patente: string;
  marca: string;
  modelo: string;
  anio: number;
  color: string;
}

export interface WorkOrder {
  id: string;
  vehicle: Vehicle;
  motivo: string;
  fotos: string[];
  notaVoz?: string;
  createdBy: string; // ID del usuario que creó la orden
  assignedTo?: string; // ID del mecánico asignado
  status: 'pendiente' | 'en_progreso' | 'completada' | 'cancelada';
  createdAt: string;
  updatedAt: string;
}
