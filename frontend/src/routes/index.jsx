
import { useState, useEffect } from 'react';

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
import { getCurrentUser } from '../api/authService';

export default function AppRoutes() {
    const {
        accessKey,
        page,
        authReady,
        activateAdminSession
    } = useStudio();

    const [customerSession, setCustomerSession] = useState(null);
    const [publicView, setPublicView] = useState('home');
    const [bookingDate, setBookingDate] = useState('');
    const [loginReturnView, setLoginReturnView] = useState('home');
    const [registerReturnView, setRegisterReturnView] = useState('home');
    const [customerAuthReady, setCustomerAuthReady] = useState(false);

    // Recuperar y validar la sesión del cliente al actualizar la página.

    useEffect(() => {
        if (!authReady) return;

        // Si ya existe una sesión administrativa, no buscar sesión de cliente.
        if (accessKey) {
            setCustomerAuthReady(true);
            return;
        }

        let cancelled = false;

        const restoreCustomerSession = async () => {
            const savedToken = sessionStorage.getItem('customer_access_token');

            if (!savedToken) {
                setCustomerAuthReady(true);
                return;
            }

            try {
                const user = await getCurrentUser(savedToken);

                if (user.role !== 'Cliente') {
                    throw new Error('La cuenta no corresponde a un cliente.');
                }

                if (cancelled) return;

                setCustomerSession({
                    token: savedToken,
                    user
                });

                const savedView = sessionStorage.getItem('customer_current_view');

                if (user.must_change_password) {
                    setPublicView('change-password');
                } else if (
                    ['customer-portal', 'booking-request'].includes(savedView)
                ) {
                    setPublicView(savedView);
                } else {
                    setPublicView('customer-portal');
                }
            } catch (error) {
                if (!cancelled) {
                    sessionStorage.removeItem('customer_access_token');
                    sessionStorage.removeItem('customer_current_view');
                    sessionStorage.removeItem('customer_active_section');

                    setCustomerSession(null);
                    setPublicView('home');
                }
            } finally {
                if (!cancelled) {
                    setCustomerAuthReady(true);
                }
            }
        };

        restoreCustomerSession();

        return () => {
            cancelled = true;
        };
    }, [authReady, accessKey]);


    // Guardar la pantalla actual mientras exista una sesión de cliente.
    useEffect(() => {
        if (
            customerSession &&
            ['customer-portal', 'booking-request', 'change-password'].includes(publicView)
        ) {
            sessionStorage.setItem('customer_current_view', publicView);
        }
    }, [customerSession, publicView]);

    const clearCustomerSession = () => {
    sessionStorage.removeItem('customer_access_token');
    sessionStorage.removeItem('customer_current_view');
    sessionStorage.removeItem('customer_active_section');

    setCustomerSession(null);
    setPublicView('home');
};

    // Esperar a que se compruebe la sesión administrativa.
    if (!authReady || !customerAuthReady) {
        return <div>Verificando sesión...</div>;
    }

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
            sessionStorage.removeItem('customer_access_token');
            sessionStorage.removeItem('customer_current_view');
            sessionStorage.removeItem('customer_active_section');

            setCustomerSession(null);

            await activateAdminSession(session.token);
            return;
        }

        if (role === 'Cliente') {
            sessionStorage.setItem('customer_access_token', session.token);

            setCustomerSession(session);

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

    // Panel administrativo.
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

    // Cambio obligatorio de contraseña del cliente.
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
                onLogout={clearCustomerSession}
            />
        );
    }

    // Portal del cliente.
    if (
        publicView === 'customer-portal' &&
        customerSession?.user?.role === 'Cliente'
    ) {
        return (
            <CustomerPortalView
                session={customerSession}
                onNewReservation={abrirNuevaReservacion}
                onLogout={clearCustomerSession}
            />
        );
    }

    // Inicio de sesión.
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

    // Registro de clientes.
    if (publicView === 'register') {
        return (
            <RegisterView
                onBack={() => setPublicView(registerReturnView)}
                onLogin={() => openLogin('register')}
            />
        );
    }

    // Solicitud de reservación.
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

    // Calendario público.
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

    // Página principal pública.
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
