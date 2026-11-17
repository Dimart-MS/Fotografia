import { Button } from '@mui/material';
import Icon from '../../ui-component/Icon';
import StatCard from '../../ui-component/cards/StatCard';
import BookingsTable from '../../ui-component/tables/BookingsTable';
import { formatPrettyDate, getLocalToday } from '../../utils/formatters';
import useStudio from '../../hooks/useStudio';

// ==============================|| VISTA GENERAL DEL ESTUDIO (DASHBOARD) ||============================== //

export default function DashboardView() {
  const {
    clients,
    bookings,
    packages,
    navigateToPage,
    openClientModal,
    openBookingModal,
    openConfirmPaymentModal,
    openCancelBookingModal
  } = useStudio();

  const todayStr = getLocalToday();
  const confirmedBookings = bookings.filter((b) => b.status === 'Confirmada');
  const pendingBookings = bookings.filter((b) => b.status === 'Pendiente de anticipo');

  const nextConfirmedEvent = confirmedBookings
    .filter((b) => b.event_date >= todayStr)
    .sort((a, b) => a.event_date.localeCompare(b.event_date))[0];

  const upcomingRows = bookings
  .filter((b) => b.status !== 'Cancelada' && b.event_date >= todayStr)
  .sort((a, b) => a.event_date.localeCompare(b.event_date))
  .slice(0, 5);

  const summaryStats = [
    { count: clients.length, label: 'Clientes registrados', icon: 'people' },
    { count: confirmedBookings.length, label: 'Eventos confirmados', icon: 'calendar' },
    { count: pendingBookings.length, label: 'Solicitudes por confirmar', icon: 'camera' }
  ];

  return (
    <>
      <section className="hero">
        <img
          src="/wedding.jpg"
          alt="Cobertura fotográfica de evento"
        />
        <div className="hero-shade" />
        <div className="hero-content">
          <span className="eyebrow light">CONTROL DE COBERTURAS</span>
          <h2>Agenda de eventos y contrataciones</h2>
          <p>Consulta disponibilidad, registra clientes y gestiona confirmaciones de fecha.</p>
          <button type="button" onClick={() => navigateToPage('reservas')}>
            Ir al calendario de reservas <Icon name="arrow" />
          </button>
        </div>
        <div className="hero-caption">FOTOGRAFÍA &amp; VIDEO SOCIAL</div>
      </section>

      <section className="stats" aria-label="Resumen del estudio">
        {summaryStats.map((stat) => (
          <StatCard
            key={stat.label}
            count={stat.count}
            label={stat.label}
            icon={stat.icon}
          />
        ))}
      </section>

      <div className="overview-grid">
        <section className="panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow">AGENDA RECIENTE</span>
              <h2>Próximos eventos</h2>
            </div>
            <button
              type="button"
              className="text-button"
              onClick={() => navigateToPage('reservas')}
            >
              Ver todas las reservas <Icon name="arrow" size={16} />
            </button>
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
          />
        </section>

        <section className="next-card">
          <span className="eyebrow">PRÓXIMA COBERTURA CONFIRMADA</span>
          <Icon name="camera" size={28} />
          <h2>
            {nextConfirmedEvent
              ? nextConfirmedEvent.client_name
              : 'Sin coberturas próximas'}
          </h2>
          <p>
            {nextConfirmedEvent
              ? `${nextConfirmedEvent.event_type} · ${formatPrettyDate(nextConfirmedEvent.event_date)}`
              : 'Las reservas con anticipo confirmado aparecerán destacadas en esta sección.'}
          </p>
          <Button variant="outlined" onClick={() => navigateToPage('reservas')}>
            Abrir calendario
          </Button>
          <div className="next-bottom">
            ESTADO DE AGENDA <span>↗</span>
          </div>
        </section>
      </div>
    </>
  );
}
