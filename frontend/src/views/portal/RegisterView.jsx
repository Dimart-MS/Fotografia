
import { useState } from 'react';

import {
  Alert,
  Box,
  Button,
  Container,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
  InputAdornment
} from '@mui/material';

import Icon from '../../ui-component/Icon';

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

    setForm((previous) => ({
      ...previous,
      [name]: value
    }));

    setError('');
    setMessage('');
  };

  const handlePhoneChange = (event) => {
    const phone = event.target.value.replace(/\D/g, '').slice(0, 10);

    setForm((previous) => ({
      ...previous,
      phone
    }));

    setError('');
    setMessage('');
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    setError('');
    setMessage('');

    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const address = form.address.trim();

    if (name.length < 3) {
      setError('El nombre debe tener al menos 3 caracteres.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Ingresa un correo electrónico válido.');
      return;
    }

    if (!/^\d{10}$/.test(form.phone)) {
      setError('El teléfono debe contener exactamente 10 dígitos.');
      return;
    }

    if (address.length < 5) {
      setError('Ingresa un domicilio válido de al menos 5 caracteres.');
      return;
    }

    if (form.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (!/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) {
      setError('La contraseña debe incluir al menos una letra y un número.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setMessage(
      '¡Excelente! Tus datos cumplen con las validaciones. El registro se podrá completar cuando se integre el servicio de cuentas del backend.'
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
              CREA TU CUENTA
            </Typography>

            <Typography sx={{ color: '#72766E', mt: 2 }}>
              Regístrate para comenzar a planear tus momentos especiales.
            </Typography>
          </Box>

          {/* FORMULARIO */}
          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2.3}>

              <TextField
                label="Nombre completo"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                fullWidth
                autoComplete="name"
                inputProps={{ maxLength: 100 }}
                helperText="Escribe tu nombre completo."
              />

              <TextField
                label="Correo electrónico"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                required
                fullWidth
                autoComplete="email"
                inputProps={{ maxLength: 160 }}
              />

              <TextField
                label="Teléfono"
                name="phone"
                value={form.phone}
                onChange={handlePhoneChange}
                required
                fullWidth
                autoComplete="tel"
                inputProps={{
                  inputMode: 'numeric',
                  maxLength: 10
                }}
                helperText={`${form.phone.length}/10 dígitos`}
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
                autoComplete="street-address"
                inputProps={{ maxLength: 250 }}
              />

              <Divider sx={{ my: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  SEGURIDAD DE TU CUENTA
                </Typography>
              </Divider>

              <TextField
                label="Contraseña"
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                required
                fullWidth
                autoComplete="new-password"
                helperText="Mínimo 8 caracteres, incluyendo una letra y un número."
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
                error={
                  Boolean(form.confirmPassword) &&
                  form.password !== form.confirmPassword
                }
                helperText={
                  form.confirmPassword &&
                  form.password !== form.confirmPassword
                    ? 'Las contraseñas no coinciden.'
                    : 'Escribe nuevamente tu contraseña.'
                }
              />

              {error && (
                <Alert severity="error">
                  {error}
                </Alert>
              )}

              {message && (
                <Alert severity="success">
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
                Crear mi cuenta
              </Button>

            </Stack>
          </Box>

          {/* INICIAR SESIÓN */}
          <Box textAlign="center" mt={3}>
            <Typography variant="body2" color="text.secondary">
              ¿Ya tienes una cuenta?
            </Typography>

            <Button
              onClick={onLogin}
              sx={{ color: '#68745B' }}
            >
              Iniciar sesión
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
