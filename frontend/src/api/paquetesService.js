import { studioRequest } from './httpClient';

// Obtener todos los paquetes, incluidos los inactivos.
export async function fetchPaquetesAdministracion(accessKey) {
  return studioRequest(
    '/api/paquetes/administracion',
    { method: 'GET' },
    accessKey
  );
}

// Registrar paquete.
export async function createPaquete(datos, accessKey) {
  return studioRequest(
    '/api/paquetes',
    {
      method: 'POST',
      body: JSON.stringify(datos)
    },
    accessKey
  );
}

// Actualizar paquete.
export async function updatePaquete(clave, datos, accessKey) {
  return studioRequest(
    `/api/paquetes/${encodeURIComponent(clave)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(datos)
    },
    accessKey
  );
}

// Desactivar paquete.
export async function inactivarPaquete(clave, accessKey) {
  return studioRequest(
    `/api/paquetes/${encodeURIComponent(clave)}/inactivar`,
    { method: 'PATCH' },
    accessKey
  );
}

// Reactivar paquete.
export async function reactivarPaquete(clave, accessKey) {
  return studioRequest(
    `/api/paquetes/${encodeURIComponent(clave)}/reactivar`,
    { method: 'PATCH' },
    accessKey
  );
}
