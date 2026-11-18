// ==============================|| CLIENTE HTTP ||============================== //

/**
 * Ejecuta peticiones HTTP hacia FastAPI.
 *
 * token: JWT del usuario autenticado.
 * Las rutas públicas pueden llamarse sin token.
 */
export async function studioRequest(path, options = {}, token = '') {
  const headers = {
    ...(options.body != null ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  let response;

  try {
    response = await fetch(path, {
      ...options,
      headers
    });
  } catch {
    throw new Error(
      'No se pudo conectar con el servidor. Verifica que los servicios estén activos.'
    );
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const detail = payload?.detail;

    if (Array.isArray(detail)) {
      const invalidFields = detail
        .map((item) => item.loc?.at(-1))
        .filter(Boolean)
        .join(', ');

      throw new Error(`Revisa los campos: ${invalidFields}`);
    }

    throw new Error(
      typeof detail === 'string'
        ? detail
        : 'No se pudo completar la solicitud.'
    );
  }

  return payload;
}