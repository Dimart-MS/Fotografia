
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography
} from '@mui/material';

import Sidebar from './Sidebar';
import Header from './Header';
import Icon from '../../ui-component/Icon';
import estudioMenu from '../../menu-items/estudio';
import useStudio from '../../hooks/useStudio';

// ==============================|| MAIN LAYOUT - LUZ & MEMORIA ||============================== //

export default function MainLayout({ children }) {
  const {
    page,
    clients,
    error,
    modal,
    loading,
    refreshStudioData,
    openClientModal,
    openBookingModal
  } = useStudio();

  const currentItem =
    estudioMenu.children.find((item) => item.id === page) ||
    estudioMenu.children[0];

  const handlePrimaryAction = () => {
    if (page === 'paquetes') return;

    if (page === 'clientes' || !clients.length) {
      openClientModal();
    } else {
      openBookingModal();
    }
  };

  const primaryActionLabel =
    page === 'clientes' || !clients.length
      ? 'Nuevo cliente'
      : 'Nueva reserva';

  return (
    <div className="app-shell">
      <Sidebar />

      <div className="main-shell">
        <Header />

        <main>
          {/* ENCABEZADO GENERAL */}
          <Box
            component="section"
            sx={{
              mb: 3,
              pb: 3,
              borderBottom: '1px solid #E2E5DD'
            }}
          >
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              justifyContent="space-between"
              alignItems={{ xs: 'stretch', sm: 'center' }}
              spacing={2}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  variant="overline"
                  sx={{
                    color: '#68745B',
                    fontWeight: 700,
                    letterSpacing: 2,
                    fontSize: 11
                  }}
                >
                  {currentItem.eyebrow}
                </Typography>

                <Typography
                  component="h1"
                  sx={{
                    fontFamily: 'Georgia, serif',
                    fontWeight: 600,
                    fontSize: {
                      xs: 26,
                      md: 32
                    },
                    color: '#343B32',
                    mt: 0.5
                  }}
                >
                  {currentItem.heading}
                </Typography>

                <Typography
                  sx={{
                    color: '#72796D',
                    fontSize: 14,
                    mt: 0.5,
                    maxWidth: 680
                  }}
                >
                  {currentItem.subtitle}
                </Typography>
              </Box>

              {page !== 'inicio' && (
                <Button
                  variant="contained"
                  startIcon={<Icon name="plus" />}
                  onClick={handlePrimaryAction}
                  disabled={page === 'paquetes'}
                >
                  {primaryActionLabel}
                </Button>
              )}
            </Stack>
          </Box>

          {/* MENSAJES DE ERROR */}
          {error && !modal && (
            <Alert
              severity="error"
              sx={{
                mb: 3,
                borderRadius: 2
              }}
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => refreshStudioData()}
                >
                  Reintentar
                </Button>
              }
            >
              {error}
            </Alert>
          )}

          {/* ESTADO DE CARGA */}
          {loading && (
            <Stack
              direction="row"
              alignItems="center"
              spacing={1.5}
              role="status"
              sx={{
                mb: 2,
                color: '#68745B'
              }}
            >
              <CircularProgress
                size={16}
                sx={{ color: '#68745B' }}
              />

              <Typography variant="body2">
                Actualizando el estudio...
              </Typography>
            </Stack>
          )}

          {/* CONTENIDO DE CADA PANTALLA */}
          <Box
            component="section"
            sx={{
              minWidth: 0,
              width: '100%'
            }}
          >
            {children}
          </Box>

          {/* PIE DE PÁGINA */}
          <Box
            component="footer"
            sx={{
              mt: 5,
              pt: 2,
              pb: 2,
              borderTop: '1px solid #E2E5DD',
              display: 'flex',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 1
            }}
          >
            <Typography
              variant="caption"
              sx={{ color: '#8A9085' }}
            >
              Luz & Memoria · Estudio fotográfico
            </Typography>

            <Typography
              variant="caption"
              sx={{ color: '#8A9085' }}
            >
              Hecho para cuidar cada historia.
            </Typography>
          </Box>
        </main>
      </div>
    </div>
  );
}
