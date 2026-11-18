import { useState } from 'react';
import { loginUser, getCurrentUser } from '../../api/authService';

import {
  Alert,
  Box,
  Button,
  Container,
  Paper,
  Stack,
  TextField,
  Typography,
  Divider
} from '@mui/material';

import Icon from '../../ui-component/Icon';

export default function CustomerLoginView({
  onBack,
  onRegister,
  onLoginSuccess
}) {
  const [form, setForm] = useState({
    email: '',
    password: ''
  });

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value
    }));

    setError('');
    setMessage('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError('');
    setMessage('');

    const email = form.email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Ingresa un correo electrónico válido.');
      return;
    }

    if (!form.password.trim()) {
      setError('Ingresa tu contraseña.');
      return;
    }

    setLoading(true);

    try {
      const session = await loginUser(email, form.password);

      const token = session.access_token;

      if (!token) {
        throw new Error('El servidor no devolvió un token de acceso.');
      }

      const user = await getCurrentUser(token);

      if (user.role !== 'Cliente') {
        throw new Error(
          'Esta pantalla es exclusiva para clientes. Utiliza el acceso administrativo.'
        );
      }

      onLoginSuccess({ token, user });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#F8F6F0',
        py: { xs: 3, md: 5 }
      }}
    >
      <Container maxWidth="sm">

        {/* REGRESAR */}
        <Button
          onClick={onBack}
          startIcon={<Icon name="arrow-left" />}
          sx={{ color: '#68745B', mb: 2 }}
        >
          Regresar
        </Button>

        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, sm: 5 },
            borderRadius: 4,
            border: '1px solid #E9E6DC',
            bgcolor: '#FFFFFF'
          }}
        >

          {/* ENCABEZADO */}
          <Box textAlign="center" mb={4}>
            <Typography
              variant="h4"
              sx={{
                fontFamily: 'Georgia, serif',
                color: '#343B32'
              }}
            >
              Luz & Memoria
            </Typography>

            <Typography
              variant="overline"
              sx={{
                letterSpacing: 3,
                color: '#7B856D'
              }}
            >
              BIENVENIDO DE NUEVO
            </Typography>

            <Typography sx={{ color: '#72766E', mt: 2 }}>
              Ingresa a tu cuenta para consultar tus reservaciones y recuerdos.
            </Typography>
          </Box>

          {/* FORMULARIO */}
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

              {error && (
                <Alert severity="error">
                  {error}
                </Alert>
              )}

              {message && (
                <Alert severity="info">
                  {message}
                </Alert>
              )}

              <Button
                type="submit"
                variant="contained"
                size="large"
                sx={{
                  py: 1.5,
                  bgcolor: '#68745B',
                  '&:hover': {
                    bgcolor: '#59634B'
                  }
                }}
                disabled={loading}
              >
                {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
              </Button>

            </Stack>
          </Box>

          {/* REGISTRO */}
          <Box textAlign="center" mt={3}>
            <Typography variant="body2" color="text.secondary">
              ¿Todavía no tienes una cuenta?
            </Typography>

            <Button
              onClick={onRegister}
              sx={{ color: '#68745B' }}
            >
              Crear una cuenta
            </Button>
          </Box>

        </Paper>

        <Box textAlign="center" mt={3}>
          <Typography variant="caption" sx={{ color: '#888' }}>
            Luz & Memoria · Cada historia merece ser recordada.
          </Typography>
        </Box>

      </Container>
    </Box>
  );
}
