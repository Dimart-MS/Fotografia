
import { useMemo, useState } from 'react';
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

const EVENT_TYPES = ['Boda', 'XV años', 'Bautizo', 'Fiesta'];

const PACKAGES = [
  {
    id: 'foto',
    name: 'Fotografía',
    price: 3500
  },
  {
    id: 'video',
    name: 'Video',
    price: 4500
  },
  {
    id: 'combinado',
    name: 'Fotografía y video',
    price: 7000
  }
];

const formatPrice = (amount) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 2
  }).format(amount);

export default function BookingRequestView({
  selectedDate,
  onBack,
  onLogin
}) {
  const [eventType, setEventType] = useState('');
  const [packageId, setPackageId] = useState('');

  const selectedPackage = useMemo(
    () => PACKAGES.find((item) => item.id === packageId),
    [packageId]
  );

  const total = selectedPackage?.price || 0;
  const minimumDeposit = total * 0.5;

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

            <TextField
              select
              label="Paquete fotográfico"
              value={packageId}
              onChange={(event) => setPackageId(event.target.value)}
              fullWidth
              required
              helperText="Elige la cobertura que deseas contratar."
            >
              {PACKAGES.map((item) => (
                <MenuItem key={item.id} value={item.id}>
                  {item.name} — {formatPrice(item.price)}
                </MenuItem>
              ))}
            </TextField>

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
                  <Typography color="text.secondary">Evento</Typography>
                  <Typography fontWeight={600}>
                    {eventType || 'Por seleccionar'}
                  </Typography>
                </Stack>

                <Stack direction="row" justifyContent="space-between" gap={2}>
                  <Typography color="text.secondary">Paquete</Typography>
                  <Typography fontWeight={600} textAlign="right">
                    {selectedPackage?.name || 'Por seleccionar'}
                  </Typography>
                </Stack>

                <Stack direction="row" justifyContent="space-between" gap={2}>
                  <Typography color="text.secondary">Precio total</Typography>
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

            <Alert severity="info">
              Esta es una solicitud preliminar. La fecha no queda reservada
              hasta que el estudio confirme la disponibilidad y se cumplan
              las condiciones del anticipo.
            </Alert>

            <Button
              variant="contained"
              size="large"
              disabled={!eventType || !packageId || !selectedDate}
              onClick={onLogin}
              sx={{
                py: 1.5,
                bgcolor: '#68745B',
                '&:hover': { bgcolor: '#59634B' }
              }}
            >
              Iniciar sesión para continuar
            </Button>

            <Typography
              variant="caption"
              color="text.secondary"
              textAlign="center"
            >
              Necesitas una cuenta para enviar tu solicitud de reservación.
            </Typography>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
