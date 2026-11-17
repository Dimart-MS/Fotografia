
import { useState } from 'react';

import MainLayout from '../layout/MainLayout';
import LoginView from '../views/auth/LoginView';

import HomeView from '../views/public/HomeView';
import AvailabilityView from '../views/public/AvailabilityView';

import RegisterView from '../views/portal/RegisterView';
import CustomerLoginView from '../views/portal/CustomerLoginView';
import BookingRequestView from '../views/portal/BookingRequestView';

import DashboardView from '../views/dashboard';
import ClientesView from '../views/clientes';
import ReservasView from '../views/reservas';

import StudioDialogManager from '../views/modals/StudioDialogManager';
import useStudio from '../hooks/useStudio';

export default function AppRoutes() {
    const { accessKey, page } = useStudio();

    const [publicView, setPublicView] = useState('home');
    const [bookingDate, setBookingDate] = useState('');
    const [loginReturnView, setLoginReturnView] = useState('home');
    const [registerReturnView, setRegisterReturnView] = useState('home');

    // Abrir login conservando la pantalla a la que debe regresar
    const openCustomerLogin = (returnView) => {
        setLoginReturnView(returnView);
        setPublicView('customer-login');
    };

    // Panel administrativo
    if (accessKey) {
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

    // Acceso administrativo
    if (publicView === 'admin-login') {
        return <LoginView onBack={() => setPublicView('home')} />;
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
            />
        );
    }

    // Solicitud de reservación
    if (publicView === 'booking-request') {
        return (
            <BookingRequestView
                selectedDate={bookingDate}
                onBack={() => setPublicView('availability')}
                onLogin={() => openCustomerLogin('booking-request')}
            />
        );
    }

    // Calendario de disponibilidad
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
