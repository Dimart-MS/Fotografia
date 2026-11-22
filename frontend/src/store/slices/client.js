
import { createSlice } from '@reduxjs/toolkit';

// project imports
import { createCliente, fetchClientes } from '../../api/clientesService';
import { dispatch } from '../index';

// ==============================|| SLICE - CLIENT (HU 06) ||============================== //

const initialState = {
  error: null,
  loading: false,
  clients: [],
  selectedClient: null
};

const slice = createSlice({
  name: 'client',
  initialState,
  reducers: {
    setLoading(state, action) {
      state.loading = action.payload;
    },
    hasError(state, action) {
      state.error = action.payload;
      state.loading = false;
    },
    setSelectedClient(state, action) {
      state.selectedClient = action.payload;
    },
    getClientsSuccess(state, action) {
      state.clients = action.payload;
      state.loading = false;
      state.error = null;
    },
    addClientSuccess(state, action) {
      state.clients.unshift(action.payload);
      state.loading = false;
      state.error = null;
    },
    clearClientsState(state) {
      state.clients = [];
      state.selectedClient = null;
      state.loading = false;
      state.error = null;
    }
  }
});

// Reducer
export default slice.reducer;

export const {
  setLoading: setClientLoading,
  hasError: setClientError,
  setSelectedClient,
  getClientsSuccess,
  addClientSuccess,
  clearClientsState
} = slice.actions;

// ==============================|| SLICE - CLIENT ACTIONS ||============================== //

export function getClients(accessKey) {
  return async () => {
    try {
      dispatch(slice.actions.setLoading(true));

      const data = await fetchClientes(accessKey);
      dispatch(slice.actions.getClientsSuccess(data));

      return data;
    } catch (error) {
      const errorMessage =
        error.message || 'Error al obtener clientes';

      dispatch(slice.actions.hasError(errorMessage));
      throw error;
    } finally {
      dispatch(slice.actions.setLoading(false));
    }
  };
}

export function addClient(clientData, accessKey) {
  return async () => {
    try {
      dispatch(slice.actions.setLoading(true));

      const created = await createCliente(clientData, accessKey);
      // La contraseña temporal no debe almacenarse en Redux.
      const { temporary_password, ...clienteSinContrasena } = created;
      dispatch(slice.actions.addClientSuccess(clienteSinContrasena));
      // La contraseña solo se devuelve al flujo que realizó el registro.
      return created;
    } catch (error) {
      const errorMessage =
        error.message || 'Error al registrar el cliente';

      dispatch(slice.actions.hasError(errorMessage));
      throw error;
    } finally {
      dispatch(slice.actions.setLoading(false));
    }
  };
}
