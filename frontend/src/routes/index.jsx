
import { useState } from 'react';

import MainLayout from '../layout/MainLayout';
import LoginView from '../views/auth/LoginView';

import HomeView from '../views/public/HomeView';
import AvailabilityView from '../views/public/AvailabilityView';

import RegisterView from '../views/portal/RegisterView';
import CustomerPortalView from '../views/portal/CustomerPortalView';
import BookingRequestView from '../views/portal/BookingRequestView';

import DashboardView from '../views/dashboard';
import ClientesView from '../views/clientes';
import ReservasView from '../views/reservas';

import StudioDialogManager from '../views/modals/StudioDialogManager';
import useStudio from '../hooks/useStudio';
import PaquetesView from '../views/paquetes';

export default function AppRoutes() {
    const {
        accessKey,
        page,
        activateAdminSession
    } = useStudio();

    const [customerSession, setCustomerSession] = useState(null);
    const [publicView, setPublicView] = useState('home');
    const [bookingDate, setBookingDate] = useState('');
    const [loginReturnView, setLoginReturnView] = useState('home');
    const [registerReturnView, setRegisterReturnView] = useState('home');

    // Abrir un único login
    const openLogin = (returnView = 'home') => {
        setLoginReturnView(returnView);
        setPublicView('login');
    };

    // Redirección automática según el rol
    const handleLoginSuccess = async (session) => {
        const role = session.user.role;

        if (role === 'Administrador') {
            await activateAdminSession(session.token);
            setCustomerSession(null);
            return;
        }

        if (role === 'Cliente') {
            setCustomerSession(session);

            if (loginReturnView === 'booking-request') {
                setPublicView('booking-request');
            } else {
                setPublicView('customer-portal');
            }
            return;
        }

        throw new Error('El rol no tiene un panel disponible.');
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

    // Portal de cliente
    if (
        publicView === 'customer-portal' &&
        customerSession?.user?.role === 'Cliente'
    ) {
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

    // Login unificado
    if (publicView === 'login') {
        return (
            <LoginView
                onBack={() => setPublicView('home')}
                onRegister={() => {
                    setRegisterReturnView('login');
                    setPublicView('register');
                }}
                onLoginSuccess={handleLoginSuccess}
            />
        );
    }

    // Registro de clientes
    if (publicView === 'register') {
        return (
            <RegisterView
                onBack={() => setPublicView(registerReturnView)}
                onLogin={() => openLogin('register')}
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
                onLogin={() => openLogin('booking-request')}
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
            onLogin={() => openLogin('home')}
            onAvailability={() => setPublicView('availability')}
            onRegister={() => {
                setRegisterReturnView('home');
                setPublicView('register');
            }}
        />
    );
}
