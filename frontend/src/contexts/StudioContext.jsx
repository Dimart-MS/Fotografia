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
  const [loginKey, setLoginKey] = useState('');
  const [page, setPage] = useState('inicio');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_CLIENT_FORM);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todas');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(
    () => new Date(`${getLocalToday()}T12:00:00`)
  );

  const loading = clientsLoading || bookingsLoading;

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
        setError(err.message);
        return false;
      }
    },
    [accessKey]
  );

  const handleLogin = async (event) => {
    event.preventDefault();
    setError('');
    const success = await refreshStudioData(loginKey);
    if (success) {
      setAccessKey(loginKey);
    }
  };

  const handleLogout = () => {
    setAccessKey('');
    setLoginKey('');
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
    dispatch(setSelectedBooking(booking));
    setPaymentAmount(String(booking.total_cents / 200));
    setError('');
    setModal('payment');
  };

  const openCancelBookingModal = (booking) => {
    dispatch(setSelectedBooking(booking));
    setError('');
    setModal('cancel');
  };

  const closeModal = () => {
    if (!saving) {
      setModal(null);
    }
  };

  const handleSaveModal = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      if (modal === 'client') {
        await dispatch(addClient(form, accessKey));
        setToast('Cliente registrado. Ya puedes reservar su evento.');
      } else if (modal === 'booking') {
        await dispatch(addBooking(form, accessKey));
        setToast('Solicitud guardada. La fecha se apartará al confirmar el anticipo.');
      } else if (modal === 'payment' && selectedBooking) {
        await dispatch(
          confirmBookingDeposit(selectedBooking.id, paymentAmount, accessKey)
        );
        setToast('Anticipo registrado y fecha confirmada.');
      } else if (selectedBooking) {
        await dispatch(cancelPendingBooking(selectedBooking.id, accessKey));
        setToast('Solicitud cancelada.');
      }

      setModal(null);
      await refreshStudioData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const value = {
    accessKey,
    loginKey,
    setLoginKey,
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
    calendarMonth,
    setCalendarMonth,
    refreshStudioData,
    handleLogin,
    handleLogout,
    openClientModal,
    openBookingModal,
    openConfirmPaymentModal,
    openCancelBookingModal,
    closeModal,
    handleSaveModal
  };

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>;
}
