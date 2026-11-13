import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';
import { User } from './User';

export interface TicketAttributes {
  id?: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed' | 'cancelled' | 'redirected';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  categoryId: string;
  customerId: string;
  technicianId?: string;
  assignedAt?: Date;
  resolvedAt?: Date;
  closedAt?: Date;
  estimatedTime?: number;
  actualTime?: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
  technicalObservations?: string;
  /** Campos formulario público (sin login) */
  nit?: string;
  asesorRepuestos?: string;
  tipoMaquina?: string;
  marca?: string;
  modeloEquipo?: string;
  /** Número de serie del equipo (S/N) */
  serial?: string;
  /** Sistemas del equipo que comprometen la falla (selección múltiple) */
  sistemas?: string[];
  /** Partes sugeridas al cliente: parteNumero, descripcion, cantidad */
  partesSugeridas?: ParteSugerida[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ParteSugerida {
  parteNumero: string;
  descripcion: string;
  cantidad: number;
}

function normalizePartesSugeridas(
  value: ParteSugerida[] | null | undefined
): ParteSugerida[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(item => {
      const parteNumero = String(item?.parteNumero ?? '')
        .trim()
        .slice(0, 120);
      const descripcion = String(item?.descripcion ?? '')
        .trim()
        .slice(0, 500);
      const rawQty = Number(item?.cantidad);
      const cantidad =
        Number.isFinite(rawQty) && rawQty > 0 ? Math.round(rawQty) : 0;
      return { parteNumero, descripcion, cantidad };
    })
    .filter(
      item =>
        item.cantidad > 0 &&
        (item.parteNumero.length > 0 || item.descripcion.length > 0)
    );
}

function parsePartesSugeridasRaw(
  raw: string | null | undefined
): ParteSugerida[] {
  if (raw == null || raw === '') return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return normalizePartesSugeridas(
      parsed.map(item => {
        if (!item || typeof item !== 'object') {
          return { parteNumero: '', descripcion: '', cantidad: 0 };
        }
        const row = item as Record<string, unknown>;
        return {
          parteNumero: String(row.parteNumero ?? ''),
          descripcion: String(row.descripcion ?? ''),
          cantidad: Number(row.cantidad ?? 0),
        };
      })
    );
  } catch {
    return [];
  }
}

export class Ticket extends Model<TicketAttributes> implements TicketAttributes {
  public id!: string;
  public title!: string;
  public description!: string;
  public status!: 'open' | 'in_progress' | 'resolved' | 'closed' | 'cancelled' | 'redirected';
  public priority!: 'low' | 'medium' | 'high' | 'urgent';
  public categoryId!: string;
  public customerId!: string;
  public technicianId!: string;
  public assignedAt!: Date;
  public resolvedAt!: Date;
  public closedAt!: Date;
  public estimatedTime!: number;
  public actualTime!: number;
  public tags!: string[];
  public metadata!: Record<string, unknown>;
  public technicalObservations!: string;
  public nit!: string;
  public asesorRepuestos!: string;
  public tipoMaquina!: string;
  public marca!: string;
  public modeloEquipo!: string;
  public serial!: string;
  public sistemas!: string[];
  public partesSugeridas!: ParteSugerida[];
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Ticket.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('open', 'in_progress', 'resolved', 'closed', 'cancelled', 'redirected'),
      defaultValue: 'open',
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
      defaultValue: 'medium',
    },
    categoryId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Categories',
        key: 'id',
      },
    },
    customerId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
    },
    technicianId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: User,
        key: 'id',
      },
    },
    assignedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    resolvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    closedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    estimatedTime: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    actualTime: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: [],
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    technicalObservations: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    nit: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    asesorRepuestos: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    tipoMaquina: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    marca: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    modeloEquipo: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    serial: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    sistemas: {
      type: DataTypes.TEXT,
      allowNull: true,
      get(): string[] {
        const raw = this.getDataValue('sistemas') as string | null | undefined;
        if (raw == null || raw === '') return [];
        try {
          const parsed = JSON.parse(raw) as unknown;
          return Array.isArray(parsed)
            ? parsed.filter((s): s is string => typeof s === 'string')
            : [];
        } catch {
          return [];
        }
      },
      set(value: string[] | null | undefined) {
        const arr = Array.isArray(value) ? value : [];
        this.setDataValue('sistemas', arr.length > 0 ? JSON.stringify(arr) : null);
      },
    },
    partesSugeridas: {
      type: DataTypes.TEXT,
      allowNull: true,
      get(): ParteSugerida[] {
        const raw = this.getDataValue('partesSugeridas') as
          | string
          | null
          | undefined;
        return parsePartesSugeridasRaw(raw);
      },
      set(value: ParteSugerida[] | null | undefined) {
        const arr = normalizePartesSugeridas(value);
        this.setDataValue(
          'partesSugeridas',
          arr.length > 0 ? JSON.stringify(arr) : null
        );
      },
    },
  },
  {
    sequelize,
    modelName: 'Ticket',
  }
);

// Associations are defined in models/index.ts 