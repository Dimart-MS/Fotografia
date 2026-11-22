import { studioRequest } from './httpClient';
export const fetchVentas = (token) => studioRequest('/api/ventas', { method: 'GET' }, token);
export const createVenta = (datos, token) => studioRequest('/api/ventas', { method: 'POST', body: JSON.stringify(datos) }, token);
export const confirmarVenta = (id, token) => studioRequest(`/api/ventas/${id}/confirmar`, { method: 'PATCH' }, token);
export const cancelarVenta = (id, token) => studioRequest(`/api/ventas/${id}/cancelar`, { method: 'PATCH' }, token);
export const fetchCatalogoVentas = (token) => studioRequest('/api/ventas/catalogo-paquetes', { method: 'GET' }, token);
