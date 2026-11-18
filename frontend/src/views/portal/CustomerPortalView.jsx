import { useMemo, useState } from 'react';

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  LinearProgress,
  Stack,
  TextField,
  Typography
} from '@mui/material';

import Icon from '../../ui-component/Icon';

const sections = [
  { id: 'reservas', label: 'Mis reservaciones', icon: 'calendar' },
  { id: 'pagos', label: 'Mis pagos' },
  { id: 'galeria', label: 'Mi galería', icon: 'image' },
  { id: 'perfil', label: 'Mis datos' }
];

const packageNames = {
  foto: 'Fotografía',
  video: 'Video',
  combinado: 'Fotografía y video'
};

const statusColors = {
  confirmada: 'success',
  pendiente: 'warning',
  cancelada: 'error',
  entregada: 'info'
};

const formatPrice = (cents = 0) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(Number(cents || 0) / 100);

const formatDate = (value) => {
  if (!value) return 'Fecha no disponible';

  const datePart = String(value).split('T')[0];
  const [year, month, day] = datePart.split('-').map(Number);

  if (!year || !month || !day) return 'Fecha no disponible';

  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date(year, month - 1, day));
};

const getStatusColor = (status) =>
  statusColors[String(status || '').toLowerCase()] || 'default';

export default function CustomerPortalView({
  onLogout,
  reservations = [],
  customer = null
}) {
  const [activeSection, setActiveSection] = useState('reservas');
  const [selectedReservation, setSelectedReservation] = useState(null);

  // Estados del formulario de perfil
  const [profileForm, setProfileForm] = useState({
    name: customer?.name || '',
    email: customer?.email || '',
    phone: customer?.phone || '',
    address: customer?.address || ''
  });

  const [profileMessage, setProfileMessage] = useState('');

  // Resumen de pagos
  const paymentSummary = useMemo(() => {
    return reservations.reduce(
      (summary, reservation) => {
        summary.total += Number(reservation.total_cents || 0);
        summary.paid += Number(reservation.paid_cents || 0);
        return summary;
      },
      { total: 0, paid: 0 }
    );
  }, [reservations]);

  const pendingBalance = Math.max(
    paymentSummary.total - paymentSummary.paid,
    0
  );

  // Sección de reservaciones
  const renderReservations = () => {
    if (!reservations.length) {
      return (
        <EmptyState
          icon="calendar"
          title="Todavía no tienes reservaciones"
          description="Cuando tengas una reservación registrada, podrás consultar aquí la fecha, el paquete y el estado de tu evento."
        />
      );
    }

    return (
      <Stack spacing={2} sx={{ mt: 3 }}>
        {reservations.map((reservation) => {
          const status = reservation.status || 'Sin estado';

          return (
            <Card
              key={reservation.id}
              elevation={0}
              sx={{
                border: '1px solid #E9E6DC',
                borderRadius: 3
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  justifyContent="space-between"
                  alignItems={{ xs: 'flex-start', sm: 'center' }}
                  spacing={2}
                >
                  <Box>
                    <Typography
                      variant="h6"
                      sx={{
                        fontFamily: 'Georgia, serif',
                        color: '#343B32'
                      }}
                    >
                      {reservation.event_type || 'Evento'}
                    </Typography>

                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      sx={{ mt: 1 }}
                    >
                      <Icon name="calendar" />

                      <Typography variant="body2" color="text.secondary">
                        {formatDate(reservation.event_date)}
                      </Typography>
                    </Stack>

                    <Typography
                      variant="body2"
                      sx={{ color: '#72766E', mt: 1 }}
                    >
                      Paquete:{' '}
                      {packageNames[reservation.package] ||
                        reservation.package ||
                        'No especificado'}
                    </Typography>
                  </Box>

                  <Stack
                    alignItems={{ xs: 'flex-start', sm: 'flex-end' }}
                    spacing={1}
                  >
                    <Chip
                      label={status}
                      color={getStatusColor(status)}
                      size="small"
                    />

                    <Typography
                      variant="h6"
                      sx={{ color: '#68745B', fontWeight: 600 }}
                    >
                      {formatPrice(reservation.total_cents)}
                    </Typography>
                  </Stack>
                </Stack>

                <Divider sx={{ my: 2 }} />

                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  justifyContent="space-between"
                  alignItems={{ xs: 'stretch', sm: 'center' }}
                  spacing={2}
                >
                  <Typography variant="body2" color="text.secondary">
                    Anticipo registrado:{' '}
                    <strong>
                      {formatPrice(reservation.paid_cents)}
                    </strong>
                  </Typography>

                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setSelectedReservation(reservation)}
                    sx={{
                      borderColor: '#68745B',
                      color: '#68745B'
                    }}
                  >
                    Ver detalle
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          );
        })}
      </Stack>
    );
  };

  // Sección de pagos
  const renderPayments = () => (
    <Box sx={{ mt: 3 }}>
      {!reservations.length ? (
        <EmptyState
          icon="wallet"
          title="No hay pagos registrados"
          description="Cuando tengas reservaciones y pagos asociados a ellas, podrás consultar aquí tus movimientos."
        />
      ) : (
        <>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
              gap: 2
            }}
          >
            <SummaryCard
              title="Total contratado"
              amount={formatPrice(paymentSummary.total)}
            />

            <SummaryCard
              title="Total pagado"
              amount={formatPrice(paymentSummary.paid)}
            />

            <SummaryCard
              title="Saldo pendiente"
              amount={formatPrice(pendingBalance)}
            />
          </Box>

          <Alert severity="info" sx={{ mt: 3 }}>
            Aquí podrás consultar el historial y los comprobantes de tus pagos
            cuando el servicio de pagos esté integrado.
          </Alert>
        </>
      )}
    </Box>
  );

  // Sección de galería
  const renderGallery = () => (
    <EmptyState
      icon="image"
      title="Tu galería estará aquí"
      description="Cuando el estudio entregue las fotografías y videos de tu evento, podrás visualizarlos y descargarlos desde este espacio."
    />
  );

  // Sección de perfil
  const renderProfile = () => (
    <Box sx={{ mt: 3 }}>
      <Alert severity="info" sx={{ mb: 3 }}>
        Puedes editar los campos para visualizar cómo funcionará tu perfil.
        Los cambios todavía no se guardan en la base de datos.
      </Alert>

      <Stack spacing={2.5}>
        <TextField
          label="Nombre completo"
          value={profileForm.name}
          onChange={(e) => {
            setProfileForm({
              ...profileForm,
              name: e.target.value
            });
            setProfileMessage('');
          }}
          fullWidth
        />

        <TextField
          label="Correo electrónico"
          type="email"
          value={profileForm.email}
          onChange={(e) => {
            setProfileForm({
              ...profileForm,
              email: e.target.value
            });
            setProfileMessage('');
          }}
          fullWidth
        />

        <TextField
          label="Teléfono"
          value={profileForm.phone}
          onChange={(e) => {
            setProfileForm({
              ...profileForm,
              phone: e.target.value.replace(/\D/g, '').slice(0, 10)
            });
            setProfileMessage('');
          }}
          inputProps={{ maxLength: 10 }}
          fullWidth
        />

        <TextField
          label="Dirección"
          value={profileForm.address}
          onChange={(e) => {
            setProfileForm({
              ...profileForm,
              address: e.target.value
            });
            setProfileMessage('');
          }}
          multiline
          rows={3}
          fullWidth
        />

        <Button
          variant="contained"
          onClick={() =>
            setProfileMessage(
              'La vista previa funciona correctamente. El guardado estará disponible cuando conectemos el servicio de clientes.'
            )
          }
          sx={{
            alignSelf: { xs: 'stretch', sm: 'flex-start' },
            bgcolor: '#68745B',
            '&:hover': {
              bgcolor: '#59634B'
            }
          }}
        >
          Guardar cambios
        </Button>

        {profileMessage && (
          <Alert severity="success">
            {profileMessage}
          </Alert>
        )}
      </Stack>
    </Box>
  );

  const sectionRenderers = {
    reservas: renderReservations,
    pagos: renderPayments,
    galeria: renderGallery,
    perfil: renderProfile
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F8F6F0' }}>
      {/* ENCABEZADO */}
      <Box
        component="header"
        sx={{
          bgcolor: '#FFFFFF',
          borderBottom: '1px solid #E9E6DC',
          px: { xs: 2, md: 6 },
          py: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2
        }}
      >
        <Box>
          <Typography
            variant="h5"
            sx={{ fontFamily: 'Georgia, serif', color: '#343B32' }}
          >
            Luz & Memoria
          </Typography>

          <Typography
            variant="caption"
            sx={{ letterSpacing: 2, color: '#7B856D' }}
          >
            ESPACIO DEL CLIENTE
          </Typography>
        </Box>

        <Button
          onClick={onLogout}
          startIcon={<Icon name="logout" />}
          sx={{ color: '#68745B' }}
        >
          Salir
        </Button>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
        {/* BIENVENIDA */}
        <Box sx={{ mb: 4 }}>
          <Typography
            variant="overline"
            sx={{ color: '#7B856D', letterSpacing: 3 }}
          >
            TU ESPACIO PERSONAL
          </Typography>

          <Typography
            variant="h3"
            sx={{
              fontFamily: 'Georgia, serif',
              color: '#343B32',
              fontSize: { xs: 30, md: 40 },
              mt: 1
            }}
          >
            Hola{customer?.name ? `, ${customer.name}` : ''}.
          </Typography>

          <Typography sx={{ color: '#72766E', mt: 1 }}>
            Consulta la información de tus eventos y conserva tus recuerdos
            en un solo lugar.
          </Typography>
        </Box>

        {/* NAVEGACIÓN */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(2, 1fr)',
              sm: 'repeat(4, 1fr)'
            },
            gap: 1.5,
            mb: 4
          }}
        >
          {sections.map((section) => {
            const active = activeSection === section.id;

            return (
              <Button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                variant={active ? 'contained' : 'outlined'}
                aria-pressed={active}
                sx={{
                  minHeight: 90,
                  borderRadius: 3,
                  flexDirection: 'column',
                  gap: 1,
                  borderColor: '#D9DDCF',
                  bgcolor: active ? '#68745B' : '#FFFFFF',
                  color: active ? '#FFFFFF' : '#59634B',
                  '&:hover': {
                    bgcolor: active ? '#59634B' : '#EEF0E9',
                    borderColor: '#68745B'
                  }
                }}
              >
                <Icon name={section.icon} />

                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                  {section.label}
                </Typography>
              </Button>
            );
          })}
        </Box>

        {/* CONTENIDO */}
        <Card
          elevation={0}
          sx={{
            border: '1px solid #E9E6DC',
            borderRadius: 4,
            bgcolor: '#FFFFFF',
            minHeight: 330
          }}
        >
          <CardContent sx={{ p: { xs: 3, md: 5 } }}>
            <Typography
              variant="h5"
              sx={{ fontFamily: 'Georgia, serif', color: '#343B32' }}
            >
              {sections.find((item) => item.id === activeSection)?.label}
            </Typography>

            <Typography sx={{ color: '#72766E', mt: 1 }}>
              {activeSection === 'reservas' &&
                'Consulta las fechas y los detalles de tus eventos.'}
              {activeSection === 'pagos' &&
                'Revisa los importes y saldos de tus reservaciones.'}
              {activeSection === 'galeria' &&
                'Tus fotografías y videos estarán disponibles aquí.'}
              {activeSection === 'perfil' &&
                'Consulta la información de tu cuenta.'}
            </Typography>

            {sectionRenderers[activeSection]()}
          </CardContent>
        </Card>

        <Box textAlign="center" mt={4}>
          <Typography variant="caption" sx={{ color: '#888' }}>
            Luz & Memoria · Cada historia merece ser recordada.
          </Typography>
        </Box>
      </Container>

      {/* VENTANA DE DETALLE DE RESERVACIÓN */}
      <Dialog
        open={Boolean(selectedReservation)}
        onClose={() => setSelectedReservation(null)}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: 4,
            bgcolor: '#FFFFFF'
          }
        }}
      >
        {selectedReservation && (
          <>
            <DialogTitle
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                pr: 2,
                fontFamily: 'Georgia, serif',
                color: '#343B32'
              }}
            >
              Detalle de reservación

              <IconButton
                onClick={() => setSelectedReservation(null)}
                aria-label="Cerrar detalle"
              >
                <Icon name="x" />
              </IconButton>
            </DialogTitle>

            <DialogContent dividers sx={{ p: { xs: 2.5, sm: 3 } }}>
              <Stack spacing={3}>
                <Box>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    flexWrap="wrap"
                    gap={1}
                  >
                    <Typography
                      variant="overline"
                      sx={{ color: '#7B856D', letterSpacing: 2 }}
                    >
                      RESERVACIÓN #{selectedReservation.id}
                    </Typography>

                    <Chip
                      label={selectedReservation.status || 'Sin estado'}
                      color={getStatusColor(selectedReservation.status)}
                      size="small"
                    />
                  </Stack>

                  <Typography
                    variant="h4"
                    sx={{
                      fontFamily: 'Georgia, serif',
                      color: '#343B32',
                      mt: 1
                    }}
                  >
                    {selectedReservation.event_type || 'Evento'}
                  </Typography>
                </Box>

                <Box
                  sx={{
                    bgcolor: '#F8F6F0',
                    borderRadius: 3,
                    p: 2.5
                  }}
                >
                  <DetailRow
                    icon="calendar"
                    label="Fecha del evento"
                    value={formatDate(selectedReservation.event_date)}
                  />

                  <Divider sx={{ my: 2 }} />

                  <DetailRow
                    icon="camera"
                    label="Paquete contratado"
                    value={
                      packageNames[selectedReservation.package] ||
                      selectedReservation.package ||
                      'No especificado'
                    }
                  />
                </Box>

                <Box>
                  <Typography
                    variant="h6"
                    sx={{
                      fontFamily: 'Georgia, serif',
                      color: '#343B32',
                      mb: 2
                    }}
                  >
                    Resumen de pago
                  </Typography>

                  {(() => {
                    const total = Number(
                      selectedReservation.total_cents || 0
                    );
                    const paid = Number(
                      selectedReservation.paid_cents || 0
                    );
                    const pending = Math.max(total - paid, 0);
                    const progress =
                      total > 0
                        ? Math.min((paid / total) * 100, 100)
                        : 0;

                    return (
                      <Stack spacing={2}>
                        <DetailMoneyRow
                          label="Total del paquete"
                          amount={formatPrice(total)}
                        />

                        <DetailMoneyRow
                          label="Anticipo registrado"
                          amount={formatPrice(paid)}
                        />

                        <DetailMoneyRow
                          label="Saldo pendiente"
                          amount={formatPrice(pending)}
                          strong
                        />

                        <Box sx={{ pt: 1 }}>
                          <Stack
                            direction="row"
                            justifyContent="space-between"
                            sx={{ mb: 1 }}
                          >
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Avance de pago
                            </Typography>

                            <Typography
                              variant="caption"
                              sx={{ color: '#68745B', fontWeight: 600 }}
                            >
                              {Math.round(progress)}%
                            </Typography>
                          </Stack>

                          <LinearProgress
                            variant="determinate"
                            value={progress}
                            sx={{
                              height: 9,
                              borderRadius: 5,
                              bgcolor: '#E9EDE4',
                              '& .MuiLinearProgress-bar': {
                                bgcolor: '#879174',
                                borderRadius: 5
                              }
                            }}
                          />
                        </Box>
                      </Stack>
                    );
                  })()}
                </Box>

                <Alert severity="info">
                  La información de esta reservación corresponde a los datos
                  recibidos del sistema. Para consultar movimientos y
                  comprobantes detallados será necesaria la integración del
                  servicio de pagos.
                </Alert>
              </Stack>
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  );
}

// COMPONENTES AUXILIARES

function DetailRow({ icon, label, value }) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="center">
      <Box sx={{ color: '#68745B' }}>
        <Icon name={icon} />
      </Box>

      <Box>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>

        <Typography sx={{ color: '#343B32', fontWeight: 500 }}>
          {value}
        </Typography>
      </Box>
    </Stack>
  );
}

function DetailMoneyRow({ label, amount, strong = false }) {
  return (
    <Stack direction="row" justifyContent="space-between" spacing={2}>
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

function EmptyState({ icon, title, description }) {
  return (
    <Box
      sx={{
        minHeight: 220,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        py: 4
      }}
    >
      <Box
        sx={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          bgcolor: '#EEF0E9',
          color: '#68745B',
          display: 'grid',
          placeItems: 'center',
          mb: 2
        }}
      >
        <Icon name={icon} />
      </Box>

      <Typography
        variant="h6"
        sx={{ fontFamily: 'Georgia, serif', color: '#343B32' }}
      >
        {title}
      </Typography>

      <Typography
        variant="body2"
        sx={{ color: '#72766E', mt: 1, maxWidth: 430 }}
      >
        {description}
      </Typography>
    </Box>
  );
}

function SummaryCard({ title, amount }) {
  return (
    <Card
      elevation={0}
      sx={{
        bgcolor: '#F8F6F0',
        border: '1px solid #E9E6DC',
        borderRadius: 3
      }}
    >
      <CardContent>
        <Typography variant="body2" color="text.secondary">
          {title}
        </Typography>

        <Typography
          variant="h5"
          sx={{
            mt: 1,
            color: '#68745B',
            fontWeight: 600
          }}
        >
          {amount}
        </Typography>
      </CardContent>
    </Card>
  );
}