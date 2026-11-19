
import { studioRequest } from './httpClient';

export async function fetchClientes(token) {
  return studioRequest('/api/clientes', { method: 'GET' }, token);
}

export async function createCliente(clientData, token) {
  return studioRequest(
    '/api/clientes',
    {
      method: 'POST',
      body: JSON.stringify(clientData)
    },
    token
  );
}

export async function updateCliente(clientId, customerData, token) {
  return studioRequest(
    `/api/clientes/${clientId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(customerData)
    },
    token
  );
}

export async function inactivarCliente(clientId, token) {
  return studioRequest(
    `/api/clientes/${clientId}/inactivar`,
    { method: 'PATCH' },
    token
  );
}

export async function reactivarCliente(clientId, token) {
  return studioRequest(
    `/api/clientes/${clientId}/reactivar`,
    { method: 'PATCH' },
    token
  );
}
