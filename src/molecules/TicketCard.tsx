import { ArrowRight, Box, Clock, Fingerprint, Hash, MessageSquare } from 'lucide-react';
import React from 'react';
import { Avatar } from '../atoms/Avatar';
import { Badge, type BadgeProps } from '../atoms/Badge';
import { Button } from '../atoms/Button';
import { Card, CardContent, CardFooter, CardHeader } from '../atoms/Card';
import { Ticket, User } from '../types';
import { formatActualMinutesAsHours } from '../utils/supportDuration';

type BadgeVariant = NonNullable<BadgeProps['variant']>;

interface TicketCardProps {
  ticket: Ticket;
  customer?: User;
  technician?: User;
  onSelect: (ticketId: string) => void;
}

export const TicketCard: React.FC<TicketCardProps> = ({
  ticket,
  customer,
  technician,
  onSelect,
}) => {
  // Formatear la fecha de creación
  const formattedDate = new Date(ticket.createdAt).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Formatear ID del ticket
  const formatTicketId = (ticketId: string) => {
    return ticketId.substring(0, 8).toUpperCase();
  };

  // Mapear estado a variante de badge
  const statusVariantMap: Record<Ticket['status'], BadgeVariant> = {
    open: 'primary',
    in_progress: 'warning',
    resolved: 'success',
    closed: 'default',
    redirected: 'secondary',
  };

  // Mapear prioridad a variante de badge
  const priorityVariantMap: Record<Ticket['priority'], BadgeVariant> = {
    low: 'default',
    medium: 'secondary',
    high: 'warning',
    urgent: 'danger',
  };

  // Traducir estados
  const statusTranslations: Record<Ticket['status'], string> = {
    open: 'abierto',
    in_progress: 'en progreso',
    resolved: 'resuelto',
    closed: 'cerrado',
    redirected: 'redireccionado',
  };

  // Traducir prioridades
  const priorityTranslations: Record<Ticket['priority'], string> = {
    low: 'baja',
    medium: 'media',
    high: 'alta',
    urgent: 'urgente',
  };

  const modeloLabel = ticket.modeloEquipo?.trim() ?? '';
  const serialLabel = ticket.serial?.trim() ?? '';
  const hasModelo = modeloLabel.length > 0;
  const hasSerial = serialLabel.length > 0;
  const showEquipoRow = hasModelo || hasSerial;
  const duracionHorasLabel = formatActualMinutesAsHours(ticket.actualTime);

  return (
    <Card
      variant='outline'
      hoverEffect
      className='transition-all duration-200 ease-in-out'
    >
      <CardHeader className='pb-2'>
        <div className='flex justify-between items-start'>
          <div className='space-y-1'>
            <div className='flex items-center gap-2 mb-1'>
              <Badge variant='secondary' className='flex items-center gap-1 text-xs font-mono'>
                <Hash size={10} />
                {formatTicketId(ticket.id)}
              </Badge>
              {ticket.status === 'closed' && (
                <Badge variant='default' className='text-xs'>Cerrado</Badge>
              )}
              {ticket.priority === 'urgent' && (
                <Badge variant='danger' className='text-xs'>Urgente</Badge>
              )}
            </div>
            <h3 className='font-semibold text-base leading-tight'>
              {ticket.title}
            </h3>
            {showEquipoRow ? (
              <div className='mt-1.5 flex flex-wrap items-start gap-2'>
                {hasModelo ? (
                  <div
                    className='inline-flex max-w-full min-w-0 items-start gap-1.5 rounded-md bg-green-600 px-2 py-1.5 text-sm font-medium text-white shadow-sm dark:bg-green-700'
                    title={modeloLabel}
                  >
                    <Box size={14} className='shrink-0 mt-0.5 text-white' aria-hidden />
                    <span className='line-clamp-2'>{modeloLabel}</span>
                  </div>
                ) : null}
                {hasSerial ? (
                  <div
                    className='inline-flex max-w-full min-w-0 items-start gap-1.5 rounded-md bg-teal-700 px-2 py-1.5 text-xs font-mono font-medium text-white shadow-sm dark:bg-teal-800'
                    title={serialLabel}
                  >
                    <Fingerprint size={14} className='shrink-0 mt-0.5 text-white' aria-hidden />
                    <span className='line-clamp-2'>S/N: {serialLabel}</span>
                  </div>
                ) : null}
              </div>
            ) : null}
            <div className='flex flex-wrap gap-2'>
              <Badge
                variant={statusVariantMap[ticket.status]}
                className='capitalize'
              >
                {statusTranslations[ticket.status]}
              </Badge>
              <Badge
                variant={priorityVariantMap[ticket.priority]}
                className='capitalize'
              >
                {priorityTranslations[ticket.priority]}
              </Badge>
              {duracionHorasLabel ? (
                <Badge
                  variant='danger'
                  className='font-semibold'
                  title='Duración del soporte remoto'
                >
                  {duracionHorasLabel} h
                </Badge>
              ) : null}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className='text-sm space-y-3'>
        <p className='text-muted-foreground line-clamp-2'>
          {ticket.description}
        </p>

        <div className='flex items-center text-xs text-muted-foreground'>
          <Clock size={14} className='mr-1' />
          <span>{formattedDate}</span>
          {ticket.messageCount && ticket.messageCount > 0 && (
            <>
              <span className='mx-2'>•</span>
              <MessageSquare size={14} className='mr-1' />
              <span>
                {ticket.messageCount} mensaje
                {ticket.messageCount === 1 ? '' : 's'}
              </span>
            </>
          )}
        </div>
      </CardContent>

      <CardFooter className='pt-3 border-t flex justify-between items-center'>
        <div className='flex items-center'>
          {customer && (
            <div className='flex items-center'>
              <Avatar
                src={customer.avatar}
                size='sm'
                status={customer.status}
              />
              <span className='ml-2 text-sm font-medium'>{customer.name}</span>
            </div>
          )}

          {technician && (
            <>
              <ArrowRight size={14} className='mx-2 text-muted-foreground' />
              <Avatar
                src={technician.avatar}
                size='sm'
                status={technician.status}
              />
            </>
          )}
        </div>

        <Button
          size='sm'
          variant='ghost'
          className='text-primary'
          onClick={() => onSelect(ticket.id)}
        >
          Ver Detalles
        </Button>
      </CardFooter>
    </Card>
  );
};
