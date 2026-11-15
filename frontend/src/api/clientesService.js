import { studioRequest } from './httpClient';

// ==============================|| API DE CLIENTES (HU 06) ||============================== //

/**
 * Obtiene el listado completo de clientes registrados en el estudio.
 * @param {string} accessKey - Clave Bearer del estudio
 */
export async function fetchClientes(accessKey) {
  return studioRequest('/api/clientes', { method: 'GET' }, accessKey);
}

/**
 * Registra un nuevo cliente en el directorio del estudio.
 * @param {object} clientData - Datos del cliente (name, email, phone, address)
 * @param {string} accessKey - Clave Bearer del estudio
 */
export async function createCliente(clientData, accessKey) {
  return studioRequest(
    '/api/clientes',
    {
      method: 'POST',
      body: JSON.stringify(clientData)
    },
    accessKey
  );
}
