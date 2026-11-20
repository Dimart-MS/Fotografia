
import { useEffect, useMemo, useState } from 'react';

import {
  Alert,
  Box,
  Button,
  Container,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography
} from '@mui/material';

import {
  createReserva,
  fetchPaquetes
} from '../../api/reservasService';

const EVENT_TYPES = ['Boda', 'XV años', 'Bautizo', 'Fiesta'];

const formatPrice = (amount) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 2
  }).format(Number(amount || 0));

export default function BookingRequestView({
  selectedDate,
  onBack,
  onLogin,
  session,
  onReservationCreated
}) {
  const [eventType, setEventType] = useState('');
  const [packageId, setPackageId] = useState('');

  const [packages, setPackages] = useState([]);
  const [loadingPackages, setLoadingPackages] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Cargar paquetes activos desde el backend
  useEffect(() => {
    const loadPackages = async () => {
      try {
        setLoadingPackages(true);
        setError('');

        const response = await fetchPaquetes();

        const activePackages = Array.isArray(response)
          ? response.filter((item) => item.active !== false)
          : [];

        setPackages(activePackages);
      } catch (err) {
        console.error('Error al cargar paquetes:', err);
        setError(err.message || 'No se pudieron cargar los paquetes.');
      } finally {
        setLoadingPackages(false);
      }
    };

    loadPackages();
  }, []);

  // Identificar el paquete seleccionado
  const selectedPackage = useMemo(
    () => packages.find((item) => item.id === packageId),
    [packages, packageId]
  );

  // Los precios de la API vienen en centavos
  const total = Number(selectedPackage?.price_cents || 0) / 100;
  const minimumDeposit = total * 0.5;

  // Registrar solicitud de reservación
  const handleReservation = async () => {
    setError('');

    if (!eventType || !packageId || !selectedDate) {
      setError('Completa todos los campos de la reservación.');
      return;
    }

    if (!session?.token || !session?.user?.client_id) {
      onLogin();
      return;
    }

    setLoading(true);

    try {
      const reservation = await createReserva(
        {
          client_id: session.user.client_id,
          event_date: selectedDate,
          event_type: eventType,
          package: packageId
        },
        session.token
      );

      onReservationCreated(reservation);
    } catch (err) {
      console.error('Error al registrar reservación:', err);
      setError(err.message || 'No se pudo registrar la reservación.');
    } finally {
      setLoading(false);
    }
  };

  // Formatear fecha seleccionada
  const formattedDate = selectedDate
    ? new Intl.DateTimeFormat('es-MX', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }).format(new Date(`${selectedDate}T12:00:00`))
    : 'No se ha seleccionado una fecha';

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F8F6F0', py: 5 }}>
      <Container maxWidth="md">

        <Button onClick={onBack} sx={{ color: '#68745B', mb: 3 }}>
          ← Volver al calendario
        </Button>

        {/* ENCABEZADO */}
        <Box textAlign="center" mb={4}>
          <Typography
            variant="overline"
            sx={{ color: '#7B856D', letterSpacing: 3 }}
          >
            EL PRIMER PASO DE TU HISTORIA
          </Typography>

          <Typography
            variant="h3"
            sx={{
              fontFamily: 'Georgia, serif',
              color: '#343B32',
              fontSize: { xs: 30, md: 42 },
              my: 1
            }}
          >
            Solicita tu reservación
          </Typography>

          <Typography sx={{ color: '#72766E' }}>
            Cuéntanos qué evento quieres celebrar y cómo te gustaría recordarlo.
          </Typography>
        </Box>

        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, md: 4 },
            borderRadius: 4,
            border: '1px solid #E9E6DC'
          }}
        >
          <Stack spacing={3}>

            {/* FECHA */}
            <Box>
              <Typography
                variant="overline"
                sx={{ color: '#7B856D', letterSpacing: 2 }}
              >
                FECHA SELECCIONADA
              </Typography>

              <Typography
                variant="h6"
                sx={{
                  color: '#343B32',
                  fontFamily: 'Georgia, serif',
                  textTransform: 'capitalize'
                }}
              >
                {formattedDate}
              </Typography>
            </Box>

            {/* TIPO DE EVENTO */}
            <TextField
              select
              label="Tipo de evento"
              value={eventType}
              onChange={(event) => setEventType(event.target.value)}
              fullWidth
              required
              helperText="Selecciona el tipo de celebración."
            >
              {EVENT_TYPES.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </TextField>

            {/* PAQUETES */}
            <TextField
              select
              label="Paquete fotográfico"
              value={packageId}
              onChange={(event) => setPackageId(event.target.value)}
              fullWidth
              required
              disabled={loadingPackages || packages.length === 0}
              helperText={
                loadingPackages
                  ? 'Cargando paquetes...'
                  : packages.length === 0
                    ? 'No hay paquetes disponibles actualmente.'
                    : 'Elige la cobertura que deseas contratar.'
              }
            >
              {packages.map((item) => (
                <MenuItem key={item.id} value={item.id}>
                  {item.name} — {formatPrice(Number(item.price_cents) / 100)}
                </MenuItem>
              ))}
            </TextField>

            {/* RESUMEN */}
            <Box
              sx={{
                p: 3,
                bgcolor: '#F2F3ED',
                borderRadius: 3
              }}
            >
              <Typography
                variant="overline"
                sx={{ color: '#7B856D', letterSpacing: 2 }}
              >
                RESUMEN DE TU SOLICITUD
              </Typography>

              <Stack spacing={1.5} mt={2}>
                <Stack direction="row" justifyContent="space-between" gap={2}>
                  <Typography color="text.secondary">
                    Evento
                  </Typography>

                  <Typography fontWeight={600}>
                    {eventType || 'Por seleccionar'}
                  </Typography>
                </Stack>

                <Stack direction="row" justifyContent="space-between" gap={2}>
                  <Typography color="text.secondary">
                    Paquete
                  </Typography>

                  <Typography fontWeight={600} textAlign="right">
                    {selectedPackage?.name || 'Por seleccionar'}
                  </Typography>
                </Stack>

                {selectedPackage?.description && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                  >
                    {selectedPackage.description}
                  </Typography>
                )}

                <Stack direction="row" justifyContent="space-between" gap={2}>
                  <Typography color="text.secondary">
                    Precio total
                  </Typography>

                  <Typography fontWeight={600}>
                    {formatPrice(total)}
                  </Typography>
                </Stack>

                <Box sx={{ borderTop: '1px solid #D9DDCF', pt: 1.5 }}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    gap={2}
                  >
                    <Box>
                      <Typography fontWeight={700} color="#59634B">
                        Anticipo mínimo (50 %)
                      </Typography>

                      <Typography variant="caption" color="text.secondary">
                        Para confirmar la fecha
                      </Typography>
                    </Box>

                    <Typography
                      variant="h5"
                      fontWeight={700}
                      color="#59634B"
                    >
                      {formatPrice(minimumDeposit)}
                    </Typography>
                  </Stack>
                </Box>
              </Stack>
            </Box>

            {/* ERRORES */}
            {error && (
              <Alert severity="error">
                {error}
              </Alert>
            )}

            {/* BOTÓN */}
            <Button
              variant="contained"
              size="large"
              disabled={
                !eventType ||
                !packageId ||
                !selectedDate ||
                loading ||
                loadingPackages ||
                packages.length === 0
              }
              onClick={handleReservation}
              sx={{
                py: 1.5,
                bgcolor: '#68745B',
                '&:hover': { bgcolor: '#59634B' }
              }}
            >
              {loading
                ? 'Registrando reservación...'
                : 'Enviar solicitud de reservación'}
            </Button>

            <Typography
              variant="caption"
              color="text.secondary"
              textAlign="center"
            >
              Tu solicitud se registrará como pendiente de anticipo.
            </Typography>

          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
