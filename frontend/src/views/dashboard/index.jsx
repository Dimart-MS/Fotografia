
import { Button, Chip } from '@mui/material';
import Icon from '../../ui-component/Icon';
import StatCard from '../../ui-component/cards/StatCard';
import BookingsTable from '../../ui-component/tables/BookingsTable';
import { formatPrettyDate, getLocalToday } from '../../utils/formatters';
import useStudio from '../../hooks/useStudio';

// ==============================|| DASHBOARD ADMINISTRATIVO ||============================== //

export default function DashboardView() {
  const {
    clients,
    bookings,
    packages,
    navigateToPage,
    openClientModal,
    openBookingModal,
    openConfirmPaymentModal,
    openCancelBookingModal,
    openBookingDetailsModal
  } = useStudio();

  const todayStr = getLocalToday();

  const confirmedBookings = bookings.filter(
    (booking) => booking.status === 'Confirmada'
  );

  const pendingBookings = bookings.filter(
    (booking) => booking.status === 'Pendiente de anticipo'
  );

  const upcomingBookings = bookings
    .filter(
      (booking) =>
        booking.status !== 'Cancelada' &&
        booking.event_date >= todayStr
    )
    .sort((a, b) => a.event_date.localeCompare(b.event_date));

  const nextConfirmedEvent = confirmedBookings
    .filter((booking) => booking.event_date >= todayStr)
    .sort((a, b) => a.event_date.localeCompare(b.event_date))[0];

  const upcomingRows = upcomingBookings.slice(0, 5);

  const summaryStats = [
    {
      count: clients.length,
      label: 'Clientes registrados',
      icon: 'people'
    },
    {
      count: confirmedBookings.length,
      label: 'Reservas confirmadas',
      icon: 'calendar'
    },
    {
      count: pendingBookings.length,
      label: 'Pendientes de anticipo',
      icon: 'camera'
    },
    {
      count: upcomingBookings.length,
      label: 'Próximos eventos',
      icon: 'calendar'
    }
  ];

  const totalBookings = bookings.length;

  const bookingStatusSummary = [
    {
      label: 'Confirmadas',
      count: confirmedBookings.length,
      color: '#52724c'
    },
    {
      label: 'Pendientes de anticipo',
      count: pendingBookings.length,
      color: '#c29a56'
    },
    {
      label: 'Canceladas',
      count: bookings.filter(
        (booking) => booking.status === 'Cancelada'
      ).length,
      color: '#a65353'
    }
  ];

  return (
    <>
      {/* INDICADORES */}
      <section className="dashboard-section">
        <div className="dashboard-section-heading">
          <h2>Resumen general</h2>
          <p>Indicadores actuales del estudio.</p>
        </div>

        <div className="dashboard-stats">
          {summaryStats.map((stat) => (
            <StatCard
              key={stat.label}
              count={stat.count}
              label={stat.label}
              icon={stat.icon}
            />
          ))}
        </div>
      </section>

      {/* RESERVACIONES Y PRÓXIMO EVENTO */}
      <div className="overview-grid">
        <section className="panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow">
                AGENDA DEL ESTUDIO
              </span>

              <h2>Próximos eventos</h2>

              <p>
                Reservaciones programadas y próximas coberturas.
              </p>
            </div>

            <Button
              variant="outlined"
              onClick={() => navigateToPage('reservas')}
              sx={{
                color: '#526047',
                borderColor: '#B7C4AD',
                borderRadius: 2.5,
                minHeight: 42,
                px: 2.5,
                fontWeight: 600,
                textTransform: 'none',
                whiteSpace: 'nowrap',
                '&:hover': {
                  borderColor: '#68745B',
                  bgcolor: '#F1F4EE'
                }
              }}
            >
              Ver agenda completa
            </Button>

          </div>

          <BookingsTable
            rows={upcomingRows}
            packages={packages}
            hasClients={clients.length > 0}
            hasActiveFilters={false}
            onOpenConfirmPayment={openConfirmPaymentModal}
            onOpenCancelBooking={openCancelBookingModal}
            onCreateBooking={openBookingModal}
            onCreateClient={openClientModal}
            onOpenBookingDetails={openBookingDetailsModal}
          />
        </section>

        <section className="next-card">
          <span className="eyebrow">
            PRÓXIMA COBERTURA CONFIRMADA
          </span>

          <Icon name="camera" size={30} />

          <h2>
            {nextConfirmedEvent
              ? nextConfirmedEvent.client_name
              : 'Sin eventos confirmados'}
          </h2>

          {nextConfirmedEvent ? (
            <>
              <p>
                {nextConfirmedEvent.event_type}
              </p>

              <p>
                {formatPrettyDate(
                  nextConfirmedEvent.event_date
                )}
              </p>

              <Chip
                label="Confirmada"
                size="small"
                sx={{
                  bgcolor: '#e8f0e2',
                  color: '#52724c',
                  fontWeight: 600
                }}
              />
            </>
          ) : (
            <p>
              Cuando se confirme una reservación,
              aparecerá aquí la próxima cobertura.
            </p>
          )}

          <Button
            variant="outlined"
            onClick={() => navigateToPage('reservas')}
            sx={{ mt: 3 }}
          >
            Consultar reservaciones
          </Button>
        </section>
      </div>

      {/* ESTADO DE LAS RESERVACIONES */}
      <section className="panel dashboard-status-panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">
              CONTROL DE RESERVACIONES
            </span>

            <h2>Estado de reservaciones</h2>

            <p>
              Distribución de las reservaciones registradas.
            </p>
          </div>
        </div>

        <div className="dashboard-status-list">
          {bookingStatusSummary.map((item) => {
            const percentage = totalBookings
              ? (item.count / totalBookings) * 100
              : 0;

            return (
              <div
                key={item.label}
                className="dashboard-status-item"
              >
                <div className="dashboard-status-label">
                  <span>{item.label}</span>

                  <strong>
                    {item.count} ({Math.round(percentage)}%)
                  </strong>
                </div>

                <div className="dashboard-progress-track">
                  <div
                    className="dashboard-progress-fill"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: item.color
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
