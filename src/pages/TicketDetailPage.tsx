import { AlertCircle, ChevronLeft } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '../atoms/Button';
import { Spinner } from '../atoms/Spinner';
import { PermissionDenied } from '../components/PermissionDenied';
import { useAuth } from '../context/AuthContext';
import { useUserStatus } from '../hooks/useUserStatus';
import { ChatPanel } from '../organisms/ChatPanel';
import { TicketDetails } from '../organisms/TicketDetails';
import { VideoCallPanel } from '../organisms/VideoCallPanel';
import { ticketService, userService } from '../services/api';
import { Ticket, TicketEditPayload, User } from '../types';

type DetailTab = 'details' | 'chat' | 'call';

const DETAIL_TABS: DetailTab[] = ['details', 'chat', 'call'];

function isDetailTab(value: string | null): value is DetailTab {
  return value !== null && DETAIL_TABS.includes(value as DetailTab);
}

function buildRemoteUsersForCall(
  customerId: string,
  technicianId: string | undefined,
  customer: User | undefined,
  technician: User | undefined
): Record<string, User> {
  const result: Record<string, User> = {};
  if (customer) result[customerId] = customer;
  if (technician && technicianId != null) result[technicianId] = technician;
  return result;
}

function pickEditedField<T>(
  updated: T | undefined,
  payload: T | undefined,
  current: T | undefined
): T | undefined {
  if (updated !== undefined) return updated;
  if (payload !== undefined) return payload;
  return current;
}

function mergeEditedTicket(
  current: Ticket,
  updatedTicket: Ticket,
  payload: TicketEditPayload
): Ticket {
  return {
    ...updatedTicket,
    title: updatedTicket.title ?? payload.title,
    description: updatedTicket.description ?? payload.description,
    priority: updatedTicket.priority ?? payload.priority ?? current.priority,
    marca: pickEditedField(updatedTicket.marca, payload.marca, current.marca),
    modeloEquipo: pickEditedField(
      updatedTicket.modeloEquipo,
      payload.modeloEquipo,
      current.modeloEquipo
    ),
    serial: pickEditedField(
      updatedTicket.serial,
      payload.serial,
      current.serial
    ),
  };
}

function isPermissionErrorMessage(error: string | null): boolean {
  if (!error) return false;
  return error.includes('permisos') || error.includes('No tienes');
}

export const TicketDetailPage: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [searchParams] = useSearchParams();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [users, setUsers] = useState<Record<string, User>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tabFromQuery = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<DetailTab>(
    isDetailTab(tabFromQuery) ? tabFromQuery : 'details'
  );

  useEffect(() => {
    if (isDetailTab(tabFromQuery)) {
      setActiveTab(tabFromQuery);
    }
  }, [tabFromQuery]);

  const { getUserWithStatus } = useUserStatus(users);

  const availableTechnicians = Object.values(users).filter(
    user => user.role === 'admin' || user.role === 'technician'
  );

  useEffect(() => {
    const fetchData = async () => {
      if (!ticketId) return;

      setLoading(true);
      setError(null);

      try {
        const fetchedTicket = await ticketService.getTicketById(ticketId);
        setTicket(fetchedTicket);

        const usersData = await userService.getUsers();
        const usersMap = usersData.reduce<Record<string, User>>((acc, user) => {
          acc[user.id] = user;
          return acc;
        }, {});
        setUsers(usersMap);
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Error al cargar los detalles del ticket';
        setError(errorMessage);
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [ticketId]);

  const handleChangeStatus = async (
    status: Ticket['status'],
    technicalObservations?: string
  ) => {
    if (!ticket) return;

    try {
      const updateData: {
        status: Ticket['status'];
        technicalObservations?: string;
      } = { status };
      if (technicalObservations) {
        updateData.technicalObservations = technicalObservations;
      }
      const updatedTicket = await ticketService.updateTicket(
        ticket.id,
        updateData
      );
      setTicket(updatedTicket);
    } catch (err) {
      console.error('Error al actualizar el estado del ticket:', err);
    }
  };

  const handleAssignTechnician = async (technicianId: string) => {
    if (!ticket) return;

    try {
      const updatedTicket = await ticketService.updateTicket(ticket.id, {
        technicianId,
      });
      setTicket(updatedTicket);
    } catch (err) {
      console.error('Error al asignar técnico:', err);
    }
  };

  const handleUpdateSistemas = async (sistemas: string[]) => {
    if (!ticket) return;

    try {
      const updatedTicket = await ticketService.updateTicket(ticket.id, {
        sistemas,
      });
      setTicket({
        ...updatedTicket,
        sistemas: updatedTicket.sistemas ?? sistemas,
      });
    } catch (err) {
      console.error('Error al actualizar sistemas:', err);
    }
  };

  const handleUpdateTicket = async (payload: TicketEditPayload) => {
    if (!ticket) return;

    try {
      const updatedTicket = await ticketService.updateTicket(ticket.id, payload);
      setTicket(mergeEditedTicket(ticket, updatedTicket, payload));
    } catch (err) {
      console.error('Error al editar el ticket:', err);
      throw err;
    }
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center h-full'>
        <Spinner size='lg' />
      </div>
    );
  }

  if (error || !ticket) {
    if (isPermissionErrorMessage(error)) {
      return (
        <PermissionDenied
          message={error}
          onGoBack={() => navigate('/tickets')}
        />
      );
    }

    return (
      <div className='flex items-center justify-center h-full'>
        <div className='text-center'>
          <AlertCircle size={48} className='text-destructive mx-auto mb-4' />
          <h2 className='text-xl font-semibold mb-2'>
            Error al Cargar el Ticket
          </h2>
          <p className='text-muted-foreground mb-4'>
            {error || 'Ticket no encontrado'}
          </p>
          <Button onClick={() => navigate('/tickets')}>Volver a Tickets</Button>
        </div>
      </div>
    );
  }

  const customerBase =
    users[ticket.customerId] ||
    (currentUser?.id === ticket.customerId ? currentUser : undefined);
  const customer = getUserWithStatus(customerBase);

  const technicianBase = ticket.technicianId
    ? users[ticket.technicianId]
    : undefined;
  const technician = getUserWithStatus(technicianBase);

  const callRecipientId =
    currentUser?.id === ticket.customerId
      ? ticket.technicianId ?? ''
      : ticket.customerId;

  return (
    <div className='h-full flex flex-col'>
      <div className='mb-6'>
        <Button
          variant='ghost'
          className='mb-4'
          leftIcon={<ChevronLeft size={16} />}
          onClick={() => navigate('/tickets')}
        >
          Volver a Tickets
        </Button>

        <div className='flex flex-wrap gap-3 mb-4'>
          <Button
            variant={activeTab === 'details' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('details')}
          >
            Detalles del Ticket
          </Button>
          <Button
            variant={activeTab === 'chat' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('chat')}
          >
            Chat
          </Button>
          <Button
            variant={activeTab === 'call' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('call')}
          >
            Videollamada
          </Button>
        </div>
      </div>

      <div className='flex-1 overflow-hidden'>
        {activeTab === 'details' && (
          <TicketDetails
            ticket={ticket}
            customer={customer}
            technician={technician}
            currentUser={currentUser ?? undefined}
            availableTechnicians={availableTechnicians}
            onStartCall={() => setActiveTab('call')}
            onStartChat={() => setActiveTab('chat')}
            onChangeStatus={handleChangeStatus}
            onAssignTechnician={handleAssignTechnician}
            onUpdateSistemas={handleUpdateSistemas}
            onUpdateTicket={handleUpdateTicket}
          />
        )}

        {activeTab === 'chat' && (
          <div className='h-full border border-border rounded-lg overflow-hidden'>
            <ChatPanel ticketId={ticket.id} users={users} ticket={ticket} />
          </div>
        )}

        {activeTab === 'call' && (
          <VideoCallPanel
            recipientId={callRecipientId}
            ticketId={ticket.id}
            localUser={currentUser ?? undefined}
            remoteUsers={buildRemoteUsersForCall(
              ticket.customerId,
              ticket.technicianId,
              customer,
              technician
            )}
          />
        )}
      </div>
    </div>
  );
};
