import { Alert, Button, CircularProgress, TextField } from '@mui/material';
import Logo from '../../ui-component/Logo';
import Icon from '../../ui-component/Icon';
import { STUDIO_CONFIG } from '../../config';
import useStudio from '../../hooks/useStudio';

// ==============================|| VISTA DE ACCESO AL ESTUDIO ||============================== //

export default function LoginView({ onBack }) {
  const {
    loginEmail,
    setLoginEmail,
    loginPassword,
    setLoginPassword,
    loading,
    error,
    handleLogin
  } = useStudio();

  return (
    <div className="login-shell">
      <div className="login-photo">
        <img
          src="/wedding.jpg"
          alt="Cobertura fotográfica de evento social"
        />
        <div className="photo-shade" />
        <div className="login-story">
          <span className="eyebrow light">FOTOGRAFÍA &amp; VIDEO PROFESIONAL</span>
          <h1>
            Gestión integral
            <br />
            <em>de eventos y clientes.</em>
          </h1>
          <p>
            Control de agenda, paquetes contratados, directorio de clientes y
            seguimiento de anticipos del estudio.
          </p>
        </div>
        <span className="photo-credit">LUZ &amp; MEMORIA · SISTEMA DE GESTIÓN</span>
      </div>

      <div className="login-panel">
        <Logo iconSize={28} />

        {onBack && (
          <Button
            variant="text"
            onClick={onBack}
            sx={{ alignSelf: 'flex-start', mt: 2 }}
          >
            Volver al inicio
          </Button>
        )}

        <div className="login-content">
          <span className="eyebrow">ACCESO ADMINISTRATIVO</span>
          <h2>Iniciar sesión</h2>
          <p>
            Ingresa tu correo electrónico y contraseña para administrar
            clientes, fechas y reservaciones del estudio.
          </p>

          <form onSubmit={handleLogin}>
            <TextField
              label="Correo electrónico"
              type="email"
              required
              fullWidth
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              autoComplete="username"
            />

            <TextField
              label="Contraseña"
              type="password"
              required
              fullWidth
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              autoComplete="current-password"
              helperText="Acceso exclusivo para administradores del estudio."
            />

            {error && <Alert severity="error">{error}</Alert>}

            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              disabled={loading}
              endIcon={
                loading ? <CircularProgress size={16} /> : <Icon name="arrow" />
              }
            >
              {loading ? 'Verificando acceso…' : 'Entrar al estudio'}
            </Button>
          </form>
        </div>

        <small className="login-footer">{STUDIO_CONFIG.locationFooter}</small>
      </div>
    </div>
  );
}
