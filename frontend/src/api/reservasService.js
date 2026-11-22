import { studioRequest } from './httpClient';

// ==============================|| API DE RESERVAS Y AGENDA (HU 02) ||============================== //

/**
 * Consulta las fechas ocupadas de un mes.
 *
 * Endpoint público: no requiere autenticación.
 * Solo devuelve fechas de reservaciones confirmadas,
 * realizadas o entregadas.
 *
 * @param {number} anio - Año que se desea consultar.
 * @param {number} mes - Mes del 1 al 12.
 * @returns {Promise<{anio: number, mes: number, fechas_ocupadas: string[]}>}
 */
export async function fetchFechasOcupadas(anio, mes) {
  if (
    !Number.isInteger(anio) ||
    anio < 1 ||
    anio > 9999 ||
    !Number.isInteger(mes) ||
    mes < 1 ||
    mes > 12
  ) {
    throw new Error('El año o el mes consultado no es válido.');
  }

  return studioRequest(
    `/api/reservas/disponibilidad?anio=${anio}&mes=${mes}`,
    { method: 'GET' }
  );
}

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
 * Registra un pago en efectivo para una reservación.
 *
 * Permite anticipos y abonos parciales, incluso inferiores al 50 %.
 * Los pagos aprobados se acumulan y la reservación se confirma
 * cuando el importe acumulado alcanza el mínimo establecido.
 *
 * También permite abonos adicionales en reservaciones confirmadas
 * hasta liquidar el saldo pendiente.
 *
 * @param {number} bookingId - ID de la reservación
 * @param {string|number} amount - Importe recibido en MXN
 * @param {string} accessKey - Token de autenticación del administrador
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
 * Cancela una solicitud con anticipo vencido y decisión administrativa pendiente.
 * Conserva la reservación, la venta y el historial de cancelación.
 *
 * @param {number} bookingId - ID de la reservación
 * @param {string} motivo - Motivo de cancelación indicado por el administrador
 * @param {string} accessKey - Token de autenticación del administrador
 */
export async function cancelarSolicitudReserva(bookingId, motivo, accessKey) {
  const motivoLimpio = typeof motivo === 'string' ? motivo.trim() : '';

  if (motivoLimpio.length < 5 || motivoLimpio.length > 500) {
    throw new Error('El motivo de cancelación debe tener entre 5 y 500 caracteres.');
  }

  return studioRequest(
    `/api/reservas/${bookingId}/cancelar`,
    {
      method: 'POST',
      body: JSON.stringify({
        motivo: motivoLimpio
      })
    },
    accessKey
  );
}


/**
 * Concede una prórroga para presentar el anticipo.
 * Solo administradores.
 *
 * nuevaFechaLimite:
 * Fecha ISO 8601 con zona horaria.
 *
 * Ejemplo:
 * 2026-11-27T23:59:59-06:00
 */
export async function concederProrrogaReserva(
  bookingId,
  nuevaFechaLimite,
  motivo,
  accessKey
) {
  if (!motivo || !motivo.trim()) {
    throw new Error('Debes indicar el motivo de la prórroga.');
  }

  return studioRequest(
    `/api/reservas/${bookingId}/prorroga`,
    {
      method: 'POST',
      body: JSON.stringify({
        nueva_fecha_limite: nuevaFechaLimite,
        motivo: motivo.trim()
      })
    },
    accessKey
  );
}
