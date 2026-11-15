import { STUDIO_CONFIG } from '../config';

// ==============================|| UTILIDADES DE FORMATO Y FECHAS ||============================== //

/**
 * Convierte un monto en centavos a moneda MXN sin decimales innecesarios.
 * @param {number} cents - Importe en centavos
 * @returns {string} Importe formateado (ej. "$3,500")
 */
export function formatMoney(cents) {
  return new Intl.NumberFormat(STUDIO_CONFIG.locale, {
    style: 'currency',
    currency: STUDIO_CONFIG.currency,
    maximumFractionDigits: 0
  }).format((cents || 0) / 100);
}

/**
 * Obtiene la fecha actual en formato ISO (YYYY-MM-DD) bajo la zona horaria America/Mexico_City.
 * @returns {string} Fecha actual YYYY-MM-DD
 */
export function getLocalToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: STUDIO_CONFIG.timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

/**
 * Formatea una cadena de fecha ISO (YYYY-MM-DD) en texto legible en español.
 * @param {string} isoDate - Fecha en formato YYYY-MM-DD
 * @returns {string} Fecha legible (ej. "15 de diciembre de 2026")
 */
export function formatPrettyDate(isoDate) {
  if (!isoDate) return '';
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString(STUDIO_CONFIG.locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

/**
 * Extrae las iniciales de hasta dos palabras del nombre del cliente.
 * @param {string} fullName - Nombre completo
 * @returns {string} Iniciales
 */
export function getClientInitials(fullName = '') {
  return fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0] || '')
    .join('')
    .toUpperCase();
}
