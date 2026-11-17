
import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Container,
  Paper,
  Stack,
  TextField,
  Typography
} from '@mui/material';

const initialForm = {
  name: '',
  email: '',
  phone: '',
  address: '',
  password: '',
  confirmPassword: ''
};

export default function RegisterView({ onBack, onLogin }) {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
    setError('');
    setMessage('');
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!/^\d{10}$/.test(form.phone)) {
      setError('El teléfono debe contener exactamente 10 dígitos.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError('Ingresa un correo electrónico válido.');
      return;
    }

    if (form.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setMessage(
      'El formulario es válido. El registro estará disponible cuando se integre el servicio de cuentas del backend.'
    );
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F8F6F0', py: 5 }}>
      <Container maxWidth="sm">
        <Button onClick={onBack} sx={{ color: '#68745B', mb: 2 }}>
          ← Volver al inicio
        </Button>

        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, sm: 5 },
            borderRadius: 4,
            border: '1px solid #E9E6DC'
          }}
        >
          <Box textAlign="center" mb={4}>
            <Typography
              variant="h4"
              sx={{ fontFamily: 'Georgia, serif', color: '#343B32' }}
            >
              Luz & Memoria
            </Typography>

            <Typography
              variant="overline"
              sx={{ letterSpacing: 3, color: '#7B856D' }}
            >
              CREA TU CUENTA
            </Typography>

            <Typography sx={{ color: '#72766E', mt: 2 }}>
              Regístrate para comenzar a planear tus momentos especiales.
            </Typography>
          </Box>

          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2}>
              <TextField
                label="Nombre completo"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                fullWidth
                inputProps={{ maxLength: 100 }}
              />

              <TextField
                label="Correo electrónico"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                required
                fullWidth
                inputProps={{ maxLength: 160 }}
              />

              <TextField
                label="Teléfono"
                name="phone"
                value={form.phone}
                onChange={(event) => {
                  const value = event.target.value.replace(/\D/g, '').slice(0, 10);
                  setForm((previous) => ({ ...previous, phone: value }));
                  setError('');
                  setMessage('');
                }}
                required
                fullWidth
                inputProps={{ inputMode: 'numeric', maxLength: 10 }}
                helperText="Ingresa 10 dígitos."
              />

              <TextField
                label="Domicilio"
                name="address"
                value={form.address}
                onChange={handleChange}
                required
                fullWidth
                multiline
                rows={2}
                inputProps={{ maxLength: 250 }}
              />

              <TextField
                label="Contraseña"
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                required
                fullWidth
                autoComplete="new-password"
                helperText="Mínimo 8 caracteres."
              />

              <TextField
                label="Confirmar contraseña"
                name="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={handleChange}
                required
                fullWidth
                autoComplete="new-password"
              />

              {error && <Alert severity="error">{error}</Alert>}

              {message && <Alert severity="info">{message}</Alert>}

              <Button
                type="submit"
                variant="contained"
                size="large"
                sx={{
                  py: 1.5,
                  bgcolor: '#68745B',
                  '&:hover': { bgcolor: '#59634B' }
                }}
              >
                Crear mi cuenta
              </Button>
            </Stack>
          </Box>

          <Box textAlign="center" mt={3}>
            <Typography variant="body2" color="text.secondary">
              ¿Ya tienes una cuenta?
            </Typography>

            <Button onClick={onLogin} sx={{ color: '#68745B' }}>
              Iniciar sesión
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
