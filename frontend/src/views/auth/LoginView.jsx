
import { useState } from 'react';
import {
  Alert,
  Button,
  CircularProgress,
  TextField,
  InputAdornment,
  IconButton
} from '@mui/material';

import Logo from '../../ui-component/Logo';
import { STUDIO_CONFIG } from '../../config';
import { loginUser, getCurrentUser } from '../../api/authService';

export default function LoginView({
  onBack,
  onRegister,
  onLoginSuccess
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Autenticación con el backend existente
      const result = await loginUser(
        email.trim().toLowerCase(),
        password
      );

      if (!result.access_token) {
        throw new Error('No se recibió un token de acceso.');
      }

      // Consultar el rol real del usuario
      const user = await getCurrentUser(result.access_token);

      if (!['Administrador', 'Cliente'].includes(user.role)) {
        throw new Error('Tu cuenta no tiene un panel habilitado.');
      }

      // Enviar sesión al componente de rutas
      await onLoginSuccess({
        token: result.access_token,
        user
      });

      setPassword('');
    } catch (err) {
      setError(err.message || 'No fue posible iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-shell">
      <div className="login-photo">
        <img
          src="/wedding.jpg"
          alt="Fotografía de una celebración"
        />

        <div className="photo-shade" />

        <div className="login-story">
          <span className="eyebrow light">
            LUZ &amp; MEMORIA · FOTOGRAFÍA PROFESIONAL
          </span>

          <h1>
            Momentos que merecen
            <em> ser recordados.</em>
          </h1>

          <p>
            Tu espacio para organizar eventos,
            consultar reservaciones y gestionar el estudio.
          </p>
        </div>

        <span className="photo-credit">
          LUZ &amp; MEMORIA · CADA HISTORIA CUENTA
        </span>
      </div>

      <div className="login-panel">
        <Logo iconSize={28} />

        {onBack && (
          <Button
            variant="text"
            onClick={onBack}
            sx={{ alignSelf: 'flex-start', mt: 2 }}
          >
            ← Volver al inicio
          </Button>
        )}

        <div className="login-content">
          <span className="eyebrow">
            BIENVENIDO A LUZ &amp; MEMORIA
          </span>

          <h2>Iniciar sesión</h2>

          <p>
            Ingresa tus credenciales. Te llevaremos
            automáticamente a tu espacio según tu cuenta.
          </p>

          <form onSubmit={handleSubmit}>
            <TextField
              label="Correo electrónico"
              type="email"
              required
              fullWidth
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
            />

            <TextField
              label="Contraseña"
              type={showPassword ? 'text' : 'password'}
              required
              fullWidth
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={
                        showPassword
                          ? 'Ocultar contraseña'
                          : 'Mostrar contraseña'
                      }
                      onClick={() =>
                        setShowPassword((value) => !value)
                      }
                      edge="end"
                    >
                      {showPassword ? '◉' : '◎'}
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
              fullWidth
              disabled={loading}
            >
              {loading ? (
                <>
                  <CircularProgress
                    size={18}
                    color="inherit"
                    sx={{ mr: 1 }}
                  />
                  Verificando…
                </>
              ) : (
                'Entrar a mi cuenta'
              )}
            </Button>
          </form>

          {onRegister && (
            <p
              style={{
                textAlign: 'center',
                marginTop: 24
              }}
            >
              ¿Aún no tienes cuenta?
              <Button onClick={onRegister}>
                Crear cuenta de cliente
              </Button>
            </p>
          )}
        </div>

        <small className="login-footer">
          {STUDIO_CONFIG.locationFooter}
        </small>
      </div>
    </div>
  );
}
