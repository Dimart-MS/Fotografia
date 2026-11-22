
import { studioRequest } from './httpClient';

const BASE_URL = '/api/galerias';

// ==========================================
// GALERÍAS
// ==========================================

export async function fetchGalerias(accessKey) {
  return studioRequest(BASE_URL, { method: 'GET' }, accessKey);
}

export async function fetchGaleria(idGaleria, accessKey) {
  return studioRequest(`${BASE_URL}/${idGaleria}`, { method: 'GET' }, accessKey);
}

export async function createGaleria(datos, accessKey) {
  return studioRequest(BASE_URL, {
    method: 'POST',
    body: JSON.stringify(datos)
  }, accessKey);
}

export async function publicarGaleria(idGaleria, accessKey) {
  return studioRequest(`${BASE_URL}/${idGaleria}/publicar`, {
    method: 'PATCH'
  }, accessKey);
}

export async function ocultarGaleria(idGaleria, accessKey) {
  return studioRequest(`${BASE_URL}/${idGaleria}/ocultar`, {
    method: 'PATCH'
  }, accessKey);
}

// ==========================================
// FOTOGRAFÍAS
// ==========================================

export async function solicitarSubidaFotografia(idGaleria, archivo, accessKey) {
  return studioRequest(`${BASE_URL}/${idGaleria}/fotografias/solicitar-subida`, {
    method: 'POST',
    body: JSON.stringify({
      nombre_archivo: archivo.name,
      tipo_mime: archivo.type,
      tamano_bytes: archivo.size
    })
  }, accessKey);
}

export async function subirArchivoStorage(signedUrl, archivo) {
  let response;

  try {
    response = await fetch(signedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': archivo.type
      },
      body: archivo
    });
  } catch {
    throw new Error('No fue posible conectar con Supabase Storage.');
  }

  if (!response.ok) {
    throw new Error(`No se pudo subir el archivo. Error HTTP ${response.status}.`);
  }

  return true;
}

export async function confirmarSubidaFotografia(idGaleria, datos, accessKey) {
  return studioRequest(`${BASE_URL}/${idGaleria}/fotografias/confirmar-subida`, {
    method: 'POST',
    body: JSON.stringify(datos)
  }, accessKey);
}

export async function uploadFotografia(idGaleria, archivo, accessKey, orden = 0) {
  const tiposPermitidos = [
    'image/jpeg',
    'image/png',
    'image/webp'
  ];

  const maximoBytes = 50 * 1024 * 1024;

  if (!tiposPermitidos.includes(archivo.type)) {
    throw new Error('Solo se permiten imágenes JPG, PNG o WebP.');
  }

  if (archivo.size <= 0 || archivo.size > maximoBytes) {
    throw new Error('La imagen debe pesar como máximo 50 MB.');
  }

  const subida = await solicitarSubidaFotografia(
    idGaleria,
    archivo,
    accessKey
  );

  await subirArchivoStorage(subida.signed_url, archivo);

  return confirmarSubidaFotografia(idGaleria, {
    ruta_storage: subida.ruta_storage,
    nombre_archivo: archivo.name,
    tipo_mime: archivo.type,
    tamano_bytes: archivo.size,
    ancho_px: null,
    alto_px: null,
    orden
  }, accessKey);
}

export async function descargarFotografia(idGaleria, idFotografia, accessKey) {
  return studioRequest(
    `${BASE_URL}/${idGaleria}/fotografias/${idFotografia}/descarga`,
    { method: 'GET' },
    accessKey
  );
}

export async function eliminarFotografia(idGaleria, idFotografia, accessKey) {
  return studioRequest(
    `${BASE_URL}/${idGaleria}/fotografias/${idFotografia}`,
    { method: 'DELETE' },
    accessKey
  );
}

// ==========================================
// VIDEOS EXTERNOS (YOUTUBE)
// ==========================================

export async function createVideo(idGaleria, datos, accessKey) {
  return studioRequest(`${BASE_URL}/${idGaleria}/videos`, {
    method: 'POST',
    body: JSON.stringify(datos)
  }, accessKey);
}

// ==========================================
// VIDEOS MP4 - SUPABASE STORAGE
// ==========================================

export async function solicitarSubidaVideo(idGaleria, archivo, accessKey) {
  return studioRequest(`${BASE_URL}/${idGaleria}/videos/solicitar-subida`, {
    method: 'POST',
    body: JSON.stringify({
      nombre_archivo: archivo.name,
      tipo_mime: archivo.type,
      tamano_bytes: archivo.size
    })
  }, accessKey);
}

export async function confirmarSubidaVideo(idGaleria, datos, accessKey) {
  return studioRequest(`${BASE_URL}/${idGaleria}/videos/confirmar-subida`, {
    method: 'POST',
    body: JSON.stringify(datos)
  }, accessKey);
}

export async function uploadVideo(idGaleria, archivo, accessKey, orden = 0) {
  const maximoBytes = 50 * 1024 * 1024;

  if (archivo.type !== 'video/mp4') {
    throw new Error('Solo se permiten videos en formato MP4.');
  }

  if (archivo.size <= 0 || archivo.size > maximoBytes) {
    throw new Error('El video debe pesar como máximo 50 MB.');
  }

  const subida = await solicitarSubidaVideo(
    idGaleria,
    archivo,
    accessKey
  );

  if (!subida?.signed_url || !subida?.ruta_storage) {
    throw new Error('El servidor no proporcionó los datos necesarios para subir el video.');
  }

  await subirArchivoStorage(subida.signed_url, archivo);

  return confirmarSubidaVideo(idGaleria, {
    ruta_storage: subida.ruta_storage,
    nombre_archivo: archivo.name,
    tipo_mime: archivo.type,
    tamano_bytes: archivo.size,
    orden
  }, accessKey);
}

export async function descargarVideo(idGaleria, idVideo, accessKey) {
  return studioRequest(
    `${BASE_URL}/${idGaleria}/videos/${idVideo}/descarga`,
    { method: 'GET' },
    accessKey
  );
}

export async function eliminarVideo(idGaleria, idVideo, accessKey) {
  return studioRequest(
    `${BASE_URL}/${idGaleria}/videos/${idVideo}`,
    { method: 'DELETE' },
    accessKey
  );
}

// ==========================================
// ENTREGAS
// ==========================================

export async function fetchEntregas(accessKey) {
  return studioRequest(`${BASE_URL}/entregas/listado`, {
    method: 'GET'
  }, accessKey);
}

export async function createEntrega(datos, accessKey) {
  return studioRequest(`${BASE_URL}/entregas`, {
    method: 'POST',
    body: JSON.stringify(datos)
  }, accessKey);
}

export async function updateEntrega(idEntrega, datos, accessKey) {
  return studioRequest(`${BASE_URL}/entregas/${idEntrega}`, {
    method: 'PATCH',
    body: JSON.stringify(datos)
  }, accessKey);
}

export async function fetchHistorialEntrega(idEntrega, accessKey) {
  return studioRequest(`${BASE_URL}/entregas/${idEntrega}/historial`, {
    method: 'GET'
  }, accessKey);
}
