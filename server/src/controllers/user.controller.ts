import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { User } from '../models';
import { storageService } from '../services/storage.service';
import { addCacheBusting, processUsersAvatars } from '../utils/avatar';
import { logger } from '../utils/logger';

export const createUser = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role, phone } = req.body;

    // Log para depuración
    logger.info('Creando usuario:', {
      name,
      email,
      passwordLength: password?.length,
      role,
    });

    // Validar que todos los campos requeridos estén presentes
    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: 'Nombre, email y contraseña son requeridos' });
    }

    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'El email ya está registrado' });
    }

    // El modelo User tiene un hook beforeCreate que hashea automáticamente
    const user = await User.create({
      name,
      email,
      password, // Se hashea automáticamente en el hook beforeCreate
      role: role || 'customer',
      phone: phone || undefined,
      emailVerified: false,
    });

    // Retornar el usuario sin la contraseña
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _password, ...userWithoutPassword } = user.toJSON();
    res.status(201).json({
      message: 'Usuario creado exitosamente',
      user: userWithoutPassword,
    });
  } catch (error) {
    logger.error('Error al crear usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const getUsers = async (req: Request, res: Response) => {
  try {
    const user = req.user as { id: string; role: string };
    const whereClause: { role?: { [key: string]: string[] } } = {};

    // Filtrar usuarios según el rol del usuario que hace la petición
    if (user.role === 'customer') {
      // Los clientes solo pueden ver administradores y técnicos (no otros clientes)
      whereClause.role = {
        [Op.in]: ['admin', 'technician'],
      };
    }
    // Los administradores y técnicos pueden ver todos los usuarios (no se aplica filtro)

    const users = await User.findAll({
      where: whereClause,
      attributes: [
        'id',
        'name',
        'email',
        'role',
        'status',
        'avatar',
        'phone',
        'createdAt',
      ],
      order: [['name', 'ASC']],
    });

    // Procesar avatares con cache-busting
    const usersWithAvatars = processUsersAvatars(users.map(u => u.toJSON()));
    res.json(usersWithAvatars);
  } catch (error) {
    logger.error('Error al obtener usuarios:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const getUsersPublic = async (req: Request, res: Response) => {
  try {
    // Ruta pública que devuelve todos los usuarios (para login)
    const users = await User.findAll({
      attributes: [
        'id',
        'name',
        'email',
        'role',
        'status',
        'avatar',
        'phone',
        'createdAt',
      ],
      order: [['name', 'ASC']],
    });

    // Procesar avatares con cache-busting
    const usersWithAvatars = processUsersAvatars(users.map(u => u.toJSON()));
    res.json(usersWithAvatars);
  } catch (error) {
    logger.error('Error al obtener usuarios públicos:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id, {
      attributes: [
        'id',
        'name',
        'email',
        'role',
        'status',
        'avatar',
        'phone',
        'createdAt',
      ],
    });

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Procesar avatar con cache-busting
    const userWithAvatar = {
      ...user.toJSON(),
      avatar: addCacheBusting(user.avatar),
    };

    res.json(userWithAvatar);
  } catch (error) {
    logger.error('Error al obtener usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, password, role, status, avatar, phone } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Preparar datos de actualización
    const updateData: {
      name: string;
      email: string;
      role: string;
      status: string;
      avatar: string | null;
      phone: string | null;
    } = {
      name: name || user.name,
      email: email || user.email,
      role: role || user.role,
      status: status || user.status,
      avatar: avatar || user.avatar,
      phone: phone === undefined ? user.phone : phone,
    };

    // Vacío = conservar la actual. Si viene texto, el hook beforeUpdate hashea una sola vez.
    const nextPassword = typeof password === 'string' ? password.trim() : '';
    if (nextPassword) {
      if (nextPassword.length < 6) {
        return res.status(400).json({
          message: 'La contraseña debe tener al menos 6 caracteres',
        });
      }
      logger.info(`Actualizando contraseña para usuario: ${user.name}`);
      user.password = nextPassword;
    } else {
      logger.info(`Manteniendo contraseña actual para usuario: ${user.name}`);
    }

    // Actualizar otros campos
    Object.assign(user, updateData);
    await user.save();

    // Retornar el usuario sin la contraseña
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _password, ...userWithoutPassword } = user.toJSON();
    res.json({
      message: 'Usuario actualizado exitosamente',
      user: userWithoutPassword,
    });
  } catch (error) {
    logger.error('Error al actualizar usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    await user.destroy();
    res.json({ message: 'Usuario eliminado exitosamente' });
  } catch (error) {
    logger.error('Error al eliminar usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

function queryParamAsString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
    return value[0];
  }
  return '';
}

export const searchCustomers = async (req: Request, res: Response) => {
  try {
    const { email, name } = req.query;
    const emailStr = queryParamAsString(email);
    const nameStr = queryParamAsString(name);

    if (!emailStr && !nameStr) {
      return res
        .status(400)
        .json({ message: 'Email o nombre es requerido para buscar clientes' });
    }

    // Usar OR en lugar de AND para buscar en cualquiera de los campos
    const whereClause: {
      role: string;
      [key: symbol]: Array<
        | { email?: { [key: symbol]: string } }
        | { name?: { [key: symbol]: string } }
      >;
    } = {
      role: 'customer',
      [Op.or]: [],
    };

    if (emailStr) {
      whereClause[Op.or].push({
        email: { [Op.iLike]: `%${emailStr}%` },
      });
    }

    if (nameStr) {
      whereClause[Op.or].push({
        name: { [Op.iLike]: `%${nameStr}%` },
      });
    }

    const customers = await User.findAll({
      where: whereClause,
      attributes: ['id', 'name', 'email', 'phone', 'status', 'createdAt'],
      limit: 10,
    });

    res.json(customers);
  } catch (error) {
    logger.error('Error al buscar clientes:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const uploadAvatar = async (req: Request, res: Response) => {
  try {
    const user = req.user as { id: string };

    if (!req.file) {
      return res
        .status(400)
        .json({ message: 'No se proporcionó archivo de avatar' });
    }

    // Subir avatar a Supabase Storage
    const uploadResult = await storageService.uploadAvatar(user.id, req.file);

    // Obtener el usuario actual para eliminar el avatar anterior si existe
    const currentUser = await User.findByPk(user.id);
    if (currentUser?.avatar) {
      // Extraer el path del avatar anterior de la URL
      const oldAvatarPath = currentUser.avatar.split('/').slice(-2).join('/');
      await storageService.deleteAvatar(oldAvatarPath).catch(() => {
        // Ignorar errores al eliminar avatar anterior
      });
    }

    // Actualizar el usuario con la nueva URL del avatar
    await User.update({ avatar: uploadResult.url }, { where: { id: user.id } });

    res.json({
      message: 'Avatar actualizado correctamente',
      avatarUrl: uploadResult.url,
    });
  } catch (error) {
    logger.error('Error al subir avatar:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};
