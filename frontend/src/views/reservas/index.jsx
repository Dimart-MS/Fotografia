
import { Box, Button, Chip, MenuItem, Stack, TextField, Typography } from '@mui/material';

import BookingsTable from '../../ui-component/tables/BookingsTable';

import {
  BOOKING_STATUS_FILTERS,
  STUDIO_CONFIG,
  WEEKDAYS_SHORT
} from '../../config';

import { formatPrettyDate, getLocalToday } from '../../utils/formatters';
import useStudio from '../../hooks/useStudio';

// ==============================|| AGENDA Y RESERVAS ||============================== //


export default function ReservasView() {
  const {
    clients,
    bookings,
    packages,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    calendarMonth,
    setCalendarMonth,
    openClientModal,
    openBookingModal,
    openBookingDetailsModal,
    openConfirmPaymentModal,
    openCancelBookingModal
  } = useStudio();


  const todayStr = getLocalToday();
  const year = calendarMonth.getFullYear();
  const monthIndex = calendarMonth.getMonth();

  const firstDayOffset =
    (new Date(year, monthIndex, 1).getDay() + 6) % 7;

  const daysInMonth =
    new Date(year, monthIndex + 1, 0).getDate();

  const monthTitle = calendarMonth.toLocaleDateString(
    STUDIO_CONFIG.locale,
    { month: 'long', year: 'numeric' }
  );

  const normalizedQuery = (search || '').trim().toLowerCase();

  const visibleBookings = bookings
    .filter((booking) => {
      const matchesStatus =
        statusFilter === 'Todas' ||
        booking.status === statusFilter;

      const matchesSearch =
        `${booking.client_name || ''} ${booking.event_type || ''}`
          .toLowerCase()
          .includes(normalizedQuery);

      return matchesStatus && matchesSearch;
    })
    .sort((a, b) => a.event_date.localeCompare(b.event_date));

  const confirmedCount = bookings.filter(
    (booking) => booking.status === 'Confirmada'
  ).length;

  const pendingCount = bookings.filter(
    (booking) => booking.status === 'Pendiente de anticipo'
  ).length;

  const cancelledCount = bookings.filter(
    (booking) => booking.status === 'Cancelada'
  ).length;

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('Todas');
  };

  const hasActiveFilters =
    Boolean(normalizedQuery) || statusFilter !== 'Todas';

  return (
    <Box sx={{ pb: 3 }}>

      {/* RESUMEN DE RESERVACIONES */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(2, minmax(0, 1fr))',
            md: 'repeat(4, minmax(0, 1fr))'
          },
          gap: 2,
          mb: 3
        }}
      >
        {[
          { label: 'Total de reservas', value: bookings.length },
          { label: 'Confirmadas', value: confirmedCount },
          { label: 'Pendientes de anticipo', value: pendingCount },
          { label: 'Canceladas', value: cancelledCount }
        ].map((stat) => (
          <Box
            key={stat.label}
            sx={{
              p: 2.5,
              bgcolor: '#FFFFFF',
              border: '1px solid #E2E5DD',
              borderRadius: 2
            }}
          >
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 1 }}
            >
              {stat.label}
            </Typography>

            <Typography
              variant="h4"
              sx={{
                fontFamily: 'Georgia, serif',
                color: '#254C41'
              }}
            >
              {stat.value}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* CALENDARIO */}
      <section className="panel calendar-panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">
              DISPONIBILIDAD DEL ESTUDIO
            </span>

            <h2 className="month-title">
              {monthTitle}
            </h2>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 0.5 }}
            >
              Selecciona una fecha disponible para registrar una reserva.
            </Typography>
          </div>

          <div className="calendar-nav">
            <button
              type="button"
              aria-label="Mes anterior"
              onClick={() =>
                setCalendarMonth(
                  new Date(year, monthIndex - 1, 1)
                )
              }
            >
              ‹
            </button>

            <button
              type="button"
              onClick={() =>
                setCalendarMonth(
                  new Date(`${todayStr}T12:00:00`)
                )
              }
            >
              Hoy
            </button>

            <button
              type="button"
              aria-label="Mes siguiente"
              onClick={() =>
                setCalendarMonth(
                  new Date(year, monthIndex + 1, 1)
                )
              }
            >
              ›
            </button>
          </div>
        </div>

        <div className="calendar-grid">
          {WEEKDAYS_SHORT.map((dayLabel) => (
            <div className="weekday" key={dayLabel}>
              {dayLabel}
            </div>
          ))}

          {Array.from(
            { length: firstDayOffset },
            (_, index) => (
              <div key={`blank-${index}`} />
            )
          )}

          {Array.from(
            { length: daysInMonth },
            (_, index) => {
              const dayNumber = index + 1;

              const dateStr =
                `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;

              const dayEvents = bookings.filter(
                (booking) =>
                  booking.event_date === dateStr &&
                  booking.status !== 'Cancelada'
              );

              const isOccupied = dayEvents.some(
                (booking) => booking.status === 'Confirmada'
              );

              const dayPendingCount = dayEvents.filter(
                (booking) =>
                  booking.status === 'Pendiente de anticipo'
              ).length;

              const isToday = dateStr === todayStr;
              const isPast = dateStr < todayStr;

              const isDisabled =
                isOccupied || isPast || clients.length === 0;

              return (
                <button
                  key={dateStr}
                  type="button"
                  className={`calendar-day ${isToday ? 'today' : ''
                    } ${isOccupied ? 'occupied' : ''}`}
                  disabled={isDisabled}
                  title={
                    isOccupied
                      ? 'Fecha ocupada'
                      : isPast
                        ? 'Fecha anterior'
                        : clients.length === 0
                          ? 'Primero registra un cliente'
                          : 'Crear reservación'
                  }
                  aria-label={`${formatPrettyDate(dateStr)}${isOccupied
                    ? ', ocupado'
                    : dayPendingCount > 0
                      ? `, disponible con ${dayPendingCount} solicitud(es) pendiente(s)`
                      : ', disponible'
                    }`}
                  onClick={() => openBookingModal(dateStr)}
                >
                  <span>{dayNumber}</span>

                  {isOccupied ? (
                    <small>Confirmada</small>
                  ) : dayPendingCount > 0 ? (
                    <small>
                      {dayPendingCount} pendiente
                      {dayPendingCount !== 1 ? 's' : ''}
                    </small>
                  ) : null}
                </button>
              );
            }
          )}
        </div>

        <Box
          sx={{
            display: 'flex',
            gap: 1,
            flexWrap: 'wrap',
            alignItems: 'center',
            px: 3,
            pt: 2
          }}
        >
          <Chip
            label="Confirmada"
            size="small"
            sx={{
              bgcolor: '#E8F0E2',
              color: '#3B5C30'
            }}
          />

          <Chip
            label="Pendiente de anticipo"
            size="small"
            sx={{
              bgcolor: '#F5EDE0',
              color: '#8A6536'
            }}
          />

          <Chip
            label="Disponible"
            size="small"
            variant="outlined"
          />
        </Box>

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', px: 3, pt: 1 }}
        >
          Solo los eventos confirmados bloquean la fecha.
        </Typography>
      </section>

      {/* LISTADO DE RESERVAS */}
      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Reservas del estudio</h2>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 0.5 }}
            >
              Mostrando {visibleBookings.length} de {bookings.length} reservas
            </Typography>
          </div>

          <div className="filters">
            <TextField
              label="Buscar cliente o evento"
              value={search || ''}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              size="small"
              fullWidth
            />

            <TextField
              select
              label="Estado"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
              size="small"
              fullWidth
            >
              {BOOKING_STATUS_FILTERS.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>
          </div>
        </div>

        {hasActiveFilters && (
          <Stack
            direction="row"
            justifyContent="flex-end"
            sx={{ px: 3, pb: 2 }}
          >
            <Button
              size="small"
              onClick={clearFilters}
              sx={{ color: '#526047' }}
            >
              Limpiar filtros
            </Button>
          </Stack>
        )}

        <BookingsTable
          rows={visibleBookings}
          packages={packages}
          hasClients={clients.length > 0}
          hasActiveFilters={hasActiveFilters}
          onOpenBookingDetails={openBookingDetailsModal}
          onOpenConfirmPayment={openConfirmPaymentModal}
          onOpenCancelBooking={openCancelBookingModal}
          onCreateBooking={openBookingModal}
          onCreateClient={openClientModal}
        />
      </section>
    </Box>
  );
}
