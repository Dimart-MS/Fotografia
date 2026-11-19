import { Alert, Button } from '@mui/material';
import Sidebar from './Sidebar';
import Header from './Header';
import Icon from '../../ui-component/Icon';
import estudioMenu from '../../menu-items/estudio';
import useStudio from '../../hooks/useStudio';

// ==============================|| MAIN LAYOUT SHELL ||============================== //

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
    estudioMenu.children.find((item) => item.id === page) || estudioMenu.children[0];

  const handlePrimaryAction = () => {
    if (page === 'paquetes') return;

    if (page === 'clientes' || !clients.length) {
      openClientModal();
    } else {
      openBookingModal();
    }
  };

  const primaryActionLabel =
    page === 'clientes' || !clients.length ? 'Nuevo cliente' : 'Nueva reserva';
  return (
    <div className="app-shell">
      <Sidebar />

      <div className="main-shell">
        <Header />

        <main>
          <div className="page-heading">
            <div>
              <span className="eyebrow">{currentItem.eyebrow}</span>
              <h1>{currentItem.heading}</h1>
              <p>{currentItem.subtitle}</p>
            </div>
            <Button
              variant="contained"
              startIcon={<Icon name="plus" />}
              onClick={handlePrimaryAction}
              disabled={page === 'paquetes'}
            >
              {primaryActionLabel}
            </Button>
          </div>

          {error && !modal && (
            <Alert
              severity="error"
              action={<Button onClick={() => refreshStudioData()}>Reintentar</Button>}
            >
              {error}
            </Alert>
          )}

          {loading && (
            <div role="status" className="loading-line">
              Actualizando el estudio…
            </div>
          )}

          {children}

          <footer className="footer">
            <span>
              Luz &amp; Memoria <span>·</span> Estudio fotográfico
            </span>
            <span>Hecho para cuidar cada historia.</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
