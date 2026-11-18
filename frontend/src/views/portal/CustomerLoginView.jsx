
import { useState } from 'react';

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
  onPreview
}) {
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

    const email = form.email.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Ingresa un correo electrónico válido.');
      return;
    }

    if (!form.password.trim()) {
      setError('Ingresa tu contraseña.');
      return;
    }

    setMessage(
      'Tus datos tienen un formato válido. El inicio de sesión real estará disponible cuando se integre la autenticación del backend.'
    );
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
              >
                Iniciar sesión
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

          <Divider sx={{ my: 3 }}>
            <Typography variant="caption" color="text.secondary">
              VISTA DE DESARROLLO
            </Typography>
          </Divider>

          {/* ACCESO TEMPORAL */}
          <Box
            sx={{
              bgcolor: '#F8F6F0',
              borderRadius: 3,
              p: 2.5,
              textAlign: 'center'
            }}
          >
            <Icon name="eye" />

            <Typography
              variant="subtitle2"
              sx={{ color: '#343B32', mt: 1 }}
            >
              ¿Quieres conocer tu portal?
            </Typography>

            <Typography
              variant="body2"
              sx={{ color: '#72766E', my: 1.5 }}
            >
              Puedes explorar las secciones del portal mediante una vista previa.
            </Typography>

            <Button
              variant="outlined"
              fullWidth
              onClick={onPreview}
              sx={{
                borderColor: '#68745B',
                color: '#68745B',
                '&:hover': {
                  bgcolor: '#EEF0E9',
                  borderColor: '#59634B'
                }
              }}
            >
              Explorar portal de prueba
            </Button>

            <Typography
              variant="caption"
              display="block"
              sx={{ color: '#888', mt: 1.5 }}
            >
              Esta opción no inicia una sesión real.
            </Typography>
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
