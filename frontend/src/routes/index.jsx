
import { useState } from 'react';

import MainLayout from '../layout/MainLayout';
import LoginView from '../views/auth/LoginView';

import HomeView from '../views/public/HomeView';
import AvailabilityView from '../views/public/AvailabilityView';

import RegisterView from '../views/portal/RegisterView';
import CustomerLoginView from '../views/portal/CustomerLoginView';
import CustomerPortalView from '../views/portal/CustomerPortalView';
import BookingRequestView from '../views/portal/BookingRequestView';

import DashboardView from '../views/dashboard';
import ClientesView from '../views/clientes';
import ReservasView from '../views/reservas';

import StudioDialogManager from '../views/modals/StudioDialogManager';
import useStudio from '../hooks/useStudio';
import PaquetesView from '../views/paquetes';

export default function AppRoutes() {
    const { accessKey, page } = useStudio();
    const [customerSession, setCustomerSession] = useState(null);

    const [publicView, setPublicView] = useState('home');
    const [bookingDate, setBookingDate] = useState('');
    const [loginReturnView, setLoginReturnView] = useState('home');
    const [registerReturnView, setRegisterReturnView] = useState('home');

    // Abrir login conservando la pantalla anterior
    const openCustomerLogin = (returnView) => {
        setLoginReturnView(returnView);
        setPublicView('customer-login');
    };

    const handleCustomerLoginSuccess = (session) => {
        setCustomerSession(session);

        if (loginReturnView === 'booking-request') {
            setPublicView('booking-request');
        } else {
            setPublicView('customer-portal');
        }
    };

    // Panel administrativo
    if (accessKey) {
        return (
            <>
                <MainLayout>
                    {page === 'inicio' && <DashboardView />}
                    {page === 'clientes' && <ClientesView />}
                    {page === 'reservas' && <ReservasView />}
                    {page === 'paquetes' && <PaquetesView />}
                </MainLayout>

                <StudioDialogManager />
            </>
        );
    }

    if (publicView === 'customer-portal' && customerSession?.user?.role === 'Cliente') {
        return (
            <CustomerPortalView
                session={customerSession}
                onLogout={() => {
                    setCustomerSession(null);
                    setPublicView('home');
                }}
            />
        );
    }

    // Acceso administrativo
    if (publicView === 'admin-login') {
        return (
            <LoginView
                onBack={() => setPublicView('home')}
            />
        );
    }

    // Registro de clientes
    if (publicView === 'register') {
        return (
            <RegisterView
                onBack={() => setPublicView(registerReturnView)}
                onLogin={() => openCustomerLogin('register')}
            />
        );
    }

    // Inicio de sesión de clientes
    if (publicView === 'customer-login') {
        return (
            <CustomerLoginView
                onBack={() => setPublicView(loginReturnView)}
                onRegister={() => {
                    setRegisterReturnView('customer-login');
                    setPublicView('register');
                }}
                onLoginSuccess={handleCustomerLoginSuccess}
            />
        );
    }

    // Solicitud de reservación
    if (publicView === 'booking-request') {
        return (
            <BookingRequestView
                selectedDate={bookingDate}
                session={customerSession}
                onBack={() => setPublicView('availability')}
                onLogin={() => openCustomerLogin('booking-request')}
                onReservationCreated={() => {
                    setPublicView('customer-portal');
                }}
            />
        );
    }

    // Calendario público
    if (publicView === 'availability') {
        return (
            <AvailabilityView
                onBack={() => setPublicView('home')}
                onContinue={(date) => {
                    setBookingDate(date);
                    setPublicView('booking-request');
                }}
            />
        );
    }

    // Página principal pública
    return (
        <HomeView
            onAdminAccess={() => setPublicView('admin-login')}
            onAvailability={() => setPublicView('availability')}
            onRegister={() => {
                setRegisterReturnView('home');
                setPublicView('register');
            }}
            onCustomerLogin={() => openCustomerLogin('home')}
        />
    );
}
