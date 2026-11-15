// ==============================|| CLIENTE HTTP CON AUTENTICACIÓN BEARER ||============================== //

/**
 * Ejecuta una petición HTTP hacia los servicios del estudio fotográfico.
 * Adjunta el token Bearer y normaliza los errores de validación de FastAPI/Pydantic.
 *
 * @param {string} path - Ruta del endpoint (ej. '/api/clientes')
 * @param {RequestInit} options - Opciones de fetch
 * @param {string} accessKey - Clave de acceso del estudio
 */
export async function studioRequest(path, options = {}, accessKey = '') {
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessKey}`,
      ...(options.headers || {})
    }
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const detail = payload?.detail;
    if (Array.isArray(detail)) {
      const invalidFields = detail.map((item) => item.loc?.at(-1)).join(', ');
      throw new Error(`Revisa los campos: ${invalidFields}`);
    }
    throw new Error(detail || 'No se pudo conectar con el estudio. Intenta de nuevo.');
  }

  return payload;
}
