export type UserRole = 'admin' | 'technician' | 'customer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  emailVerified: boolean;
  passwordResetToken: string | null;
  phone?: string;
}

export interface CreateUserData {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  phone?: string;
}

export interface UpdateUserData {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
}

/** Parte recomendada al cliente por soporte remoto */
export interface ParteSugerida {
  parteNumero: string;
  descripcion: string;
  cantidad: number;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed' | 'redirected';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string;
  updatedAt: string;
  customerId: string;
  technicianId?: string;
  category: string;
  tags: string[];
  messageCount?: number;
  technicalObservations?: string;
  marca?: string | null;
  modeloEquipo?: string | null;
  /** Número de serie del equipo (S/N) */
  serial?: string | null;
  /**
   * Duración real del soporte remoto en minutos.
   * En el formulario de creación se captura en horas.
   */
  actualTime?: number | null;
  /** Sistemas del equipo que comprometen la falla (selección múltiple por técnico) */
  sistemas?: string[];
  /** Partes sugeridas al cliente (opcional) */
  partesSugeridas?: ParteSugerida[];
}

/** Campos que el usuario puede editar en un ticket ya creado */
export type TicketEditPayload = {
  title: string;
  description: string;
  priority?: Ticket['priority'];
  marca?: string | null;
  modeloEquipo?: string | null;
  serial?: string | null;
};

export interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId?: string;
  createdAt: string;
  updatedAt: string;
  ticketId: string;
  type: 'text' | 'file' | 'system' | 'image' | 'call_start' | 'call_end';
  metadata?: {
    fileUrl?: string;
    attachment?: {
      name: string;
      url: string;
      type: string;
      size: number;
    };
  };
  sender?: User;
}

export interface CallSession {
  id: string;
  ticketId: string;
  participants: string[];
  startTime: string;
  endTime?: string;
  recordingUrl?: string;
  status: 'scheduled' | 'active' | 'ended';
}

export interface Report {
  id: string;
  title: string;
  description: string;
  type: 'technical' | 'incident' | 'maintenance' | 'performance' | 'security';
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  authorId: string;
  customerId: string;
  reviewedById?: string;
  ticketId?: string;
  reviewedAt?: string;
  tags?: string[];
  attachments?: string[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  author?: User;
  customer?: User;
  reviewedBy?: User;
  ticket?: Ticket;
}

export interface ServiceCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface PeerConnection {
  peerId: string;
  stream: MediaStream;
}
