// third party
import { createSlice } from '@reduxjs/toolkit';

// project imports
import {
  cancelarSolicitudReserva,
  confirmarAnticipoReserva,
  createReserva,
  fetchPaquetes,
  fetchReservas
} from '../../api/reservasService';
import { dispatch } from '../index';

// ==============================|| SLICE - BOOKING & CALENDAR (HU 02) ||============================== //

const initialState = {
  error: null,
  loading: false,
  bookings: [],
  packages: [],
  selectedBooking: null
};

const slice = createSlice({
  name: 'booking',
  initialState,
  reducers: {
    setLoading(state, action) {
      state.loading = action.payload;
    },
    hasError(state, action) {
      state.error = action.payload;
      state.loading = false;
    },
    setSelectedBooking(state, action) {
      state.selectedBooking = action.payload;
    },
    getBookingsSuccess(state, action) {
      state.bookings = action.payload;
      state.loading = false;
      state.error = null;
    },
    getPackagesSuccess(state, action) {
      state.packages = action.payload;
      state.loading = false;
      state.error = null;
    },
    addBookingSuccess(state, action) {
      state.bookings.push(action.payload);
      state.loading = false;
      state.error = null;
    },
    clearBookingsState(state) {
      state.bookings = [];
      state.selectedBooking = null;
      state.loading = false;
      state.error = null;
    }
  }
});

// Reducer
export default slice.reducer;

export const {
  setLoading: setBookingLoading,
  hasError: setBookingError,
  setSelectedBooking,
  getBookingsSuccess,
  getPackagesSuccess,
  addBookingSuccess,
  clearBookingsState
} = slice.actions;

// ==============================|| SLICE - BOOKING ACTIONS ||============================== //


export function getBookingsAndPackages(accessKey) {
  return async () => {
    try {
      dispatch(slice.actions.setLoading(true));

      const [bookingsData, packagesData] = await Promise.all([
        fetchReservas(accessKey),
        fetchPaquetes(accessKey)
      ]);

      dispatch(slice.actions.getBookingsSuccess(bookingsData));
      dispatch(slice.actions.getPackagesSuccess(packagesData));

      return { bookings: bookingsData, packages: packagesData };
    } catch (error) {
      const errorMessage =
        error.message || 'Error al obtener la agenda del estudio';

      dispatch(slice.actions.hasError(errorMessage));
      throw error;
    } finally {
      dispatch(slice.actions.setLoading(false));
    }
  };
}

export function addBooking(bookingData, accessKey) {
  return async () => {
    try {
      dispatch(slice.actions.setLoading(true));

      const created = await createReserva(bookingData, accessKey);
      dispatch(slice.actions.addBookingSuccess(created));

      return created;
    } catch (error) {
      const errorMessage =
        error.message || 'Error al crear la solicitud de reserva';

      dispatch(slice.actions.hasError(errorMessage));
      throw error;
    } finally {
      dispatch(slice.actions.setLoading(false));
    }
  };
}

export function confirmBookingDeposit(bookingId, amount, accessKey) {
  return async () => {
    try {
      dispatch(slice.actions.setLoading(true));

      return await confirmarAnticipoReserva(
        bookingId,
        amount,
        accessKey
      );
    } catch (error) {
      const errorMessage =
        error.message || 'Error al confirmar el anticipo';

      dispatch(slice.actions.hasError(errorMessage));
      throw error;
    } finally {
      dispatch(slice.actions.setLoading(false));
    }
  };
}

export function cancelPendingBooking(bookingId, motivo, accessKey) {
  return async (dispatch) => {
    try {
      dispatch(slice.actions.setLoading(true));

      return await cancelarSolicitudReserva(
        bookingId,
        motivo,
        accessKey
      );
    } catch (error) {
      const errorMessage =
        error.message || 'Error al cancelar la reserva';

      dispatch(slice.actions.hasError(errorMessage));
      throw error;
    } finally {
      dispatch(slice.actions.setLoading(false));
    }
  };
}