
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
  onCreateBooking,
  onCreateClient
}) {
  // Estado del menú de acciones
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuBooking, setMenuBooking] = useState(null);

  // Estado independiente para el diálogo de detalles
  const [selectedBooking, setSelectedBooking] = useState(null);

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
    setSelectedBooking(booking);

    if (booking && onOpenBookingDetails) {
      onOpenBookingDetails(booking);
    }
  };

  // Confirmar anticipo
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

  // Cerrar diálogo de detalles
  const closeDetails = () => {
    setSelectedBooking(null);
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

  // Paquete de la reservación seleccionada
  const selectedPackage = selectedBooking
    ? packages.find(
        (pkg) => String(pkg.id) === String(selectedBooking.package)
      )
    : null;

  // Información de pagos
  const total = Number(selectedBooking?.total_cents || 0);
  const paid = Number(selectedBooking?.paid_cents || 0);
  const pending = Math.max(total - paid, 0);

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

        {menuBooking?.status === 'Pendiente de anticipo' && (
          <>
            <MenuItem
              onClick={handleConfirm}
              disabled={!onOpenConfirmPayment}
              sx={{
                color: '#254C41',
                fontSize: 13,
                py: 1.3
              }}
            >
              Confirmar anticipo
            </MenuItem>

            <MenuItem
              onClick={handleCancel}
              disabled={!onOpenCancelBooking}
              sx={{
                color: '#A34D4D',
                fontSize: 13,
                py: 1.3
              }}
            >
              Cancelar reserva
            </MenuItem>
          </>
        )}
      </Menu>

      {/* ==============================|| DETALLE DE RESERVACIÓN ||============================== */}

      <Dialog
        open={Boolean(selectedBooking)}
        onClose={closeDetails}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: 4,
            bgcolor: '#FFFFFF'
          }
        }}
      >
        {selectedBooking && (
          <>
            <DialogTitle
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontFamily: 'Georgia, serif',
                color: '#343B32'
              }}
            >
              Detalle de reservación

              <IconButton
                onClick={closeDetails}
                aria-label="Cerrar detalle"
              >
                <Icon name="x" />
              </IconButton>
            </DialogTitle>

            <DialogContent dividers>
              <Stack spacing={3} sx={{ py: 1 }}>
                {/* INFORMACIÓN DEL CLIENTE */}
                <Box>
                  <Typography
                    variant="overline"
                    sx={{
                      color: '#7B856D',
                      letterSpacing: 2
                    }}
                  >
                    INFORMACIÓN DEL CLIENTE
                  </Typography>

                  <Typography
                    variant="h5"
                    sx={{
                      fontFamily: 'Georgia, serif',
                      color: '#343B32',
                      mt: 1
                    }}
                  >
                    {selectedBooking.client_name || 'Cliente no disponible'}
                  </Typography>
                </Box>

                <Divider />

                {/* INFORMACIÓN DEL EVENTO */}
                <Box>
                  <Typography
                    variant="overline"
                    sx={{
                      color: '#7B856D',
                      letterSpacing: 2
                    }}
                  >
                    INFORMACIÓN DEL EVENTO
                  </Typography>

                  <Stack spacing={2} sx={{ mt: 2 }}>
                    <DetailItem
                      icon="calendar"
                      label="Fecha del evento"
                      value={formatPrettyDate(selectedBooking.event_date)}
                    />

                    <DetailItem
                      icon="camera"
                      label="Tipo de evento"
                      value={selectedBooking.event_type || 'No especificado'}
                    />

                    <DetailItem
                      icon="package"
                      label="Paquete contratado"
                      value={
                        selectedPackage?.name ||
                        selectedBooking.package ||
                        'No especificado'
                      }
                    />

                    <DetailItem
                      icon="hash"
                      label="Número de reservación"
                      value={String(selectedBooking.id)}
                    />
                  </Stack>
                </Box>

                <Divider />

                {/* ESTADO */}
                <Box>
                  <Typography
                    variant="overline"
                    sx={{
                      color: '#7B856D',
                      letterSpacing: 2
                    }}
                  >
                    ESTADO DE LA RESERVACIÓN
                  </Typography>

                  <Box sx={{ mt: 1 }}>
                    <StatusBadge status={selectedBooking.status} />
                  </Box>
                </Box>

                <Divider />

                {/* INFORMACIÓN DE PAGO */}
                <Box>
                  <Typography
                    variant="overline"
                    sx={{
                      color: '#7B856D',
                      letterSpacing: 2
                    }}
                  >
                    RESUMEN DE PAGO
                  </Typography>

                  <Stack spacing={2} sx={{ mt: 2 }}>
                    <MoneyItem
                      label="Total del paquete"
                      amount={formatMoney(total)}
                    />

                    <MoneyItem
                      label="Anticipo registrado"
                      amount={formatMoney(paid)}
                    />

                    <Divider />

                    <MoneyItem
                      label="Saldo pendiente"
                      amount={formatMoney(pending)}
                      strong
                    />
                  </Stack>
                </Box>

                <Alert severity="info">
                  Los datos mostrados corresponden a la información
                  disponible en el sistema. El historial detallado de
                  movimientos y comprobantes de pago se integrará
                  posteriormente.
                </Alert>
              </Stack>
            </DialogContent>
          </>
        )}
      </Dialog>
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
