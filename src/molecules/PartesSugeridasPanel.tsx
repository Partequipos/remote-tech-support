import { Package, Plus, Trash2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { ParteSugerida } from '../types';
import {
  createEmptyParteSugerida,
  normalizePartesSugeridas,
} from '../utils/partesSugeridas';

interface PartesSugeridasPanelProps {
  partes: ParteSugerida[];
  canEdit: boolean;
  onSave?: (partes: ParteSugerida[]) => void | Promise<void>;
}

export const PartesSugeridasPanel: React.FC<PartesSugeridasPanelProps> = ({
  partes,
  canEdit,
  onSave,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<ParteSugerida[]>(partes);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setDraft(partes.length > 0 ? partes : []);
    }
  }, [partes, isEditing]);

  const handleStartEdit = () => {
    setDraft(partes.length > 0 ? [...partes] : [createEmptyParteSugerida()]);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setDraft(partes);
  };

  const updateRow = (
    index: number,
    field: keyof ParteSugerida,
    value: string
  ) => {
    setDraft(prev =>
      prev.map((row, i) => {
        if (i !== index) return row;
        if (field === 'cantidad') {
          const n = Number(value);
          return { ...row, cantidad: Number.isFinite(n) ? n : 0 };
        }
        return { ...row, [field]: value };
      })
    );
  };

  const handleSave = () => {
    if (!onSave || isSaving) return;
    const normalized = normalizePartesSugeridas(draft);
    const hasIncomplete = draft.some(row => {
      const num = row.parteNumero.trim();
      const desc = row.descripcion.trim();
      const qty = Number(row.cantidad);
      const empty = !num && !desc && !(qty > 0);
      if (empty) return false;
      return !(qty > 0 && (num || desc));
    });
    if (hasIncomplete) {
      toast.error(
        'Complete número o descripción y una cantidad válida en cada parte, o elimine la fila vacía'
      );
      return;
    }

    setIsSaving(true);
    Promise.resolve(onSave(normalized))
      .then(() => {
        setIsEditing(false);
        toast.success('Partes sugeridas guardadas');
      })
      .catch(() => toast.error('No se pudieron guardar las partes sugeridas'))
      .finally(() => setIsSaving(false));
  };

  return (
    <div>
      <h3 className='text-base font-medium mb-2 flex items-center gap-2'>
        <Package size={16} className='text-primary' />
        Partes sugeridas
      </h3>

      {isEditing ? (
        <div className='space-y-3'>
          <p className='text-xs text-muted-foreground'>
            Recomendación opcional al cliente: número de parte, descripción y
            cantidad.
          </p>
          {draft.map((row, index) => (
            <div
              key={`parte-${index}`}
              className='grid grid-cols-1 sm:grid-cols-12 gap-2 rounded-md border border-border p-3'
            >
              <div className='sm:col-span-3'>
                <Input
                  id={`parte-numero-${index}`}
                  label='Nº parte'
                  value={row.parteNumero}
                  onChange={e =>
                    updateRow(index, 'parteNumero', e.target.value)
                  }
                  placeholder='Ej: 123-456'
                  maxLength={120}
                />
              </div>
              <div className='sm:col-span-6'>
                <Input
                  id={`parte-desc-${index}`}
                  label='Descripción'
                  value={row.descripcion}
                  onChange={e =>
                    updateRow(index, 'descripcion', e.target.value)
                  }
                  placeholder='Descripción de la parte'
                  maxLength={500}
                />
              </div>
              <div className='sm:col-span-2'>
                <Input
                  id={`parte-cant-${index}`}
                  label='Cantidad'
                  type='number'
                  min={1}
                  step={1}
                  value={row.cantidad || ''}
                  onChange={e => updateRow(index, 'cantidad', e.target.value)}
                />
              </div>
              <div className='sm:col-span-1 flex items-end'>
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  aria-label={`Eliminar parte ${index + 1}`}
                  onClick={() =>
                    setDraft(prev => prev.filter((_, i) => i !== index))
                  }
                  disabled={isSaving}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          ))}
          <div className='flex flex-wrap gap-2'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              leftIcon={<Plus size={14} />}
              onClick={() =>
                setDraft(prev => [...prev, createEmptyParteSugerida()])
              }
              disabled={isSaving}
            >
              Agregar parte
            </Button>
            <Button
              type='button'
              variant='primary'
              size='sm'
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? 'Guardando...' : 'Guardar'}
            </Button>
            <Button
              type='button'
              variant='ghost'
              size='sm'
              onClick={handleCancel}
              disabled={isSaving}
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <div className='bg-muted/50 p-3 rounded-md'>
          {partes.length > 0 ? (
            <div className='overflow-x-auto'>
              <table className='w-full text-sm'>
                <thead>
                  <tr className='text-left text-muted-foreground border-b border-border'>
                    <th className='py-2 pr-3 font-medium'>Nº parte</th>
                    <th className='py-2 pr-3 font-medium'>Descripción</th>
                    <th className='py-2 font-medium'>Cant.</th>
                  </tr>
                </thead>
                <tbody>
                  {partes.map((parte, index) => (
                    <tr
                      key={`${parte.parteNumero}-${index}`}
                      className='border-b border-border/60 last:border-0'
                    >
                      <td className='py-2 pr-3 font-mono'>
                        {parte.parteNumero || '—'}
                      </td>
                      <td className='py-2 pr-3'>{parte.descripcion || '—'}</td>
                      <td className='py-2 font-semibold'>{parte.cantidad}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className='text-sm text-muted-foreground'>
              Sin partes sugeridas. El técnico puede agregar recomendaciones
              opcionales para el cliente.
            </p>
          )}
          {canEdit && onSave ? (
            <Button
              variant='outline'
              size='sm'
              className='mt-2'
              onClick={handleStartEdit}
            >
              {partes.length > 0 ? 'Editar partes' : 'Agregar partes sugeridas'}
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
};
