import { studioRequest } from './httpClient';

// ==============================|| API DE PAGOS ||============================== //

/**
 * Obtiene todos los pagos registrados.
 * Solo administradores.
 */
export async function fetchPagos(token) {
    return studioRequest(
        '/api/pagos',
        { method: 'GET' },
        token
    );
}

/**
 * Obtiene los pagos del cliente autenticado.
 */
export async function fetchMisPagos(token) {
    return studioRequest(
        '/api/pagos/mis-pagos',
        { method: 'GET' },
        token
    );
}

/**
 * Obtiene los comprobantes del cliente autenticado,
 * incluidos los pendientes, aprobados y rechazados.
 */
export async function fetchMisComprobantes(token) {
    return studioRequest(
        '/api/pagos/mis-comprobantes',
        { method: 'GET' },
        token
    );
}

/**
 * Obtiene los comprobantes pendientes de revisión.
 * Solo administradores.
 */
export async function fetchComprobantesPendientes(token) {
    return studioRequest(
        '/api/pagos/comprobantes/pendientes',
        { method: 'GET' },
        token
    );
}

/**
 * Presenta un comprobante de transferencia.
 * Solo clientes.
 *
 * datos:
 * {
 *   id_reservacion,
 *   archivo
 * }
 *
 * El importe lo registra el administrador al aprobar.
 */
export async function presentarComprobante(datos, token) {
    const formData = new FormData();

    formData.append(
        'id_reservacion',
        String(datos.id_reservacion)
    );

    formData.append('archivo', datos.archivo);

    return studioRequest(
        '/api/pagos/comprobantes',
        {
            method: 'POST',
            body: formData
        },
        token
    );
}

/**
 * Obtiene una URL temporal para consultar
 * el comprobante almacenado en Supabase.
 * Solo administradores.
 */
export async function fetchArchivoComprobante(idComprobante, token) {
    return studioRequest(
        `/api/pagos/comprobantes/${idComprobante}/archivo`,
        { method: 'GET' },
        token
    );
}

/**
 * Aprueba un comprobante registrando el importe verificado.
 * Solo administradores.
 *
 * monto: cantidad validada por el administrador.
 */
export async function aprobarComprobante(idComprobante, monto, token) {
    return studioRequest(
        `/api/pagos/comprobantes/${idComprobante}/aprobar`,
        {
            method: 'POST',
            body: JSON.stringify({
                monto: String(monto)
            })
        },
        token
    );
}

/**
 * Rechaza un comprobante indicando el motivo.
 * Solo administradores.
 */
export async function rechazarComprobante(
    idComprobante,
    motivo,
    token
) {
    return studioRequest(
        `/api/pagos/comprobantes/${idComprobante}/rechazar`,
        {
            method: 'POST',
            body: JSON.stringify({
                motivo: motivo?.trim() || null
            })
        },
        token
    );
}
