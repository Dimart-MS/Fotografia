
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

export default function CustomerLoginView({ onBack, onRegister }) {
  const [form, setForm] = useState({
    email: '',
    password: ''
  });

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value
    }));

    setError('');
    setMessage('');
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError('Ingresa un correo electrónico válido.');
      return;
    }

    if (!form.password.trim()) {
      setError('Ingresa tu contraseña.');
      return;
    }

    setMessage(
      'Tus datos son válidos. El inicio de sesión estará disponible cuando se integre la autenticación de clientes del backend.'
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
              BIENVENIDO DE NUEVO
            </Typography>

            <Typography sx={{ color: '#72766E', mt: 2 }}>
              Ingresa a tu cuenta para consultar tus reservaciones y recuerdos.
            </Typography>
          </Box>

          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2.5}>
              <TextField
                label="Correo electrónico"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
                required
                fullWidth
              />

              <TextField
                label="Contraseña"
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                autoComplete="current-password"
                required
                fullWidth
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
                Iniciar sesión
              </Button>
            </Stack>
          </Box>

          <Box textAlign="center" mt={3}>
            <Typography variant="body2" color="text.secondary">
              ¿Todavía no tienes una cuenta?
            </Typography>

            <Button onClick={onRegister} sx={{ color: '#68745B' }}>
              Crear una cuenta
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
