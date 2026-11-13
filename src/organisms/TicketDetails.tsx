import {
  Calendar,
  CheckCircle,
  Clock,
  ClipboardList,
  Forward,
  Layers,
  MessageSquare,
  Pencil,
  Play,
  RefreshCw,
  Tag,
  UserPlus,
  Video,
  XCircle,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Avatar } from '../atoms/Avatar';
import { Badge } from '../atoms/Badge';
import { Button } from '../atoms/Button';
import { Card, CardContent, CardFooter, CardHeader } from '../atoms/Card';
import { Input } from '../atoms/Input';
import { Select } from '../atoms/Select';
import { Textarea } from '../atoms/Textarea';
import { toast } from 'react-hot-toast';
import { Ticket, TicketEditPayload, User } from '../types';
import {
  formatActualMinutesAsHours,
  hoursToActualMinutes,
} from '../utils/supportDuration';

const STATUS_NEEDS_DURATION = new Set<Ticket['status']>([
  'closed',
  'redirected',
]);

const MARCAS = ['Case', 'Dynapac', 'Hitachi', 'Liugong', 'Okada', 'Yanmar'];

const PRIORITY_OPTIONS: { value: Ticket['priority']; label: string }[] = [
  { value: 'low', label: 'Baja' },
  { value: 'medium', label: 'Media' },
  { value: 'high', label: 'Alta' },
  { value: 'urgent', label: 'Urgente' },
];

function buildEditFormFromTicket(ticket: Ticket): TicketEditPayload {
  return {
    title: ticket.title,
    description: ticket.description,
    priority: ticket.priority,
    marca: ticket.marca ?? '',
    modeloEquipo: ticket.modeloEquipo ?? '',
    serial: ticket.serial ?? '',
  };
}

function resolveTicketEditAccess(
  currentUser: User | undefined,
  ticket: Ticket,
  onUpdateTicket?: (payload: TicketEditPayload) => void | Promise<void>
): { canEditTicket: boolean; canEditPriorityAndEquipo: boolean } {
  const isStaff =
    currentUser?.role === 'admin' || currentUser?.role === 'technician';
  const isCustomerOwner =
    currentUser?.role === 'customer' && currentUser.id === ticket.customerId;
  const canEditTicket =
    Boolean(onUpdateTicket) &&
    ticket.status !== 'closed' &&
    (isStaff || isCustomerOwner);
  return { canEditTicket, canEditPriorityAndEquipo: Boolean(isStaff) };
}

function EquipoInfoSummary({
  marca,
  modeloEquipo,
  serial,
}: {
  marca?: string | null;
  modeloEquipo?: string | null;
  serial?: string | null;
}) {
  const marcaLabel = marca?.trim() ?? '';
  const modeloLabel = modeloEquipo?.trim() ?? '';
  const serialLabel = serial?.trim() ?? '';
  if (!marcaLabel && !modeloLabel && !serialLabel) return null;

  return (
    <div className='mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm'>
      {marcaLabel ? (
        <div className='rounded-md border border-border bg-muted/30 px-3 py-2'>
          <p className='text-xs text-muted-foreground'>Marca</p>
          <p className='font-medium'>{marcaLabel}</p>
        </div>
      ) : null}
      {modeloLabel ? (
        <div className='rounded-md border border-border bg-muted/30 px-3 py-2'>
          <p className='text-xs text-muted-foreground'>Modelo</p>
          <p className='font-medium'>{modeloLabel}</p>
        </div>
      ) : null}
      {serialLabel ? (
        <div className='rounded-md border border-border bg-muted/30 px-3 py-2'>
          <p className='text-xs text-muted-foreground'>Serial</p>
          <p className='font-medium font-mono'>{serialLabel}</p>
        </div>
      ) : null}
    </div>
  );
}

/** Lista de sistemas que el técnico puede seleccionar como comprometidos en la falla */
const SISTEMAS_OPTIONS = [
  'Motor (Pistones, cigüeñal, bielas, culata, árbol de levas, válvulas)',
  'Turbocargador y Posenfriador',
  'Inyectores y Bomba de inyección',
  'Radiador, Bomba de agua y Termostato',
  'Alternador, Baterías y Motor de arranque',
  'Convertidor de par',
  'Transmisión (Planetarios, embragues, ejes)',
  'Diferenciales y Semiejes',
  'Mandos finales y Sellos Duo-Cone',
  'Bombas hidráulicas (Principal y de pilotaje)',
  'Banco de válvulas de control',
  'Cilindros hidráulicos (Vástagos, sellos, émbolos)',
  'Motores de giro y Motores de traslación',
  'Mangueras y Acoples de alta presión',
  'Tanques (Combustible, aceite hidráulico, DEF)',
  'Filtros (Aire, aceite, combustible, hidráulico)',
  'Cadenas, Eslabones, Bujes y Pasadores',
  'Zapatas y Pernos de zapata',
  'Rodillos (Superiores e inferiores)',
  'Rueda guía (Idler) y Rueda dentada (Sprocket)',
  'Neumáticos, Rines y Masas',
  'Bastidor (Chasis) y Contrapesos',
  'Cojinete de giro (Tornamesa)',
  'Articulaciones y Osciladores',
  'Pluma (Boom) y Brazo (Stick)',
  'Cucharón, Dientes, Adaptadores y Cuchillas',
  'Cabina (Asiento, mandos, pedales)',
  'Módulos de Control Electrónico (ECM)',
  'Sensores y Arneses eléctricos',
  'Panel de instrumentos y Pantallas de monitoreo',
  'Estructuras ROPS y FOPS',
  'Frenos de disco y Acumuladores de freno',
  'Unidades de dirección (Orbitroles y cilindros)',
  'Sistema de escape y Silenciadores',
  'Sistema post-tratamiento de gases',
];

const STATUS_VARIANT_MAP: Record<
  Ticket['status'],
  'primary' | 'secondary' | 'success' | 'default'
> = {
  open: 'primary',
  in_progress: 'secondary',
  resolved: 'success',
  closed: 'default',
  redirected: 'secondary',
};

const PRIORITY_VARIANT_MAP: Record<
  Ticket['priority'],
  'primary' | 'secondary' | 'success' | 'default'
> = {
  low: 'default',
  medium: 'secondary',
  high: 'primary',
  urgent: 'success',
};

const STATUS_TRANSLATIONS: Record<Ticket['status'], string> = {
  open: 'abierto',
  in_progress: 'en progreso',
  resolved: 'resuelto',
  closed: 'cerrado',
  redirected: 'redireccionado',
};

const PRIORITY_TRANSLATIONS: Record<Ticket['priority'], string> = {
  low: 'baja',
  medium: 'media',
  high: 'alta',
  urgent: 'urgente',
};

const OBSERVATIONS_TEXTAREA_ID = 'ticket-observations-textarea';

const TicketNumberAndModelBadges: React.FC<{
  ticketId: string;
  modeloEquipo?: string | null;
  serial?: string | null;
  formatTicketId: (id: string) => string;
}> = ({ ticketId, modeloEquipo, serial, formatTicketId }) => (
  <>
    <Badge>#{formatTicketId(ticketId)}</Badge>
    {modeloEquipo?.trim() ? (
      <Badge
        variant='secondary'
        className='max-w-[min(100%,280px)] truncate font-normal'
        title={modeloEquipo.trim()}
      >
        {modeloEquipo.trim()}
      </Badge>
    ) : null}
    {serial?.trim() ? (
      <Badge
        variant='default'
        className='max-w-[min(100%,220px)] truncate font-mono text-xs font-normal'
        title={serial.trim()}
      >
        S/N: {serial.trim()}
      </Badge>
    ) : null}
  </>
);

/** Normaliza un nombre de sistema para usarlo como id de input. */
function sistemaToInputId(sistema: string): string {
  // replaceAll requiere ES2021; replace con regex global es equivalente aquí
  return sistema.replace(/\s+/g, '-'); // NOSONAR
}

const SupportDurationInput: React.FC<{
  id: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  reminder?: boolean;
}> = ({ id, value, onChange, required = false, reminder = false }) => (
  <div
    className={
      reminder
        ? 'space-y-2 rounded-lg border-2 border-red-600 bg-red-50 p-3 dark:border-red-500 dark:bg-red-950/40'
        : 'space-y-2'
    }
  >
    <label
      htmlFor={id}
      className={
        reminder
          ? 'block text-sm font-bold text-red-700 dark:text-red-400'
          : 'block text-sm font-medium'
      }
    >
      Tiempo de duración del soporte remoto (horas)
      {required ? ' *' : ''}
    </label>
    {reminder ? (
      <p className='text-xs font-medium text-red-700 dark:text-red-300'>
        Recuerde indicar cuántas horas duró el soporte remoto antes de
        confirmar.
      </p>
    ) : null}
    <Input
      id={id}
      type='number'
      inputMode='decimal'
      min={0.25}
      step={0.25}
      required={required}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder='Ej: 1.5'
      className={
        reminder
          ? 'border-red-500 font-semibold text-red-800 focus-visible:ring-red-600 dark:border-red-400 dark:text-red-200'
          : undefined
      }
    />
  </div>
);

interface ObservationsModalProps {
  show: boolean;
  pendingStatus: Ticket['status'] | null;
  technicalObservations: string;
  onObservationsChange: (value: string) => void;
  duracionHoras: string;
  onDuracionHorasChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  isChangingStatus: boolean;
}

const ObservationsModal: React.FC<ObservationsModalProps> = ({
  show,
  pendingStatus,
  technicalObservations,
  onObservationsChange,
  duracionHoras,
  onDuracionHorasChange,
  onConfirm,
  onCancel,
  isChangingStatus,
}) => {
  if (!show) return null;
  const statusLabel = pendingStatus
    ? STATUS_TRANSLATIONS[pendingStatus]
    : '';
  const askDuration =
    pendingStatus !== null && STATUS_NEEDS_DURATION.has(pendingStatus);
  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
      <div className='bg-background rounded-lg p-6 w-full max-w-md mx-4 shadow-xl space-y-4'>
        <h3 className='text-lg font-semibold'>
          Cambiar estado a: {statusLabel}
        </h3>
        {askDuration ? (
          <SupportDurationInput
            id='status-duracion-horas'
            value={duracionHoras}
            onChange={onDuracionHorasChange}
            required
            reminder
          />
        ) : null}
        <div>
          <label
            htmlFor={OBSERVATIONS_TEXTAREA_ID}
            className='block text-sm font-medium mb-2'
          >
            Observaciones Técnicas (opcional)
          </label>
          <Textarea
            id={OBSERVATIONS_TEXTAREA_ID}
            value={technicalObservations}
            onChange={e => onObservationsChange(e.target.value)}
            placeholder='Ingrese observaciones técnicas sobre este cambio de estado...'
            rows={4}
            className='w-full'
          />
        </div>
        <div className='flex gap-2 justify-end'>
          <Button variant='outline' onClick={onCancel} disabled={isChangingStatus}>
            Cancelar
          </Button>
          <Button
            variant='primary'
            onClick={onConfirm}
            disabled={isChangingStatus}
          >
            {isChangingStatus ? 'Procesando...' : 'Confirmar'}
          </Button>
        </div>
      </div>
    </div>
  );
};

interface TicketDetailsFooterProps {
  status: Ticket['status'];
  canChangeStatus: boolean;
  isChangingStatus: boolean;
  onStartChat: () => void;
  onStartCall: () => void;
  onStatusChange: (s: Ticket['status']) => void;
  onOpenCloseModal: () => void;
}

const TicketDetailsFooter: React.FC<TicketDetailsFooterProps> = ({
  status,
  canChangeStatus,
  isChangingStatus,
  onStartChat,
  onStartCall,
  onStatusChange,
  onOpenCloseModal,
}) => (
  <CardFooter className='border-t pt-4 flex flex-col sm:flex-row gap-2'>
    <Button variant='outline' leftIcon={<MessageSquare size={16} />} onClick={onStartChat} className='w-full sm:w-auto'>
      Chat
    </Button>
    <Button leftIcon={<Video size={16} />} onClick={onStartCall} className='w-full sm:w-auto'>
      Videollamada
    </Button>
    {canChangeStatus && status === 'open' && (
      <Button
        variant='secondary'
        leftIcon={<Play size={16} />}
        onClick={() => onStatusChange('in_progress')}
        disabled={isChangingStatus}
        className='w-full sm:w-auto'
      >
        {isChangingStatus ? 'Procesando...' : 'En Progreso'}
      </Button>
    )}
    {canChangeStatus && status !== 'resolved' && status !== 'closed' && status !== 'redirected' && (
      <Button
        variant='secondary'
        leftIcon={<Forward size={16} />}
        onClick={() => onStatusChange('redirected')}
        disabled={isChangingStatus}
        className='w-full sm:w-auto'
      >
        {isChangingStatus ? 'Procesando...' : 'Redireccionado'}
      </Button>
    )}
    {status !== 'resolved' && status !== 'closed' && (
      <Button
        variant='success'
        leftIcon={<CheckCircle size={16} />}
        onClick={() => onStatusChange('resolved')}
        disabled={isChangingStatus}
        className='w-full sm:w-auto sm:ml-auto'
      >
        {isChangingStatus ? 'Procesando...' : 'Marcar como Resuelto'}
      </Button>
    )}
    {status !== 'closed' && status === 'resolved' && canChangeStatus && (
      <Button
        variant='outline'
        leftIcon={<XCircle size={16} />}
        onClick={onOpenCloseModal}
        disabled={isChangingStatus}
        className='w-full sm:w-auto sm:ml-auto'
      >
        {isChangingStatus ? 'Procesando...' : 'Cerrar Ticket'}
      </Button>
    )}
    {status !== 'closed' && status === 'resolved' && !canChangeStatus && (
      <Button
        variant='outline'
        leftIcon={<XCircle size={16} />}
        onClick={() => onStatusChange('closed')}
        disabled={isChangingStatus}
        className='w-full sm:w-auto sm:ml-auto'
      >
        {isChangingStatus ? 'Procesando...' : 'Cerrar Ticket'}
      </Button>
    )}
  </CardFooter>
);

interface TicketEditFormProps {
  form: TicketEditPayload;
  canEditPriorityAndEquipo: boolean;
  isSaving: boolean;
  onChange: (next: TicketEditPayload) => void;
  onSave: () => void;
  onCancel: () => void;
}

const TicketEditForm: React.FC<TicketEditFormProps> = ({
  form,
  canEditPriorityAndEquipo,
  isSaving,
  onChange,
  onSave,
  onCancel,
}) => {
  const titleOk = form.title.trim().length > 0;
  const descriptionOk = form.description.trim().length > 0;
  const canSave = titleOk && descriptionOk && !isSaving;

  return (
    <div className='space-y-4 rounded-md border border-border bg-muted/20 p-4'>
      <h3 className='text-base font-medium flex items-center gap-2'>
        <Pencil size={16} className='text-primary' />
        Editar ticket
      </h3>

      <div className='space-y-2'>
        <label htmlFor='edit-ticket-title' className='text-sm font-medium'>
          Título
        </label>
        <Input
          id='edit-ticket-title'
          value={form.title}
          onChange={e => onChange({ ...form, title: e.target.value })}
          placeholder='Título del ticket'
          required
          maxLength={255}
        />
      </div>

      <div className='space-y-2'>
        <label htmlFor='edit-ticket-description' className='text-sm font-medium'>
          Descripción
        </label>
        <Textarea
          id='edit-ticket-description'
          value={form.description}
          onChange={e => onChange({ ...form, description: e.target.value })}
          placeholder='Describe el problema o solicitud'
          rows={4}
          required
        />
      </div>

      {canEditPriorityAndEquipo ? (
        <>
          <div className='space-y-2'>
            <label htmlFor='edit-ticket-priority' className='text-sm font-medium'>
              Prioridad
            </label>
            <Select
              id='edit-ticket-priority'
              value={form.priority ?? 'medium'}
              onChange={e =>
                onChange({
                  ...form,
                  priority: e.target.value as Ticket['priority'],
                })
              }
            >
              {PRIORITY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
            <div className='space-y-2'>
              <label htmlFor='edit-ticket-marca' className='text-sm font-medium'>
                Marca
              </label>
              <Select
                id='edit-ticket-marca'
                value={form.marca ?? ''}
                onChange={e => onChange({ ...form, marca: e.target.value })}
              >
                <option value=''>Seleccione...</option>
                {MARCAS.map(m => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
            </div>
            <div className='space-y-2'>
              <label htmlFor='edit-ticket-modelo' className='text-sm font-medium'>
                Modelo
              </label>
              <Input
                id='edit-ticket-modelo'
                value={form.modeloEquipo ?? ''}
                onChange={e =>
                  onChange({ ...form, modeloEquipo: e.target.value })
                }
                placeholder='Modelo del equipo'
                maxLength={255}
              />
            </div>
            <div className='space-y-2'>
              <label htmlFor='edit-ticket-serial' className='text-sm font-medium'>
                Serial
              </label>
              <Input
                id='edit-ticket-serial'
                value={form.serial ?? ''}
                onChange={e => onChange({ ...form, serial: e.target.value })}
                placeholder='S/N'
                maxLength={120}
                autoComplete='off'
              />
            </div>
          </div>
        </>
      ) : null}

      <div className='flex flex-wrap gap-2'>
        <Button
          variant='primary'
          size='sm'
          onClick={onSave}
          disabled={!canSave}
        >
          {isSaving ? 'Guardando...' : 'Guardar cambios'}
        </Button>
        <Button
          variant='ghost'
          size='sm'
          onClick={onCancel}
          disabled={isSaving}
        >
          Cancelar
        </Button>
      </div>
    </div>
  );
};

interface TicketDetailsProps {
  ticket: Ticket;
  customer?: User;
  technician?: User;
  currentUser?: User;
  availableTechnicians?: User[];
  onStartCall: () => void;
  onStartChat: () => void;
  onChangeStatus: (
    status: Ticket['status'],
    technicalObservations?: string,
    actualTimeMinutes?: number
  ) => void | Promise<void>;
  onAssignTechnician?: (technicianId: string) => void;
  onUpdateSistemas?: (sistemas: string[]) => void | Promise<void>;
  onUpdateTicket?: (payload: TicketEditPayload) => void | Promise<void>;
  onUpdateActualTime?: (actualTimeMinutes: number) => void | Promise<void>;
}

export const TicketDetails: React.FC<TicketDetailsProps> = ({
  ticket,
  customer,
  technician,
  currentUser,
  availableTechnicians,
  onStartCall,
  onStartChat,
  onChangeStatus,
  onAssignTechnician,
  onUpdateSistemas,
  onUpdateTicket,
  onUpdateActualTime,
}) => {
  const [isAssigningTechnician, setIsAssigningTechnician] = useState(false);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>('');
  const [showObservationsModal, setShowObservationsModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<Ticket['status'] | null>(null);
  const [technicalObservations, setTechnicalObservations] = useState('');
  const [duracionHoras, setDuracionHoras] = useState(
    () => formatActualMinutesAsHours(ticket.actualTime) ?? ''
  );
  const [panelDuracionHoras, setPanelDuracionHoras] = useState(
    () => formatActualMinutesAsHours(ticket.actualTime) ?? ''
  );
  const [isSavingDuration, setIsSavingDuration] = useState(false);
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [isEditingSistemas, setIsEditingSistemas] = useState(false);
  const [pendingSistemas, setPendingSistemas] = useState<string[]>(
    ticket.sistemas ?? []
  );
  const [isSavingSistemas, setIsSavingSistemas] = useState(false);
  const [isEditingTicket, setIsEditingTicket] = useState(false);
  const [editForm, setEditForm] = useState<TicketEditPayload>(() =>
    buildEditFormFromTicket(ticket)
  );
  const [isSavingTicket, setIsSavingTicket] = useState(false);

  useEffect(() => {
    if (!isEditingSistemas) {
      setPendingSistemas(ticket.sistemas ?? []);
    }
  }, [ticket.sistemas, isEditingSistemas]);

  useEffect(() => {
    if (!isEditingTicket) {
      setEditForm(buildEditFormFromTicket(ticket));
    }
  }, [ticket, isEditingTicket]);

  useEffect(() => {
    const hours = formatActualMinutesAsHours(ticket.actualTime) ?? '';
    setPanelDuracionHoras(hours);
    if (!showObservationsModal) {
      setDuracionHoras(hours);
    }
  }, [ticket.actualTime, showObservationsModal]);

  const canEditSistemas =
    currentUser &&
    (currentUser.role === 'admin' || currentUser.role === 'technician') &&
    onUpdateSistemas;

  const { canEditTicket, canEditPriorityAndEquipo } = resolveTicketEditAccess(
    currentUser,
    ticket,
    onUpdateTicket
  );

  const handleToggleSistema = (sistema: string) => {
    setPendingSistemas(prev =>
      prev.includes(sistema)
        ? prev.filter(s => s !== sistema)
        : [...prev, sistema]
    );
  };

  const handleSaveSistemas = () => {
    if (!onUpdateSistemas || isSavingSistemas) return;
    setIsSavingSistemas(true);
    Promise.resolve(onUpdateSistemas(pendingSistemas))
      .then(() => setIsEditingSistemas(false))
      .finally(() => setIsSavingSistemas(false));
  };

  const handleStartEditTicket = () => {
    setEditForm(buildEditFormFromTicket(ticket));
    setIsEditingTicket(true);
  };

  const handleCancelEditTicket = () => {
    setIsEditingTicket(false);
    setEditForm(buildEditFormFromTicket(ticket));
  };

  const handleSaveTicket = () => {
    if (!onUpdateTicket || isSavingTicket) return;
    const title = editForm.title.trim();
    const description = editForm.description.trim();
    if (!title || !description) return;

    const payload: TicketEditPayload = { title, description };
    if (canEditPriorityAndEquipo) {
      payload.priority = editForm.priority;
      payload.marca = (editForm.marca ?? '').toString().trim() || null;
      payload.modeloEquipo =
        (editForm.modeloEquipo ?? '').toString().trim() || null;
      payload.serial = (editForm.serial ?? '').toString().trim() || null;
    }

    setIsSavingTicket(true);
    Promise.resolve(onUpdateTicket(payload))
      .then(() => setIsEditingTicket(false))
      .finally(() => setIsSavingTicket(false));
  };

  const {
    id,
    title,
    description,
    status,
    priority,
    createdAt,
    updatedAt,
    tags,
  } = ticket;

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleString('es-ES');

  const formatTicketId = (ticketId: string) =>
    ticketId.substring(0, 8).toUpperCase();

  // Función para manejar la asignación de técnico
  const handleAssignTechnician = () => {
    if (selectedTechnicianId && onAssignTechnician) {
      onAssignTechnician(selectedTechnicianId);
      setIsAssigningTechnician(false);
      setSelectedTechnicianId('');
    }
  };

  // Función para cancelar la asignación
  const handleCancelAssignment = () => {
    setIsAssigningTechnician(false);
    setSelectedTechnicianId('');
  };

  // Función para iniciar la reasignación
  const handleStartReassignment = () => {
    setIsAssigningTechnician(true);
    setSelectedTechnicianId('');
  };

  // Verificar si el usuario puede asignar técnicos
  const canAssignTechnician =
    currentUser &&
    (currentUser.role === 'admin' || currentUser.role === 'technician') &&
    availableTechnicians &&
    availableTechnicians.length > 0;

  // Variable local para el técnico actual
  const currentTechnician = technician;

  // Verificar si el usuario puede cambiar estados (admin o técnico)
  const canChangeStatus =
    currentUser &&
    (currentUser.role === 'admin' || currentUser.role === 'technician');

  const openStatusModal = (newStatus: Ticket['status']) => {
    setPendingStatus(newStatus);
    setDuracionHoras(formatActualMinutesAsHours(ticket.actualTime) ?? '');
    setShowObservationsModal(true);
  };

  // Función para manejar cambio de estado con modal de observaciones
  const handleStatusChange = (newStatus: Ticket['status']) => {
    if (isChangingStatus) return; // Prevenir doble click

    // Para técnicos/admin, mostrar modal de observaciones en cambios importantes
    if (
      canChangeStatus &&
      (newStatus === 'in_progress' ||
        newStatus === 'resolved' ||
        newStatus === 'redirected' ||
        newStatus === 'closed')
    ) {
      openStatusModal(newStatus);
    } else {
      setIsChangingStatus(true);
      void Promise.resolve(onChangeStatus(newStatus)).finally(() => {
        setTimeout(() => setIsChangingStatus(false), 2000);
      });
    }
  };

  const handleConfirmStatusChange = () => {
    if (!pendingStatus || isChangingStatus) return;

    const needsDuration = STATUS_NEEDS_DURATION.has(pendingStatus);
    const actualTimeMinutes = hoursToActualMinutes(duracionHoras);
    if (needsDuration && actualTimeMinutes === null) {
      toast.error(
        'Indique el tiempo de duración del soporte remoto en horas antes de continuar'
      );
      return;
    }

    setIsChangingStatus(true);
    const result = onChangeStatus(
      pendingStatus,
      technicalObservations || undefined,
      needsDuration ? actualTimeMinutes ?? undefined : undefined
    );
    const closeModal = () => {
      setShowObservationsModal(false);
      setPendingStatus(null);
      setTechnicalObservations('');
      setTimeout(() => setIsChangingStatus(false), 2000);
    };
    Promise.resolve(result)
      .then(closeModal)
      .catch(() => setIsChangingStatus(false));
  };

  // Función para cancelar cambio de estado
  const handleCancelStatusChange = () => {
    setShowObservationsModal(false);
    setPendingStatus(null);
    setTechnicalObservations('');
    setDuracionHoras(formatActualMinutesAsHours(ticket.actualTime) ?? '');
  };

  const canEditDuration =
    !!canChangeStatus &&
    !!onUpdateActualTime &&
    STATUS_NEEDS_DURATION.has(status);

  const handleSaveDuration = () => {
    if (!onUpdateActualTime || isSavingDuration) return;
    const minutes = hoursToActualMinutes(panelDuracionHoras);
    if (minutes === null) {
      toast.error(
        'Indique el tiempo de duración del soporte remoto en horas (mayor a 0)'
      );
      return;
    }
    setIsSavingDuration(true);
    Promise.resolve(onUpdateActualTime(minutes))
      .then(() => toast.success('Duración del soporte actualizada'))
      .catch(() => toast.error('No se pudo guardar la duración del soporte'))
      .finally(() => setIsSavingDuration(false));
  };

  return (
    <Card className='h-full flex flex-col'>
      <CardHeader>
        <div className='flex flex-col space-y-3'>
          <div className='flex flex-wrap items-start justify-between gap-2'>
            <div className='flex flex-wrap gap-2 mb-1'>
              <Badge variant={STATUS_VARIANT_MAP[status]} className='capitalize'>
                {STATUS_TRANSLATIONS[status]}
              </Badge>
              <Badge
                variant={PRIORITY_VARIANT_MAP[priority]}
                className='capitalize'
              >
                {PRIORITY_TRANSLATIONS[priority]}
              </Badge>
              <TicketNumberAndModelBadges
                ticketId={id}
                modeloEquipo={ticket.modeloEquipo}
                serial={ticket.serial}
                formatTicketId={formatTicketId}
              />
            </div>
            {canEditTicket && !isEditingTicket ? (
              <Button
                variant='outline'
                size='sm'
                leftIcon={<Pencil size={14} />}
                onClick={handleStartEditTicket}
              >
                Editar
              </Button>
            ) : null}
          </div>

          {!isEditingTicket ? (
            <h2 className='text-xl font-bold'>{title}</h2>
          ) : null}

          <div className='flex flex-wrap gap-2'>
            {(tags ?? []).map(tag => (
              <Badge
                key={tag}
                variant='secondary'
                className='flex items-center gap-1'
              >
                <Tag size={12} />
                {tag}
              </Badge>
            ))}
          </div>

          <div className='flex flex-col sm:flex-row sm:items-center gap-4 text-sm text-muted-foreground pt-1'>
            <div className='flex items-center'>
              <Calendar size={16} className='mr-1.5' />
              <span>Creado: {formatDate(createdAt)}</span>
            </div>

            <div className='flex items-center'>
              <Clock size={16} className='mr-1.5' />
              <span>Actualizado: {formatDate(updatedAt)}</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className='flex-1 overflow-auto'>
        <div className='space-y-6'>
          {isEditingTicket ? (
            <TicketEditForm
              form={editForm}
              canEditPriorityAndEquipo={canEditPriorityAndEquipo}
              isSaving={isSavingTicket}
              onChange={setEditForm}
              onSave={handleSaveTicket}
              onCancel={handleCancelEditTicket}
            />
          ) : (
            <div>
              <h3 className='text-base font-medium mb-2'>Descripción</h3>
              <div className='bg-muted/50 p-3 rounded-md text-sm'>
                {description}
              </div>
              <EquipoInfoSummary
                marca={ticket.marca}
                modeloEquipo={ticket.modeloEquipo}
                serial={ticket.serial}
              />
              {formatActualMinutesAsHours(ticket.actualTime) && !canEditDuration ? (
                <div className='mt-3 rounded-md border border-red-600 bg-red-50 px-3 py-2 dark:border-red-500 dark:bg-red-950/40'>
                  <p className='text-xs font-semibold uppercase tracking-wide text-red-700 dark:text-red-400'>
                    Duración del soporte remoto
                  </p>
                  <p className='text-sm font-bold text-red-800 dark:text-red-200'>
                    {formatActualMinutesAsHours(ticket.actualTime)} hora(s)
                  </p>
                </div>
              ) : null}
              {canEditDuration ? (
                <div className='mt-3 space-y-3 rounded-lg border-2 border-red-600 bg-red-50 p-4 dark:border-red-500 dark:bg-red-950/40'>
                  <SupportDurationInput
                    id='panel-duracion-horas'
                    value={panelDuracionHoras}
                    onChange={setPanelDuracionHoras}
                    required
                    reminder
                  />
                  <Button
                    type='button'
                    variant='primary'
                    size='sm'
                    onClick={handleSaveDuration}
                    disabled={isSavingDuration}
                  >
                    {isSavingDuration
                      ? 'Guardando...'
                      : 'Guardar tiempo de soporte'}
                  </Button>
                </div>
              ) : null}
            </div>
          )}

          {/* Observaciones Técnicas */}
          {ticket.technicalObservations && (
            <div>
              <h3 className='text-base font-medium mb-2 flex items-center gap-2'>
                <ClipboardList size={16} className='text-primary' />
                Observaciones Técnicas
              </h3>
              <div className='bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3 rounded-md text-sm'>
                <div className='whitespace-pre-wrap text-gray-700 dark:text-gray-300'>
                  {ticket.technicalObservations}
                </div>
              </div>
            </div>
          )}

          {/* Sistema(s) comprometido(s) - falla del equipo */}
          <div>
            <h3 className='text-base font-medium mb-2 flex items-center gap-2'>
              <Layers size={16} className='text-primary' />
              Sistema(s) comprometido(s)
            </h3>
            {isEditingSistemas ? (
              <div className='space-y-3'>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
                  {SISTEMAS_OPTIONS.map(sistema => {
                    const inputId = `sistema-${sistemaToInputId(sistema)}`;
                    return (
                      <label
                        key={sistema}
                        htmlFor={inputId}
                        className='flex items-center gap-2 p-2 rounded-md border border-border hover:bg-muted/50 cursor-pointer'
                      >
                        <input
                          id={inputId}
                          type='checkbox'
                          checked={pendingSistemas.includes(sistema)}
                          onChange={() => handleToggleSistema(sistema)}
                          className='rounded border-border'
                          aria-label={`Sistema ${sistema}`}
                        />
                        <span className='text-sm'>{sistema}</span>
                      </label>
                    );
                  })}
                </div>
                <div className='flex gap-2'>
                  <Button
                    variant='primary'
                    size='sm'
                    onClick={handleSaveSistemas}
                    disabled={isSavingSistemas}
                  >
                    {isSavingSistemas ? 'Guardando...' : 'Guardar'}
                  </Button>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => {
                      setIsEditingSistemas(false);
                      setPendingSistemas(ticket.sistemas ?? []);
                    }}
                    disabled={isSavingSistemas}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div className='bg-muted/50 p-3 rounded-md'>
                {(ticket.sistemas?.length ?? 0) > 0 ? (
                  <div className='flex flex-wrap gap-2'>
                    {(ticket.sistemas ?? []).map(sistema => (
                      <Badge
                        key={sistema}
                        variant='secondary'
                        className='flex items-center gap-1'
                      >
                        <Layers size={12} />
                        {sistema}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className='text-sm text-muted-foreground'>
                    No definido. El técnico puede seleccionar uno o varios
                    sistemas.
                  </p>
                )}
                {canEditSistemas && (
                  <Button
                    variant='outline'
                    size='sm'
                    className='mt-2'
                    onClick={() => setIsEditingSistemas(true)}
                  >
                    {(ticket.sistemas?.length ?? 0) > 0
                      ? 'Editar sistemas'
                      : 'Seleccionar sistemas'}
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className='space-y-3'>
            <h3 className='text-base font-medium'>Personas</h3>

            <div className='flex items-center justify-between bg-card border border-border p-3 rounded-md'>
              <div className='flex items-center'>
                <Avatar src={customer?.avatar} status={customer?.status} />
                <div className='ml-3'>
                  <p className='font-medium'>
                    {customer?.name || 'Cliente Desconocido'}
                  </p>
                  <p className='text-xs text-muted-foreground'>Cliente</p>
                </div>
              </div>
            </div>

            {technician ? (
              <div className='flex items-center justify-between bg-card border border-border p-3 rounded-md'>
                <div className='flex items-center'>
                  <Avatar src={technician.avatar} status={technician.status} />
                  <div className='ml-3'>
                    <p className='font-medium'>{technician.name}</p>
                    <p className='text-xs text-muted-foreground'>
                      Técnico de Soporte
                    </p>
                  </div>
                </div>
                {canAssignTechnician && !isAssigningTechnician && (
                  <Button
                    variant='outline'
                    size='sm'
                    leftIcon={<RefreshCw size={14} />}
                    onClick={handleStartReassignment}
                  >
                    Reasignar
                  </Button>
                )}
              </div>
            ) : (
              <div className='bg-muted/50 p-3 rounded-md text-sm'>
                <div className='text-center'>
                  <p className='text-muted-foreground mb-3'>
                    Aún no se ha asignado un técnico
                  </p>
                  {canAssignTechnician && !isAssigningTechnician && (
                    <Button
                      variant='primary'
                      size='sm'
                      leftIcon={<UserPlus size={14} />}
                      onClick={handleStartReassignment}
                    >
                      Asignar Técnico
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Modal de asignación - se muestra independientemente del estado del técnico */}
            {isAssigningTechnician && (
              <div className='bg-muted/50 p-3 rounded-md text-sm'>
                <div className='space-y-3'>
                  <p className='text-center text-muted-foreground mb-3'>
                    {currentTechnician
                      ? `Reasignar ticket de ${currentTechnician.name} a otro técnico`
                      : 'Seleccionar técnico para asignar'}
                  </p>
                  <select
                    className='w-full p-2 border border-border rounded-md bg-background'
                    value={selectedTechnicianId}
                    onChange={e => setSelectedTechnicianId(e.target.value)}
                  >
                    <option value=''>Seleccionar técnico...</option>
                    {availableTechnicians?.map(tech => (
                      <option
                        key={tech.id}
                        value={tech.id}
                        disabled={tech.id === currentTechnician?.id}
                      >
                        {tech.name} (
                        {tech.role === 'admin' ? 'Administrador' : 'Técnico'})
                        {tech.id === currentTechnician?.id ? ' (Actual)' : ''}
                      </option>
                    ))}
                  </select>
                  <div className='flex gap-2'>
                    <Button
                      variant='primary'
                      size='sm'
                      onClick={handleAssignTechnician}
                      disabled={
                        !selectedTechnicianId ||
                        selectedTechnicianId === currentTechnician?.id
                      }
                      className='flex-1'
                    >
                      {currentTechnician ? 'Reasignar' : 'Asignar'}
                    </Button>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={handleCancelAssignment}
                      className='flex-1'
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>

      <TicketDetailsFooter
        status={status}
        canChangeStatus={!!canChangeStatus}
        isChangingStatus={isChangingStatus}
        onStartChat={onStartChat}
        onStartCall={onStartCall}
        onStatusChange={handleStatusChange}
        onOpenCloseModal={() => openStatusModal('closed')}
      />

      <ObservationsModal
        show={showObservationsModal}
        pendingStatus={pendingStatus}
        technicalObservations={technicalObservations}
        onObservationsChange={setTechnicalObservations}
        duracionHoras={duracionHoras}
        onDuracionHorasChange={setDuracionHoras}
        onConfirm={handleConfirmStatusChange}
        onCancel={handleCancelStatusChange}
        isChangingStatus={isChangingStatus}
      />
    </Card>
  );
};
