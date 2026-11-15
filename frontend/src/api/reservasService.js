import { studioRequest } from './httpClient';

// ==============================|| API DE RESERVAS Y AGENDA (HU 02) ||============================== //

/**
 * Obtiene todas las solicitudes y reservas registradas.
 * @param {string} accessKey - Clave Bearer del estudio
 */
export async function fetchReservas(accessKey) {
  return studioRequest('/api/reservas', { method: 'GET' }, accessKey);
}

/**
 * Obtiene el catálogo de paquetes fotográficos disponibles.
 * @param {string} accessKey - Clave Bearer del estudio
 */
export async function fetchPaquetes(accessKey) {
  return studioRequest('/api/paquetes', { method: 'GET' }, accessKey);
}

/**
 * Crea una nueva solicitud de reserva en estado 'Pendiente de anticipo'.
 * @param {object} bookingData - Datos de la reserva (client_id, event_date, event_type, package)
 * @param {string} accessKey - Clave Bearer del estudio
 */
export async function createReserva(bookingData, accessKey) {
  return studioRequest(
    '/api/reservas',
    {
      method: 'POST',
      body: JSON.stringify({
        ...bookingData,
        client_id: Number(bookingData.client_id)
      })
    },
    accessKey
  );
}

/**
 * Registra el anticipo verificado (50% a 100%) y confirma la fecha en la agenda.
 * @param {number} bookingId - ID de la reserva pendiente
 * @param {string|number} amount - Importe del anticipo en MXN
 * @param {string} accessKey - Clave Bearer del estudio
 */
export async function confirmarAnticipoReserva(bookingId, amount, accessKey) {
  return studioRequest(
    `/api/reservas/${bookingId}/confirmar`,
    {
      method: 'POST',
      body: JSON.stringify({ amount })
    },
    accessKey
  );
}

/**
 * Cancela una solicitud pendiente conservando su registro en el historial.
 * @param {number} bookingId - ID de la reserva pendiente
 * @param {string} accessKey - Clave Bearer del estudio
 */
export async function cancelarSolicitudReserva(bookingId, accessKey) {
  return studioRequest(
    `/api/reservas/${bookingId}/cancelar`,
    {
      method: 'POST'
    },
    accessKey
  );
}
