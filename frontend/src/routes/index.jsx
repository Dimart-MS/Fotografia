import MainLayout from '../layout/MainLayout';
import LoginView from '../views/auth/LoginView';
import DashboardView from '../views/dashboard';
import ClientesView from '../views/clientes';
import ReservasView from '../views/reservas';
import StudioDialogManager from '../views/modals/StudioDialogManager';
import useStudio from '../hooks/useStudio';

// ==============================|| ENRUTADOR DE VISTAS Y GUARDIA DE ACCESO ||============================== //

export default function AppRoutes() {
  const { accessKey, page } = useStudio();

  if (!accessKey) {
    return <LoginView />;
  }

  return (
    <>
      <MainLayout>
        {page === 'inicio' && <DashboardView />}
        {page === 'clientes' && <ClientesView />}
        {page === 'reservas' && <ReservasView />}
      </MainLayout>
      <StudioDialogManager />
    </>
  );
}
