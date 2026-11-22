
import { useState } from 'react';

import {
  Alert,
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography
} from '@mui/material';

import StatusBadge from '../StatusBadge';
import EmptyState from '../EmptyState';
import Icon from '../Icon';

import {
  formatMoney,
  formatPrettyDate
} from '../../utils/formatters';

// ==============================|| TABLA DE RESERVAS DEL ESTUDIO ||============================== //

export default function BookingsTable({
  rows = [],
  packages = [],
  hasClients = false,
  hasActiveFilters = false,
  onOpenBookingDetails,
  onOpenConfirmPayment,
  onOpenCancelBooking,
  onOpenExtension,
  onCreateBooking,
  onCreateClient
}) {
  // Estado del menú de acciones
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuBooking, setMenuBooking] = useState(null);

  // Abrir menú de acciones
  const handleOpenMenu = (event, booking) => {
    setAnchorEl(event.currentTarget);
    setMenuBooking(booking);
  };

  // Cerrar menú
  const handleCloseMenu = () => {
    setAnchorEl(null);
    setMenuBooking(null);
  };

  // Abrir detalles
  const handleViewDetails = () => {
    const booking = menuBooking;
    handleCloseMenu();
    if (booking && onOpenBookingDetails) {
      onOpenBookingDetails(booking);
    }
  };

  // Registrar anticipo o abono en efectivo
  const handleConfirm = () => {
    const booking = menuBooking;

    handleCloseMenu();

    if (booking && onOpenConfirmPayment) {
      onOpenConfirmPayment(booking);
    }
  };

  // Cancelar reservación
  const handleCancel = () => {
    const booking = menuBooking;

    handleCloseMenu();

    if (booking && onOpenCancelBooking) {
      onOpenCancelBooking(booking);
    }
  };

  const handleExtension = () => {
    const booking = menuBooking;

    handleCloseMenu();

    if (booking && onOpenExtension) {
      onOpenExtension(booking);
    }
  };


  // ==============================|| SIN RESERVACIONES ||============================== //

  if (!rows.length) {
    return (
      <EmptyState
        icon={hasActiveFilters ? 'search' : 'calendar'}
        iconSize={32}
        title={
          hasActiveFilters
            ? 'No se encontraron reservaciones'
            : 'No hay reservas registradas'
        }
        description={
          hasActiveFilters
            ? 'Prueba con otro nombre, evento o estado.'
            : hasClients
              ? 'Todavía no hay reservaciones. Utiliza el botón Nueva reserva de la parte superior para comenzar.'
              : 'Primero registra un cliente para poder crear reservaciones.'
        }
      />
    );
  }


  // ==============================|| TABLA DE RESERVACIONES ||============================== //

  return (
    <>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Cliente y evento</th>
              <th>Fecha del evento</th>
              <th>Estado</th>
              <th>Información de pago</th>
              <th style={{ textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((booking) => {
              const packageObj = packages.find(
                (pkg) =>
                  String(pkg.id) === String(booking.package)
              );

              const isPending =
                booking.status === 'Pendiente de anticipo';

              const bookingTotal = Number(booking.total_cents) || 0;
              const bookingPaid = Number(booking.paid_cents) || 0;
              const remaining = Math.max(
                bookingTotal - bookingPaid,
                0
              );

              return (
                <tr key={booking.id}>
                  {/* CLIENTE Y EVENTO */}
                  <td>
                    <small
                      style={{
                        display: 'block',
                        color: '#526047',
                        fontWeight: 600,
                        marginBottom: '4px'
                      }}
                    >
                      Reservación #{booking.id}
                    </small>

                    <strong>
                      {booking.client_name || 'Sin cliente'}
                    </strong>

                    <small>
                      {booking.event_type || 'Evento'}
                      {packageObj?.name
                        ? ` · ${packageObj.name}`
                        : ''}
                    </small>
                  </td>

                  {/* FECHA */}
                  <td>
                    {formatPrettyDate(booking.event_date)}
                  </td>

                  {/* ESTADO */}
                  <td>
                    <StatusBadge status={booking.status} />
                  </td>

                  {/* INFORMACIÓN DE PAGO */}
                  <td>
                    <Stack spacing={0.5}>
                      <Typography
                        variant="body2"
                        fontWeight={700}
                        sx={{ color: '#254C41' }}
                      >
                        {formatMoney(bookingTotal)}
                      </Typography>

                      <Typography
                        variant="caption"
                        color="text.secondary"
                      >
                        Pagado: {formatMoney(bookingPaid)}
                      </Typography>

                      <Typography
                        variant="caption"
                        sx={{
                          color: remaining > 0 ? '#9A6A32' : '#526047'
                        }}
                      >
                        Saldo: {formatMoney(remaining)}
                      </Typography>
                    </Stack>
                  </td>

                  {/* ACCIONES */}
                  <td style={{ textAlign: 'center' }}>
                    <Tooltip title="Opciones de reserva">
                      <IconButton
                        size="small"
                        aria-label={`Acciones de la reserva de ${booking.client_name || 'cliente'}`}
                        aria-haspopup="menu"
                        aria-expanded={
                          Boolean(anchorEl) &&
                            menuBooking?.id === booking.id
                            ? 'true'
                            : undefined
                        }
                        onClick={(event) =>
                          handleOpenMenu(event, booking)
                        }
                        sx={{
                          color: '#526047',
                          '&:hover': {
                            bgcolor: '#E9EDE4'
                          }
                        }}
                      >
                        <Box
                          component="span"
                          sx={{
                            fontSize: 23,
                            lineHeight: 1,
                            fontWeight: 700
                          }}
                        >
                          ⋮
                        </Box>
                      </IconButton>
                    </Tooltip>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ==============================|| MENÚ DE ACCIONES ||============================== */}

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right'
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right'
        }}
        slotProps={{
          paper: {
            sx: {
              minWidth: 200,
              borderRadius: 2,
              boxShadow: '0 8px 24px rgba(0,0,0,0.10)'
            }
          }
        }}
      >
        <MenuItem
          onClick={handleViewDetails}
          disabled={!onOpenBookingDetails}
          sx={{
            color: '#343B32',
            fontSize: 13,
            py: 1.3
          }}
        >
          Ver detalles
        </MenuItem>

        {/* PAGOS EN EFECTIVO: ANTICIPOS Y ABONOS */}

        {menuBooking &&
          ['Pendiente de anticipo', 'Confirmada'].includes(
            menuBooking.status
          ) &&
          !(
            menuBooking.status === 'Pendiente de anticipo' &&
            menuBooking.decision_anticipo_pendiente
          ) &&
          Math.max(
            (Number(menuBooking.total_cents) || 0) -
            (Number(menuBooking.paid_cents) || 0),
            0
          ) > 0 && (
            <MenuItem
              onClick={handleConfirm}
              disabled={!onOpenConfirmPayment}
              sx={{ color: '#254C41', fontSize: 13, py: 1.3 }}
            >
              Registrar pago en efectivo
            </MenuItem>
          )}

        {/* PRÓRROGA: SOLO CUANDO EXISTE UNA DECISIÓN PENDIENTE */}

        {menuBooking?.status === 'Pendiente de anticipo' &&
          menuBooking.decision_anticipo_pendiente && (
            <MenuItem
              onClick={handleExtension}
              disabled={!onOpenExtension}
              sx={{ color: '#526047', fontSize: 13, py: 1.3 }}
            >
              Conceder prórroga
            </MenuItem>
          )}

        {/* CANCELACIÓN: CONSERVAR LA REGLA ORIGINAL */}

        {menuBooking?.status === 'Pendiente de anticipo' && (
          <MenuItem
            onClick={handleCancel}
            disabled={!onOpenCancelBooking}
            sx={{ color: '#A34D4D', fontSize: 13, py: 1.3 }}
          >
            Cancelar solicitud
          </MenuItem>
        )}
      </Menu>
    </>
  );
}

// ==============================|| COMPONENTES AUXILIARES ||============================== //

function DetailItem({ icon, label, value }) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="center">
      <Box sx={{ color: '#68745B' }}>
        <Icon name={icon} />
      </Box>

      <Box>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>

        <Typography
          variant="body2"
          sx={{
            color: '#343B32',
            fontWeight: 500
          }}
        >
          {value}
        </Typography>
      </Box>
    </Stack>
  );
}

function MoneyItem({ label, amount, strong = false }) {
  return (
    <Stack
      direction="row"
      justifyContent="space-between"
      alignItems="center"
      spacing={2}
    >
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ fontWeight: strong ? 600 : 400 }}
      >
        {label}
      </Typography>

      <Typography
        variant="body2"
        sx={{
          color: strong ? '#68745B' : '#343B32',
          fontWeight: strong ? 700 : 500
        }}
      >
        {amount}
      </Typography>
    </Stack>
  );
}
