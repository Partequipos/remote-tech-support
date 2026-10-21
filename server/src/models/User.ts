import bcrypt from 'bcryptjs';
import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export interface UserAttributes {
  id?: string;
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'technician' | 'customer';
  avatar?: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  emailVerified?: boolean;
  // passwordResetToken?: string | null; // Columna no existe en Supabase
  lastLogin?: Date; // Cambiado de lastLoginAt a lastLogin
  phone?: string;
  department?: string;
  timezone?: string;
  language?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class User extends Model<UserAttributes> implements UserAttributes {
  public id!: string;
  public name!: string;
  public email!: string;
  public password!: string;
  public role!: 'admin' | 'technician' | 'customer';
  public avatar!: string;
  public status!: 'online' | 'away' | 'busy' | 'offline';
  public emailVerified!: boolean;
  // public passwordResetToken!: string | null; // Columna no existe en Supabase
  public lastLogin!: Date; // Cambiado de lastLoginAt a lastLogin
  public phone!: string;
  public department!: string;
  public timezone!: string;
  public language!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public async comparePassword(candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
  }
}

/** Evita hashear de nuevo una contraseña que el controlador ya cifró con bcrypt. */
const BCRYPT_HASH = /^\$2[aby]\$\d{2}\$/;

async function hashPlainPassword(user: User): Promise<void> {
  if (!user.password || BCRYPT_HASH.test(user.password)) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(user.password, salt);
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM('admin', 'technician', 'customer'),
      allowNull: false,
    },
    avatar: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('online', 'away', 'busy', 'offline'),
      defaultValue: 'offline',
    },
    emailVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    // passwordResetToken: {
    //   type: DataTypes.STRING,
    //   allowNull: true,
    // },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'lastLogin', // Nombre de columna en Supabase
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    department: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    timezone: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'America/Bogota',
    },
    language: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'es',
    },
  },
  {
    sequelize,
    modelName: 'User',
    hooks: {
      beforeCreate: async (user: User) => {
        await hashPlainPassword(user);
      },
      beforeUpdate: async (user: User) => {
        if (user.changed('password')) {
          await hashPlainPassword(user);
        }
      },
    },
  }
);
