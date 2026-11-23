import { useState } from 'react';

import MainLayout from '../layout/MainLayout';
import LoginView from '../views/auth/LoginView';

import HomeView from '../views/public/HomeView';
import AvailabilityView from '../views/public/AvailabilityView';

import RegisterView from '../views/portal/RegisterView';
import CustomerPortalView from '../views/portal/CustomerPortalView';
import CustomerChangePasswordView from '../views/portal/CustomerChangePasswordView';
import BookingRequestView from '../views/portal/BookingRequestView';

import DashboardView from '../views/dashboard';
import ClientesView from '../views/clientes';
import ReservasView from '../views/reservas';
import PaquetesView from '../views/paquetes';
import GaleriasView from '../views/galerias';
import EntregasView from '../views/entregas';
import VentasView from '../views/ventas';
import PagosView from '../views/pagos';

import StudioDialogManager from '../views/modals/StudioDialogManager';
import useStudio from '../hooks/useStudio';

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

    const abrirNuevaReservacion = () => {
        setBookingDate('');
        setPublicView('availability');
    };

    const openLogin = (returnView = 'home') => {
        setLoginReturnView(returnView);
        setPublicView('login');
    };

    const handleLoginSuccess = async (session) => {
        const role = session.user.role;

        if (role === 'Administrador') {
            await activateAdminSession(session.token);
            setCustomerSession(null);
            return;
        }

        if (role === 'Cliente') {
            setCustomerSession(session);

            // Primer inicio de sesiÃ³n con contraseÃ±a temporal.
            if (session.user.must_change_password) {
                setPublicView('change-password');
                return;
            }

            if (loginReturnView === 'booking-request') {
                setPublicView('booking-request');
            } else {
                setPublicView('customer-portal');
            }

            return;
        }

        throw new Error('El rol no tiene un panel disponible.');
    };

    if (accessKey) {
        return (
            <>
                <MainLayout>
                    {page === 'inicio' && <DashboardView />}
                    {page === 'clientes' && <ClientesView />}
                    {page === 'reservas' && <ReservasView />}
                    {page === 'paquetes' && <PaquetesView />}
                    {page === 'galerias' && <GaleriasView />}
                    {page === 'entregas' && <EntregasView />}
                    {page === 'ventas' && <VentasView />}
                    {page === 'pagos' && <PagosView />}
                </MainLayout>

                <StudioDialogManager />
            </>
        );
    }

    if (
        customerSession?.user?.role === 'Cliente' &&
        customerSession.user.must_change_password
    ) {
        return (
            <CustomerChangePasswordView
                token={customerSession.token}
                onPasswordChanged={(updatedUser) => {
                    setCustomerSession((previous) => ({
                        ...previous,
                        user: updatedUser
                    }));

                    if (loginReturnView === 'booking-request') {
                        setPublicView('booking-request');
                    } else {
                        setPublicView('customer-portal');
                    }
                }}
                onLogout={() => {
                    setCustomerSession(null);
                    setPublicView('home');
                }}
            />
        );
    }

    if (
        publicView === 'customer-portal' &&
        customerSession?.user?.role === 'Cliente'
    ) {
        return (
            <CustomerPortalView
                session={customerSession}
                onNewReservation={abrirNuevaReservacion}
                onLogout={() => {
                    setCustomerSession(null);
                    setPublicView('home');
                }}
            />
        );
    }

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

    if (publicView === 'register') {
        return (
            <RegisterView
                onBack={() => setPublicView(registerReturnView)}
                onLogin={() => openLogin('register')}
            />
        );
    }

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

    if (publicView === 'availability') {
        return (
            <AvailabilityView
                onBack={() =>
                    setPublicView(
                        customerSession?.user?.role === 'Cliente'
                            ? 'customer-portal'
                            : 'home'
                    )
                }
                onContinue={(date) => {
                    setBookingDate(date);
                    setPublicView('booking-request');
                }}
            />
        );
    }

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
