import { Button } from '@mui/material';
import StatusBadge from '../StatusBadge';
import EmptyState from '../EmptyState';
import { formatMoney, formatPrettyDate } from '../../utils/formatters';

// ==============================|| TABLA DE RESERVAS DEL ESTUDIO ||============================== //

export default function BookingsTable({
  rows = [],
  packages = [],
  hasClients = false,
  hasActiveFilters = false,
  onOpenConfirmPayment,
  onOpenCancelBooking,
  onCreateBooking,
  onCreateClient
}) {
  if (!rows.length) {
    return (
      <EmptyState
        icon="calendar"
        iconSize={32}
        title="No hay reservas registradas"
        description={
          hasActiveFilters
            ? 'No se encontraron reservas con los filtros seleccionados.'
            : 'Registra un cliente y crea una nueva solicitud de reserva.'
        }
        actionLabel={hasClients ? 'Crear reserva' : 'Registrar cliente'}
        onAction={hasClients ? () => onCreateBooking() : onCreateClient}
      />
    );
  }

  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Cliente y evento</th>
            <th>Fecha</th>
            <th>Estado</th>
            <th>Total / anticipo</th>
            <th>
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((booking) => {
            const packageObj = packages.find((pkg) => pkg.id === booking.package);
            const isPending = booking.status === 'Pendiente de anticipo';

            return (
              <tr key={booking.id}>
                <td>
                  <strong>{booking.client_name}</strong>
                  <small>
                    {booking.event_type} · {packageObj?.name}
                  </small>
                </td>
                <td>{formatPrettyDate(booking.event_date)}</td>
                <td>
                  <StatusBadge status={booking.status} />
                </td>
                <td>
                  <strong>{formatMoney(booking.total_cents)}</strong>
                  <small>{formatMoney(booking.paid_cents)} registrados</small>
                </td>
                <td>
                  {isPending && (
                    <div className="row-actions">
                      <Button
                        size="small"
                        onClick={() => onOpenConfirmPayment(booking)}
                      >
                        Confirmar
                      </Button>
                      <button
                        type="button"
                        className="text-button muted"
                        onClick={() => onOpenCancelBooking(booking)}
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
