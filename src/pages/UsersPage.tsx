import {
  AlertCircle,
  Edit,
  Filter,
  Mail,
  Phone,
  Search,
  Trash2,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Avatar } from '../atoms/Avatar';
import { Badge } from '../atoms/Badge';
import { Button } from '../atoms/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../atoms/Card';
import { Input } from '../atoms/Input';
import { Spinner } from '../atoms/Spinner';
import { useAuth } from '../context/AuthContext';
import { CreateUserForm } from '../molecules/CreateUserForm';
import { userService } from '../services/api';
import { CreateUserData, User } from '../types';

export const UsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    userId: string;
    userName: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<User['role'] | 'all'>('all');

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await userService.getUsers();
      setUsers(data);
    } catch (err) {
      setError('Error al cargar los usuarios');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (userData: CreateUserData) => {
    try {
      await userService.createUser(userData);
      await fetchUsers();
      setIsCreatingUser(false);
      toast.success('Usuario creado exitosamente');
    } catch (err) {
      console.error('Error al crear usuario:', err);
      toast.error('Error al crear usuario');
      throw err;
    }
  };

  const handleEditUser = async (userData: CreateUserData) => {
    if (!editingUser) return;

    try {
      await userService.updateUser(editingUser.id, userData);
      await fetchUsers();
      setEditingUser(null);
      toast.success('Usuario actualizado exitosamente');
    } catch (err) {
      console.error('Error al actualizar usuario:', err);
      toast.error(
        err instanceof Error ? err.message : 'Error al actualizar usuario'
      );
      throw err;
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      setIsDeleting(true);
      await userService.deleteUser(userId);
      await fetchUsers();
      setDeleteConfirm(null);
      toast.success('Usuario eliminado exitosamente');
    } catch (err) {
      console.error('Error al eliminar usuario:', err);
      toast.error('Error al eliminar usuario');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteClick = (userId: string, userName: string) => {
    setDeleteConfirm({ userId, userName });
  };

  const handleDeleteCancel = () => {
    setDeleteConfirm(null);
  };

  const handleEditClick = (user: User) => {
    setEditingUser(user);
  };

  const handleEditCancel = () => {
    setEditingUser(null);
  };

  // Verificar si el usuario actual es administrador
  const isAdmin = currentUser?.role === 'admin';

  // Filtrar usuarios según búsqueda y rol
  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  // Ordenar usuarios: Admin primero, luego técnicos, luego clientes
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const roleOrder = { admin: 0, technician: 1, customer: 2 };
    const roleComparison = roleOrder[a.role] - roleOrder[b.role];
    if (roleComparison !== 0) return roleComparison;
    
    // Si tienen el mismo rol, ordenar alfabéticamente por nombre
    return a.name.localeCompare(b.name);
  });

  if (isLoading) {
    return (
      <div className='flex items-center justify-center h-full'>
        <Spinner size='lg' />
      </div>
    );
  }

  if (error) {
    return (
      <div className='flex items-center justify-center h-full'>
        <div className='text-center'>
          <AlertCircle size={48} className='text-destructive mx-auto mb-4' />
          <h2 className='text-xl font-semibold mb-2'>
            Error al Cargar los Usuarios
          </h2>
          <p className='text-muted-foreground mb-4'>{error}</p>
          <Button onClick={() => window.location.reload()}>
            Intentar de Nuevo
          </Button>
        </div>
      </div>
    );
  }

  const getRoleTranslation = (role: User['role']) => {
    const translations = {
      admin: 'Administrador',
      technician: 'Técnico',
      customer: 'Cliente',
    };
    return translations[role];
  };

  return (
    <div className='space-y-6'>
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
        <h1 className='text-2xl font-bold'>Usuarios</h1>
        {isAdmin && (
          <Button
            leftIcon={<UserCog size={18} />}
            onClick={() => setIsCreatingUser(true)}
          >
            Agregar Usuario
          </Button>
        )}
      </div>

      {/* Filtros de búsqueda */}
      <div className='flex flex-col md:flex-row gap-4'>
        <div className='w-full md:max-w-md'>
          <Input
            placeholder='Buscar por nombre o email...'
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            leftIcon={<Search size={18} />}
          />
        </div>

        <div className='inline-flex items-center rounded-md border border-input bg-background px-3 h-10 text-sm'>
          <Filter size={16} className='mr-2 text-muted-foreground' />
          <span className='text-muted-foreground mr-2'>Rol:</span>
          <select
            className='bg-transparent border-none outline-none'
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value as User['role'] | 'all')}
          >
            <option value='all'>Todos</option>
            <option value='admin'>Administrador</option>
            <option value='technician'>Técnico</option>
            <option value='customer'>Cliente</option>
          </select>
        </div>
      </div>

      {isCreatingUser && (
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle>Crear Nuevo Usuario</CardTitle>
            <Button
              variant='ghost'
              size='icon'
              onClick={() => setIsCreatingUser(false)}
            >
              <X size={18} />
            </Button>
          </CardHeader>
          <CardContent>
            <CreateUserForm
              onSubmit={handleCreateUser}
              onCancel={() => setIsCreatingUser(false)}
            />
          </CardContent>
        </Card>
      )}

      {editingUser && (
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle>Editar Usuario: {editingUser.name}</CardTitle>
            <Button variant='ghost' size='icon' onClick={handleEditCancel}>
              <X size={18} />
            </Button>
          </CardHeader>
          <CardContent>
            <CreateUserForm
              onSubmit={handleEditUser}
              onCancel={handleEditCancel}
              isEditing={true}
              initialData={{
                name: editingUser.name,
                email: editingUser.email,
                password: '', // No mostrar contraseña actual
                role: editingUser.role,
                phone: editingUser.phone,
              }}
            />
          </CardContent>
        </Card>
      )}

      {sortedUsers.length > 0 ? (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
          {sortedUsers.map(user => (
          <Card key={user.id}>
            <CardContent className='p-6'>
              <div className='flex items-start gap-4'>
                <Avatar src={user.avatar} size='lg' status={user.status} />
                <div className='flex-1 min-w-0'>
                  <div className='flex items-start justify-between'>
                    <div className='flex-1 min-w-0'>
                      <h3 className='text-lg font-semibold truncate'>
                        {user.name}
                      </h3>
                      <div className='flex items-center gap-2 text-sm text-muted-foreground mb-2'>
                        <Mail size={14} />
                        <span className='truncate'>{user.email}</span>
                      </div>
                      {user.phone && (
                        <div className='flex items-center gap-2 text-sm text-muted-foreground mb-2'>
                          <Phone size={14} />
                          <span className='truncate'>{user.phone}</span>
                        </div>
                      )}
                      <Badge
                        variant={
                          user.role === 'admin'
                            ? 'primary'
                            : user.role === 'technician'
                            ? 'secondary'
                            : 'default'
                        }
                        className='capitalize'
                      >
                        {getRoleTranslation(user.role)}
                      </Badge>
                    </div>
                    {isAdmin && (
                      <div className='flex gap-1 ml-2'>
                        <Button
                          variant='ghost'
                          size='icon'
                          onClick={() => handleEditClick(user)}
                          className='h-8 w-8'
                          title='Editar usuario'
                        >
                          <Edit size={16} />
                        </Button>
                        <Button
                          variant='ghost'
                          size='icon'
                          onClick={() => handleDeleteClick(user.id, user.name)}
                          className='h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10'
                          title='Eliminar usuario'
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          ))}
        </div>
      ) : (
        <div className='text-center py-12'>
          <Users size={48} className='mx-auto mb-4 text-muted-foreground' />
          <h3 className='text-lg font-semibold mb-2'>No se encontraron usuarios</h3>
          <p className='text-muted-foreground'>
            {searchTerm || roleFilter !== 'all'
              ? 'Intenta con otros criterios de búsqueda'
              : 'No hay usuarios registrados'}
          </p>
        </div>
      )}

      {/* Modal de confirmación para eliminar */}
      {deleteConfirm && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
          <div className='bg-white rounded-lg p-6 w-full max-w-md'>
            <h3 className='text-lg font-semibold mb-4'>
              Confirmar eliminación
            </h3>
            <p className='text-gray-600 mb-6'>
              ¿Estás seguro de que quieres eliminar al usuario "
              {deleteConfirm.userName}"? Esta acción no se puede deshacer.
            </p>
            <div className='flex justify-end gap-3'>
              <Button
                variant='outline'
                onClick={handleDeleteCancel}
                disabled={isDeleting}
              >
                Cancelar
              </Button>
              <Button
                variant='destructive'
                onClick={() => handleDeleteUser(deleteConfirm.userId)}
                disabled={isDeleting}
                isLoading={isDeleting}
              >
                {isDeleting ? 'Eliminando...' : 'Eliminar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
