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
    InputAdornment,
    IconButton
} from '@mui/material';

import { changePassword, getCurrentUser } from '../../api/authService';

export default function CustomerChangePasswordView({
    token,
    onPasswordChanged,
    onLogout
}) {
    const [form, setForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleChange = (event) => {
        const { name, value } = event.target;

        setForm((previous) => ({
            ...previous,
            [name]: value
        }));

        setError('');
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');

        if (form.newPassword.length < 8) {
            setError('La nueva contraseña debe tener al menos 8 caracteres.');
            return;
        }

        if (form.newPassword !== form.confirmPassword) {
            setError('Las contraseñas nuevas no coinciden.');
            return;
        }

        if (form.currentPassword === form.newPassword) {
            setError('La nueva contraseña debe ser diferente de la temporal.');
            return;
        }

        setLoading(true);

        try {
            await changePassword(
                token,
                form.currentPassword,
                form.newPassword
            );

            const updatedUser = await getCurrentUser(token);

            if (updatedUser.must_change_password) {
                throw new Error(
                    'No se pudo confirmar el cambio de contraseña.'
                );
            }

            setForm({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });

            onPasswordChanged(updatedUser);
        } catch (err) {
            setError(err.message || 'No se pudo actualizar la contraseña.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                bgcolor: '#F8F6F0',
                py: { xs: 4, md: 7 }
            }}
        >
            <Container maxWidth="sm">
                <Paper
                    elevation={0}
                    sx={{
                        p: { xs: 3, sm: 5 },
                        borderRadius: 4,
                        border: '1px solid #E9E6DC',
                        bgcolor: '#FFFFFF'
                    }}
                >
                    <Stack spacing={3}>
                        <Box textAlign="center">
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
                                    letterSpacing: 2,
                                    color: '#68745B'
                                }}
                            >
                                SEGURIDAD DE TU CUENTA
                            </Typography>
                        </Box>

                        <Typography
                            variant="h5"
                            sx={{
                                fontWeight: 700,
                                color: '#343B32'
                            }}
                        >
                            Cambiar contraseña temporal
                        </Typography>

                        <Alert severity="warning">
                            Por seguridad, debes establecer una contraseña nueva
                            antes de acceder a tus reservaciones y pagos.
                        </Alert>

                        <Box component="form" onSubmit={handleSubmit}>
                            <Stack spacing={2.5}>
                                <TextField
                                    label="Contraseña temporal"
                                    name="currentPassword"
                                    type={showCurrentPassword ? 'text' : 'password'}
                                    value={form.currentPassword}
                                    onChange={handleChange}
                                    autoComplete="current-password"
                                    required
                                    fullWidth
                                    InputProps={{
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton
                                                    aria-label={
                                                        showCurrentPassword
                                                            ? 'Ocultar contraseña temporal'
                                                            : 'Mostrar contraseña temporal'
                                                    }
                                                    onClick={() =>
                                                        setShowCurrentPassword((value) => !value)
                                                    }
                                                    edge="end"
                                                >
                                                    {showCurrentPassword ? '◉' : '◎'}
                                                </IconButton>
                                            </InputAdornment>
                                        )
                                    }}
                                />

                                <TextField
                                    label="Nueva contraseña"
                                    name="newPassword"
                                    type={showNewPassword ? 'text' : 'password'}
                                    value={form.newPassword}
                                    onChange={handleChange}
                                    autoComplete="new-password"
                                    helperText="Mínimo 8 caracteres."
                                    required
                                    fullWidth
                                    InputProps={{
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton
                                                    aria-label={
                                                        showNewPassword
                                                            ? 'Ocultar nueva contraseña'
                                                            : 'Mostrar nueva contraseña'
                                                    }
                                                    onClick={() =>
                                                        setShowNewPassword((value) => !value)
                                                    }
                                                    edge="end"
                                                >
                                                    {showNewPassword ? '◉' : '◎'}
                                                </IconButton>
                                            </InputAdornment>
                                        )
                                    }}
                                />

                                <TextField
                                    label="Confirmar nueva contraseña"
                                    name="confirmPassword"
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={form.confirmPassword}
                                    onChange={handleChange}
                                    autoComplete="new-password"
                                    required
                                    fullWidth
                                    InputProps={{
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton
                                                    aria-label={
                                                        showConfirmPassword
                                                            ? 'Ocultar confirmación de contraseña'
                                                            : 'Mostrar confirmación de contraseña'
                                                    }
                                                    onClick={() =>
                                                        setShowConfirmPassword((value) => !value)
                                                    }
                                                    edge="end"
                                                >
                                                    {showConfirmPassword ? '◉' : '◎'}
                                                </IconButton>
                                            </InputAdornment>
                                        )
                                    }}
                                />

                                {error && (
                                    <Alert severity="error">
                                        {error}
                                    </Alert>
                                )}

                                <Button
                                    type="submit"
                                    variant="contained"
                                    size="large"
                                    disabled={loading}
                                    sx={{
                                        py: 1.5,
                                        bgcolor: '#68745B',
                                        '&:hover': {
                                            bgcolor: '#59634B'
                                        }
                                    }}
                                >
                                    {loading
                                        ? 'Actualizando contraseña...'
                                        : 'Guardar nueva contraseña'}
                                </Button>

                                <Button
                                    variant="text"
                                    onClick={onLogout}
                                    disabled={loading}
                                    sx={{ color: '#68745B' }}
                                >
                                    Cerrar sesión
                                </Button>
                            </Stack>
                        </Box>
                    </Stack>
                </Paper>
            </Container>
        </Box>
    );
}
