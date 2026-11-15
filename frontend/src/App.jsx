// project imports
import ThemeCustomization from './themes';
import { StudioProvider } from './contexts/StudioContext';
import AppRoutes from './routes';

// ==============================|| APP PRINCIPAL - LUZ & MEMORIA ||============================== //

export default function App() {
  return (
    <ThemeCustomization>
      <StudioProvider>
        <AppRoutes />
      </StudioProvider>
    </ThemeCustomization>
  );
}
