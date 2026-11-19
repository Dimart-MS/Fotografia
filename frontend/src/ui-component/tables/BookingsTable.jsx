
import { useState } from 'react';

import {
  Box,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography
} from '@mui/material';

import StatusBadge from '../StatusBadge';
import EmptyState from '../EmptyState';

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
  const [selectedBooking, setSelectedBooking] = useState(null);

  // Abrir menú para una reservación específica
  const handleOpenMenu = (event, booking) => {
    setAnchorEl(event.currentTarget);
    setSelectedBooking(booking);
  };

  // Cerrar menú
  const handleCloseMenu = () => {
    setAnchorEl(null);
    setSelectedBooking(null);
  };

  // Consultar detalles
  const handleViewDetails = () => {
    const booking = selectedBooking;

    handleCloseMenu();

    if (booking && onOpenBookingDetails) {
      onOpenBookingDetails(booking);
    }
  };

  // Confirmar anticipo
  const handleConfirm = () => {
    const booking = selectedBooking;

    handleCloseMenu();

    if (booking && onOpenConfirmPayment) {
      onOpenConfirmPayment(booking);
    }
  };

  // Cancelar reservación
  const handleCancel = () => {
    const booking = selectedBooking;

    handleCloseMenu();

    if (booking && onOpenCancelBooking) {
      onOpenCancelBooking(booking);
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
              <th style={{ textAlign: 'center' }}>
                Acciones
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map((booking) => {
              // Buscar el paquete contratado
              const packageObj = packages.find(
                (pkg) =>
                  String(pkg.id) === String(booking.package)
              );

              // Verificar si está pendiente
              const isPending =
                booking.status === 'Pendiente de anticipo';

              // Calcular información de pago
              const total = Number(booking.total_cents) || 0;
              const paid = Number(booking.paid_cents) || 0;
              const remaining = Math.max(total - paid, 0);

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

                  {/* FECHA DEL EVENTO */}
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
                        sx={{
                          color: '#254C41'
                        }}
                      >
                        {formatMoney(total)}
                      </Typography>

                      <Typography
                        variant="caption"
                        color="text.secondary"
                      >
                        Pagado: {formatMoney(paid)}
                      </Typography>

                      <Typography
                        variant="caption"
                        sx={{
                          color:
                            remaining > 0
                              ? '#9A6A32'
                              : '#526047'
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
                        aria-label={`Acciones de la reserva de ${booking.client_name || 'cliente'
                          }`}
                        aria-haspopup="menu"
                        aria-expanded={
                          Boolean(anchorEl) &&
                            selectedBooking?.id === booking.id
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

        {/* VER DETALLES - TODAS LAS RESERVACIONES */}
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

        {/* ACCIONES SOLO PARA RESERVACIONES PENDIENTES */}
        {selectedBooking?.status === 'Pendiente de anticipo' && (
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
    </>
  );
}
