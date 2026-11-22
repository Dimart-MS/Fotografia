import { createContext, useCallback, useState } from 'react';
import { EMPTY_CLIENT_FORM } from '../config';
import { getLocalToday } from '../utils/formatters';
import { dispatch, useSelector } from '../store';
import {
  addClient,
  clearClientsState,
  getClients
} from '../store/slices/client';
import {
  addBooking,
  cancelPendingBooking,
  clearBookingsState,
  confirmBookingDeposit,
  getBookingsAndPackages,
  setSelectedBooking
} from '../store/slices/booking';
import { closeSnackbar, openSnackbar } from '../store/slices/snackbar';
import { loginUser, getCurrentUser } from '../api/authService';
import { concederProrrogaReserva } from '../api/reservasService';

// ==============================|| CONTEXTO DEL ESTUDIO CONECTADO A REDUX ||============================== //

export const StudioContext = createContext(null);

export function StudioProvider({ children }) {
  const { clients, loading: clientsLoading } = useSelector((state) => state.client);
  const {
    bookings,
    packages,
    selectedBooking,
    loading: bookingsLoading
  } = useSelector((state) => state.booking);
  const { open: snackbarOpen, message: toastMessage } = useSelector(
    (state) => state.snackbar
  );

  const [accessKey, setAccessKey] = useState('');
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [page, setPage] = useState('inicio');
  const [dataVersion, setDataVersion] = useState(0);
  const notifyDataChanged = useCallback(() => {
    setDataVersion((version) => version + 1);
  }, []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_CLIENT_FORM);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todas');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [extensionDate, setExtensionDate] = useState('');
  const [extensionReason, setExtensionReason] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(
    () => new Date(`${getLocalToday()}T12:00:00`)
  );

  const loading = authLoading || clientsLoading || bookingsLoading;

  const setToast = useCallback((msg) => {
    if (msg) {
      dispatch(openSnackbar({ open: true, message: msg, severity: 'success' }));
    } else {
      dispatch(closeSnackbar());
    }
  }, []);

  const refreshStudioData = useCallback(
    async (customKey = accessKey) => {
      try {
        await Promise.all([
          dispatch(getClients(customKey)),
          dispatch(getBookingsAndPackages(customKey))
        ]);
        return true;
      } catch (err) {
        dispatch(clearClientsState());
        dispatch(clearBookingsState());
        setError(err.message || 'No se pudieron cargar los datos del estudio.');
        return false;
      }
    },
    [accessKey]
  );

  const handleLogin = async (event) => {
    event.preventDefault();
    setError('');
    setAuthLoading(true);

    try {
      const response = await loginUser(
        loginEmail.trim(),
        loginPassword
      );

      const token = response.access_token;
      const user = await getCurrentUser(token);

      if (user.role !== 'Administrador') {
        throw new Error('Esta cuenta no tiene permisos de administrador.');
      }

      const success = await refreshStudioData(token);

      if (!success) {
        return;
      }

      setAccessKey(token);
      setLoginPassword('');
      setPage('inicio');
    } catch (err) {
      setError(err.message || 'No se pudo iniciar sesión.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Activar una sesión administrativa ya autenticada
  const activateAdminSession = async (token) => {
    setError('');
    setAuthLoading(true);
    try {
      // Cargar clientes y reservaciones
      const success = await refreshStudioData(token);
      if (!success) {
        throw new Error(
          'No se pudieron cargar los datos administrativos.'
        );
      }
      // Guardar el token en el contexto
      setAccessKey(token);
      // Abrir el dashboard principal
      setPage('inicio');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setAccessKey('');
    setLoginEmail('');
    setLoginPassword('');
    dispatch(clearClientsState());
    dispatch(clearBookingsState());
    dispatch(closeSnackbar());
    setModal(null);
    setError('');
  };

  const navigateToPage = (targetPage) => {
    setPage(targetPage);
    setSearch('');
    setError('');
  };

  const openClientModal = () => {
    setTemporaryPassword('');
    setForm({ ...EMPTY_CLIENT_FORM });
    setError('');
    setModal('client');
  };

  const openBookingModal = (date = getLocalToday(), clientId = '') => {
    setForm({
      client_id: clientId,
      event_date: date,
      event_type: 'Boda',
      package: 'foto'
    });
    setError('');
    setModal('booking');
  };

  const openConfirmPaymentModal = (booking) => {
    const estadosPermitidos = [
      'Pendiente de anticipo',
      'Confirmada'
    ];

    if (!booking || !estadosPermitidos.includes(booking.status)) {
      setError(
        'No se puede registrar un pago en el estado actual de la reservación.'
      );
      return;
    }

    if (
      booking.status === 'Pendiente de anticipo' &&
      booking.decision_anticipo_pendiente
    ) {
      setError(
        'Esta reservación requiere una decisión administrativa antes de registrar un pago.'
      );
      return;
    }

    const totalCentavos = Number(booking.total_cents) || 0;
    const pagadoCentavos = Number(booking.paid_cents) || 0;
    const saldoCentavos = Math.max(
      totalCentavos - pagadoCentavos,
      0
    );

    if (saldoCentavos <= 0) {
      setError('Esta reservación ya está completamente liquidada.');
      return;
    }

    dispatch(setSelectedBooking(booking));

    // El administrador captura el importe realmente recibido.
    // No se exige un anticipo individual del 50 %.
    setPaymentAmount('');

    setError('');
    setModal('payment');
  };

  const openCancelBookingModal = (booking) => {
    if (
      !booking ||
      booking.status !== 'Pendiente de anticipo' ||
      !booking.decision_anticipo_pendiente
    ) {
      setError(
        'Esta reservación no tiene una decisión administrativa pendiente por vencimiento.'
      );
      return;
    }

    dispatch(setSelectedBooking(booking));
    setCancelReason('');
    setError('');
    setModal('cancel');
  };

  const openExtensionModal = (booking) => {
    if (
      booking.status !== 'Pendiente de anticipo' ||
      !booking.decision_anticipo_pendiente
    ) {
      setError(
        'Esta reservación no requiere una decisión administrativa de prórroga.'
      );
      return;
    }

    dispatch(setSelectedBooking(booking));

    setExtensionDate('');
    setExtensionReason('');
    setError('');
    setModal('extension');
  };

  // Abrir detalles de una reservación sin modificarla
  const openBookingDetailsModal = (booking) => {
    dispatch(setSelectedBooking(booking));
    setError('');
    setModal('bookingDetails');
  };

  const closeModal = () => {
    if (!saving) {
      if (modal === 'temporaryPassword') {
        setTemporaryPassword('');
      }
      setModal(null);
    }
  };

  const handleSaveModal = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    let operationCompleted = false;
    try {
      if (modal === 'client') {
        const nuevoCliente = await dispatch(addClient(form, accessKey));
        if (!nuevoCliente?.temporary_password) {
          throw new Error(
            'El cliente se registró, pero no se recibió su contraseña temporal.'
          );
        }
        setTemporaryPassword(nuevoCliente.temporary_password);
        setToast('Cliente registrado correctamente.');
      } else if (modal === 'booking') {
        await dispatch(addBooking(form, accessKey));
        setToast('Solicitud guardada. La fecha se apartará al confirmar el anticipo.');
      } else if (modal === 'payment' && selectedBooking) {
        const importe = Number(paymentAmount);
        const totalCentavos = Number(selectedBooking.total_cents) || 0;
        const pagadoCentavos = Number(selectedBooking.paid_cents) || 0;
        const saldoCentavos = Math.max(
          totalCentavos - pagadoCentavos,
          0
        );

        if (
          !Number.isFinite(importe) ||
          importe <= 0 ||
          !Number.isInteger(importe * 100) ||
          importe * 100 > saldoCentavos
        ) {
          throw new Error(
            'Ingresa un importe válido, mayor que cero, con máximo dos decimales y sin superar el saldo pendiente.'
          );
        }

        const resultado = await dispatch(
          confirmBookingDeposit(
            selectedBooking.id,
            paymentAmount,
            accessKey
          )
        );

        if (resultado?.confirmed_now) {
          setToast(
            'Pago registrado correctamente. Se alcanzó el anticipo mínimo y la reservación quedó confirmada.'
          );
        } else if (resultado?.balance_cents === 0) {
          setToast(
            'Pago registrado correctamente. La reservación quedó completamente liquidada.'
          );
        } else {
          setToast(
            'Abono en efectivo registrado correctamente. El importe se acumuló a los pagos aprobados.'
          );
        }
      } else if (modal === 'cancel' && selectedBooking) {
        const motivo = cancelReason.trim();

        if (motivo.length < 5 || motivo.length > 500) {
          throw new Error(
            'El motivo de cancelación debe tener entre 5 y 500 caracteres.'
          );
        }

        await dispatch(
          cancelPendingBooking(
            selectedBooking.id,
            motivo,
            accessKey
          )
        );

        setCancelReason('');
        setToast('Solicitud cancelada. Se conservó su historial.');
      } else if (modal === 'extension' && selectedBooking) {
        if (!extensionDate) {
          throw new Error('Selecciona la nueva fecha límite.');
        }
        if (!extensionReason.trim()) {
          throw new Error('Debes indicar el motivo de la prórroga.');
        }

        const nuevaFechaLimite = new Date(
          `${extensionDate}T23:59:59-06:00`
        ).toISOString();
        await concederProrrogaReserva(
          selectedBooking.id,
          nuevaFechaLimite,
          extensionReason.trim(),
          accessKey
        );
        setToast('Prórroga concedida correctamente.');
      }

      operationCompleted = true;
      notifyDataChanged();
      if (modal === 'client') {
        setModal('temporaryPassword');
      } else {
        setModal(null);
      }

      const refreshed = await refreshStudioData();

      if (!refreshed) {
        setToast(
          'La operación se guardó, pero no se pudieron actualizar todos los datos. Recarga la pantalla.'
        );
      }
    } catch (err) {
      if (operationCompleted) {
        // Mantener abierto el modal de contraseña temporal si corresponde.
        setModal((actual) =>
          actual === 'temporaryPassword' ? actual : null
        );

        setToast(
          'La operación se guardó, pero ocurrió un problema al actualizar la información. Recarga la pantalla.'
        );
      } else {
        setError(err.message || 'No se pudo completar la operación.');
      }
    } finally {
      setSaving(false);
    }
  };

  const value = {
    accessKey,
    loginEmail,
    setLoginEmail,
    loginPassword,
    setLoginPassword,
    page,
    navigateToPage,
    clients,
    bookings,
    packages,
    loading,
    saving,
    error,
    setError,
    toast: snackbarOpen ? toastMessage : '',
    setToast,
    modal,
    form,
    setForm,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    selectedBooking,
    paymentAmount,
    setPaymentAmount,
    extensionDate,
    setExtensionDate,
    extensionReason,
    setExtensionReason,
    cancelReason,
    setCancelReason,
    calendarMonth,
    setCalendarMonth,
    refreshStudioData,
    handleLogin,
    activateAdminSession,
    handleLogout,
    openClientModal,
    openBookingModal,
    openConfirmPaymentModal,
    openCancelBookingModal,
    openExtensionModal,
    openBookingDetailsModal,
    closeModal,
    handleSaveModal,
    dataVersion,
    notifyDataChanged,
    temporaryPassword,
    setTemporaryPassword,
  };

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>;
}
