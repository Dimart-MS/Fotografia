
// ==============================|| CLIENTE HTTP ||============================== //

/**
 * Ejecuta peticiones HTTP hacia FastAPI.
 *
 * Admite JSON y FormData.
 * token: JWT del usuario autenticado.
 */
export async function studioRequest(path, options = {}, token = '') {
  const isFormData = options.body instanceof FormData;

  const headers = {
    ...(!isFormData && options.body != null
      ? { 'Content-Type': 'application/json' }
      : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  // El navegador debe establecer el boundary de multipart/form-data.
  if (isFormData) {
    delete headers['Content-Type'];
    delete headers['content-type'];
  }

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

  const contentType = response.headers.get('content-type') || '';

  const payload = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : await response.text().catch(() => null);

  if (!response.ok) {
    const detail = payload?.detail;

    if (Array.isArray(detail)) {
      const invalidFields = detail
        .map((item) => item.loc?.at(-1))
        .filter(Boolean)
        .join(', ');

      throw new Error(
        invalidFields
          ? `Revisa los campos: ${invalidFields}`
          : 'Los datos enviados no son válidos.'
      );
    }

    throw new Error(
      typeof detail === 'string'
        ? detail
        : 'No se pudo completar la solicitud.'
    );
  }

  return payload;
}
