import React, { useState } from 'react';
import { CreateUserData } from '../types';
import { useAuth } from '../context/AuthContext';
import { Input } from '../atoms/Input';
import { Button } from '../atoms/Button';
import { Select } from '../atoms/Select';
import { Mail, User as UserIcon, Shield, Lock, Phone } from 'lucide-react';

interface CreateUserFormProps {
  onSubmit: (userData: CreateUserData) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<CreateUserData>;
  isEditing?: boolean;
}

export const CreateUserForm: React.FC<CreateUserFormProps> = ({ onSubmit, onCancel, initialData, isEditing = false }) => {
  const { user: currentUser } = useAuth();
  const [formData, setFormData] = useState<CreateUserData>({
    name: initialData?.name || '',
    email: initialData?.email || '',
    password: initialData?.password || '',
    role: initialData?.role || 'customer',
    phone: initialData?.phone || ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await onSubmit(formData);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error al guardar el usuario'
      );
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const availableRoles = [
    { value: 'customer', label: 'Cliente' },
    { value: 'technician', label: 'Técnico' },
    ...(currentUser?.role === 'admin' ? [{ value: 'admin', label: 'Administrador' }] : [])
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <Input
        id="name"
        label="Nombre"
        value={formData.name}
        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
        leftIcon={<UserIcon size={18} />}
        required
      />

      <Input
        id="email"
        type="email"
        label="Email"
        value={formData.email}
        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
        leftIcon={<Mail size={18} />}
        required
      />

      <Input
        id="phone"
        type="tel"
        label="Teléfono"
        value={formData.phone}
        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
        leftIcon={<Phone size={18} />}
        placeholder="+57 300 123 4567"
      />

      <Input
        id="password"
        type="password"
        label={isEditing ? "Nueva Contraseña (dejar vacío para mantener la actual)" : "Contraseña"}
        value={formData.password}
        onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
        leftIcon={<Lock size={18} />}
        required={!isEditing}
        minLength={6}
        placeholder={isEditing ? "Dejar vacío para mantener la contraseña actual" : ""}
      />

      <div className="space-y-1">
        <label className="block text-sm font-medium text-foreground">
          Rol
        </label>
        <Select
          value={formData.role}
          onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as CreateUserData['role'] }))}
          leftIcon={<Shield size={18} />}
          required
        >
          {availableRoles.map(role => (
            <option key={role.value} value={role.value}>
              {role.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          isLoading={isLoading}
        >
          {isEditing ? 'Actualizar Usuario' : 'Crear Usuario'}
        </Button>
      </div>
    </form>
  );
}; 