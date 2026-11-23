import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography
} from '@mui/material';

import CloseIcon from '@mui/icons-material/Close';
import BookingsTable from '../../ui-component/tables/BookingsTable';

import {
  BOOKING_STATUS_FILTERS,
  STUDIO_CONFIG,
  WEEKDAYS_SHORT
} from '../../config';

import { formatPrettyDate, getLocalToday } from '../../utils/formatters';
import useStudio from '../../hooks/useStudio';
import Icon from '../../ui-component/Icon';

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
    openCancelBookingModal,
    openExtensionModal
  } = useStudio();


  const todayStr = getLocalToday();
  const year = calendarMonth.getFullYear();
  const monthIndex = calendarMonth.getMonth();

  const firstDayOffset =
    (new Date(year, monthIndex, 1).getDay() + 6) % 7;

  const daysInMonth =
    new Date(year, monthIndex + 1, 0).getDate();

  const monthTitleRaw = calendarMonth.toLocaleDateString(
    STUDIO_CONFIG.locale,
    { month: 'long', year: 'numeric' }
  );

  const monthTitle =
    monthTitleRaw.charAt(0).toUpperCase() +
    monthTitleRaw.slice(1).replace(/\bDe\b/g, 'de');

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

  const proofSentCount = bookings.filter(
    (booking) => booking.status === 'Comprobante enviado'
  ).length;

  const pendingDecisionCount = bookings.filter(
    (booking) =>
      booking.status === 'Pendiente de anticipo' &&
      booking.decision_anticipo_pendiente === true
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
      {pendingDecisionCount > 0 && (
        <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
          Hay {pendingDecisionCount}{' '}
          {pendingDecisionCount === 1
            ? 'reservación que requiere'
            : 'reservaciones que requieren'}{' '}
          una decisión administrativa sobre el anticipo.

          Revisa las solicitudes pendientes para conceder
          una prórroga o cancelar la reservación.
        </Alert>
      )}

      {/* RESUMEN DE RESERVACIONES */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(2, minmax(0, 1fr))',
            md: 'repeat(3, minmax(0, 1fr))',
            xl: 'repeat(3, minmax(0, 1fr))'
          },
          gap: 2,
          mb: 3
        }}
      >
        {[
          { label: 'Total de reservas', value: bookings.length, icon: 'calendar' },
          { label: 'Confirmadas', value: confirmedCount, icon: 'check' },
          { label: 'Pendientes de anticipo', value: pendingCount, icon: 'clock' },
          { label: 'Comprobantes por revisar', value: proofSentCount, icon: 'file-text' },
          { label: 'Decisiones pendientes', value: pendingDecisionCount, icon: 'alert-circle' },
          { label: 'Canceladas', value: cancelledCount, icon: 'x-circle' }
        ].map((stat) => (
          <Box
            key={stat.label}
            sx={{
              p: 3,
              bgcolor: '#FFFFFF',
              border: '1px solid #E2E5DD',
              borderRadius: 3,
              minWidth: 0
            }}
          >
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="flex-start"
              spacing={2}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  variant="body2"
                  sx={{ color: '#72796D' }}
                >
                  {stat.label}
                </Typography>

                <Typography
                  variant="h3"
                  sx={{
                    fontWeight: 700,
                    color: '#354337',
                    mt: 1
                  }}
                >
                  {stat.value}
                </Typography>
              </Box>

              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2,
                  bgcolor: '#E9EDE4',
                  color: '#68745B',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0
                }}
              >
                <Icon name={stat.icon} size={22} />
              </Box>
            </Stack>
          </Box>
        ))}
      </Box>

      {/* CALENDARIO */}
      <section
        className="panel calendar-panel"
        style={{
          borderRadius: '18px',
          border: '1px solid #E2E5DD',
          backgroundColor: '#FFFFFF',
          paddingBottom: '24px'
        }}
      >
        <div className="section-heading">
          <div>
            <span className="eyebrow">
              DISPONIBILIDAD DEL ESTUDIO
            </span>

            <h2
              className="month-title"
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: '23px',
                fontWeight: 500,
                color: '#354337',
                marginTop: '6px',
                marginBottom: '4px'
              }}
            >
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
                (booking) =>
                  ['Confirmada', 'Realizada', 'Entregada'].includes(
                    booking.status
                  )
              );

              const dayPendingCount = dayEvents.filter(
                (booking) => booking.status === 'Pendiente de anticipo'
              ).length;

              const dayProofCount = dayEvents.filter(
                (booking) => booking.status === 'Comprobante enviado'
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
                    : dayProofCount > 0 || dayPendingCount > 0
                      ? `, disponible con ${dayProofCount} comprobante(s) por revisar y ${dayPendingCount} solicitud(es) pendiente(s)`
                      : ', disponible'
                    }`}
                  onClick={() => openBookingModal(dateStr)}
                >
                  <span>{dayNumber}</span>

                  {isOccupied ? (
                    <small>Ocupada</small>
                  ) : dayProofCount > 0 ? (
                    <small>
                      {dayProofCount} comprobante
                      {dayProofCount !== 1 ? 's' : ''}
                      {dayPendingCount > 0
                        ? ` · ${dayPendingCount} pendiente${dayPendingCount !== 1 ? 's' : ''}`
                        : ''}
                    </small>
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

          <Chip
            label="Comprobante enviado"
            size="small"
            sx={{
              bgcolor: '#E8EFF4',
              color: '#456A85'
            }}
          />
        </Box>

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', px: 3, pt: 1 }}
        >
          La disponibilidad definitiva se valida al registrar la reservación.
          Las solicitudes pendientes y los comprobantes enviados se muestran
          para facilitar el seguimiento administrativo.
        </Typography>
      </section>

      {/* LISTADO DE RESERVAS */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, md: 3 },
          borderRadius: 3,
          border: '1px solid #E2E5DD',
          bgcolor: '#FFFFFF'
        }}
      >
        {/* ENCABEZADO Y FILTROS */}
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', md: 'center' }}
          spacing={2}
          sx={{ mb: 3 }}
        >
          <Box>
            <Typography
              variant="h5"
              sx={{
                fontFamily: 'Georgia, serif',
                color: '#343B32'
              }}
            >
              Reservas del estudio
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 0.5 }}
            >
              {visibleBookings.length} de {bookings.length} reservas
            </Typography>
          </Box>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            alignItems={{ xs: 'stretch', sm: 'center' }}
          >
            {/* BUSCADOR ESTILO CLIENTES */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                width: { xs: '100%', sm: 300 },
                height: 44,
                px: 1.5,
                gap: 1.5,
                border: '1px solid #DDE5D7',
                borderRadius: '12px',
                bgcolor: '#FFFFFF',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s',
                '&:hover': {
                  borderColor: '#9AAA8D'
                },
                '&:focus-within': {
                  borderColor: '#68745B'
                }
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  color: '#68745B',
                  flexShrink: 0
                }}
              >
                <Icon name="search" size={18} />
              </Box>

              <Box
                component="input"
                type="search"
                aria-label="Buscar cliente o evento"
                placeholder="Buscar cliente o evento..."
                value={search || ''}
                onChange={(event) => setSearch(event.target.value)}
                sx={{
                  flex: 1,
                  minWidth: 0,
                  width: '100%',
                  border: '0 !important',
                  outline: '0 !important',
                  boxShadow: 'none !important',
                  WebkitAppearance: 'none',
                  appearance: 'none',
                  bgcolor: 'transparent',
                  color: '#343B32',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  '&:focus, &:focus-visible, &:active': {
                    border: '0 !important',
                    outline: '0 !important',
                    boxShadow: 'none !important'
                  },
                  '&::placeholder': {
                    color: '#92998E',
                    opacity: 1
                  }
                }}
              />

              {search && (
                <IconButton
                  size="small"
                  aria-label="Limpiar búsqueda"
                  onClick={() => setSearch('')}
                  sx={{
                    color: '#68745B',
                    p: 0.3
                  }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              )}
            </Box>

            {/* FILTRO DE ESTADO */}
            <TextField
              select
              label="Estado"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              size="small"
              sx={{
                width: { xs: '100%', sm: 220 },
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  bgcolor: '#FFFFFF',
                  minHeight: 44
                }
              }}
            >
              {BOOKING_STATUS_FILTERS.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </Stack>

        {/* LIMPIAR FILTROS */}
        {hasActiveFilters && (
          <Stack
            direction="row"
            justifyContent="flex-end"
            sx={{ mb: 2 }}
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

        {/* TABLA DE RESERVAS */}
        <Box
          sx={{
            border: '1px solid #E2E5DD',
            borderRadius: 2,
            overflow: 'hidden'
          }}
        >
          <BookingsTable
            rows={visibleBookings}
            packages={packages}
            hasClients={clients.length > 0}
            hasActiveFilters={hasActiveFilters}
            onOpenBookingDetails={openBookingDetailsModal}
            onOpenConfirmPayment={openConfirmPaymentModal}
            onOpenCancelBooking={openCancelBookingModal}
            onOpenExtension={openExtensionModal}
            onCreateBooking={openBookingModal}
            onCreateClient={openClientModal}
          />
        </Box>
      </Paper>
    </Box>
  );
}
