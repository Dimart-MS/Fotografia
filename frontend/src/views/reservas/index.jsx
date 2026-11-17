
import { MenuItem, TextField } from '@mui/material';
import BookingsTable from '../../ui-component/tables/BookingsTable';
import {
  BOOKING_STATUS_FILTERS,
  STUDIO_CONFIG,
  WEEKDAYS_SHORT
} from '../../config';
import { formatPrettyDate, getLocalToday } from '../../utils/formatters';
import useStudio from '../../hooks/useStudio';

// ==============================|| VISTA DE AGENDA Y RESERVAS (HU 02) ||============================== //

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
    {
      month: 'long',
      year: 'numeric'
    }
  );

  const normalizedQuery = search.trim().toLowerCase();

  const visibleBookings = bookings
    .filter(
      (booking) =>
        (statusFilter === 'Todas' || booking.status === statusFilter) &&
        `${booking.client_name || ''} ${booking.event_type || ''}`
          .toLowerCase()
          .includes(normalizedQuery)
    )
    .sort((a, b) => a.event_date.localeCompare(b.event_date));

  return (
    <>
      <section className="panel calendar-panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">DISPONIBILIDAD DEL ESTUDIO</span>
            <h2 className="month-title">{monthTitle}</h2>
          </div>

          <div className="calendar-nav">
            <button
              type="button"
              aria-label="Mes anterior"
              onClick={() =>
                setCalendarMonth(new Date(year, monthIndex - 1, 1))
              }
            >
              ‹
            </button>

            <button
              type="button"
              onClick={() =>
                setCalendarMonth(new Date(`${todayStr}T12:00:00`))
              }
            >
              Hoy
            </button>

            <button
              type="button"
              aria-label="Mes siguiente"
              onClick={() =>
                setCalendarMonth(new Date(year, monthIndex + 1, 1))
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

          {Array.from({ length: firstDayOffset }, (_, idx) => (
            <div key={`blank-${idx}`} />
          ))}

          {Array.from({ length: daysInMonth }, (_, idx) => {
            const dayNumber = idx + 1;

            const dateStr = `${year}-${String(monthIndex + 1).padStart(
              2,
              '0'
            )}-${String(dayNumber).padStart(2, '0')}`;

            const dayEvents = bookings.filter(
              (booking) =>
                booking.event_date === dateStr &&
                booking.status !== 'Cancelada'
            );

            const isOccupied = dayEvents.some(
              (booking) => booking.status === 'Confirmada'
            );

            const isToday = dateStr === todayStr;

            const pendingCount = dayEvents.filter(
              (booking) => booking.status === 'Pendiente de anticipo'
            ).length;

            return (
              <button
                key={dateStr}
                type="button"
                className={`calendar-day ${isToday ? 'today' : ''} ${
                  isOccupied ? 'occupied' : ''
                }`}
                disabled={
                  isOccupied || dateStr < todayStr || !clients.length
                }
                aria-label={`${formatPrettyDate(dateStr)}${
                  isOccupied
                    ? ', ocupado'
                    : pendingCount > 0
                      ? `, disponible con ${pendingCount} solicitud(es) pendiente(s)`
                      : ', disponible'
                }`}
                onClick={() => openBookingModal(dateStr)}
              >
                <span>{dayNumber}</span>

                {dayEvents.length > 0 && (
                  <small>
                    {isOccupied
                      ? 'Confirmada'
                      : `${pendingCount} pendiente${
                          pendingCount !== 1 ? 's' : ''
                        }`}
                  </small>
                )}
              </button>
            );
          })}
        </div>

        <p className="calendar-hint">
          <span className="legend-dot" />
          Confirmada
          <span className="legend-dot pending-dot" />
          Pendiente de anticipo
          <span>Solo los eventos confirmados bloquean la fecha.</span>
        </p>
      </section>

      <section className="panel">
        <div className="section-heading">
          <h2>Reservas del estudio</h2>

          <div className="filters">
            <TextField
              label="Buscar cliente o evento"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              size="small"
            />

            <TextField
              select
              label="Estado"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              size="small"
            >
              {BOOKING_STATUS_FILTERS.map((statusOption) => (
                <MenuItem key={statusOption} value={statusOption}>
                  {statusOption}
                </MenuItem>
              ))}
            </TextField>
          </div>
        </div>

        <BookingsTable
          rows={visibleBookings}
          packages={packages}
          hasClients={clients.length > 0}
          hasActiveFilters={
            Boolean(search) || statusFilter !== 'Todas'
          }
          onOpenConfirmPayment={openConfirmPaymentModal}
          onOpenCancelBooking={openCancelBookingModal}
          onCreateBooking={openBookingModal}
          onCreateClient={openClientModal}
        />
      </section>
    </>
  );
}
