
import { useEffect, useMemo, useState } from 'react';

import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography
} from '@mui/material';

import useStudio from '../../hooks/useStudio';
import Icon from '../../ui-component/Icon';
import EmptyState from '../../ui-component/EmptyState';

import {
  fetchGalerias,
  fetchGaleria,
  createGaleria,
  publicarGaleria,
  ocultarGaleria,
  uploadFotografia,
  descargarFotografia,
  eliminarFotografia,
  createVideo,
  uploadVideo,
  descargarVideo,
  eliminarVideo
} from '../../api/galeriasService';

const FORMULARIO_VACIO = {
  id_reservacion: '',
  titulo: '',
  descripcion: ''
};

const VIDEO_VACIO = {
  titulo: '',
  url_externa: ''
};

function normalizarGaleria(item) {
  return {
    ...item,
    id: item.id_galeria ?? item.id,
    reservacion: item.id_reservacion ?? '',
    titulo: item.titulo ?? item.nombre ?? 'Galería sin título',
    descripcion: item.descripcion ?? '',
    publicada: item.publicada ?? false
  };
}

function obtenerLista(respuesta) {
  if (Array.isArray(respuesta)) return respuesta;
  if (Array.isArray(respuesta?.galerias)) return respuesta.galerias;
  if (Array.isArray(respuesta?.items)) return respuesta.items;
  return [];
}

function obtenerYoutubeEmbed(url) {
  try {
    const direccion = new URL(url);
    let id = '';

    if (direccion.hostname.includes('youtu.be')) {
      id = direccion.pathname.slice(1);
    } else if (direccion.hostname.includes('youtube.com')) {
      id = direccion.searchParams.get('v') || '';

      if (!id && direccion.pathname.startsWith('/embed/')) {
        id = direccion.pathname.split('/')[2] || '';
      }
    }

    return id ? `https://www.youtube.com/embed/${id}` : '';
  } catch {
    return '';
  }
}

export default function GaleriasView() {
  const { accessKey, setToast } = useStudio();

  const [galerias, setGalerias] = useState([]);
  const [galeriaSeleccionada, setGaleriaSeleccionada] = useState(null);

  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState('');

  const [dialogoAbierto, setDialogoAbierto] = useState(false);
  const [dialogoVideo, setDialogoVideo] = useState(false);

  const [formulario, setFormulario] = useState(FORMULARIO_VACIO);
  const [video, setVideo] = useState(VIDEO_VACIO);
  const [archivoVideo, setArchivoVideo] = useState(null);

  // Cargar galerías
  const cargarGalerias = async () => {
    setCargando(true);
    setError('');

    try {
      const respuesta = await fetchGalerias(accessKey);
      setGalerias(obtenerLista(respuesta).map(normalizarGaleria));
    } catch (err) {
      setError(err.message || 'No se pudieron cargar las galerías.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarGalerias();
  }, [accessKey]);

  const galeriasFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return galerias.filter((galeria) =>
      `${galeria.titulo} ${galeria.descripcion} ${galeria.reservacion}`
        .toLowerCase()
        .includes(texto)
    );
  }, [galerias, busqueda]);

  const publicadas = galerias.filter((g) => g.publicada).length;

  // Crear galería
  const abrirNueva = () => {
    setFormulario(FORMULARIO_VACIO);
    setError('');
    setDialogoAbierto(true);
  };

  const cerrarDialogo = () => {
    if (!guardando) {
      setDialogoAbierto(false);
      setError('');
    }
  };

  const cambiarCampo = (campo, valor) => {
    setFormulario((actual) => ({
      ...actual,
      [campo]: valor
    }));
  };

  const guardarGaleria = async (event) => {
    event.preventDefault();
    setError('');

    const idReservacion = Number(formulario.id_reservacion);
    const titulo = formulario.titulo.trim();

    if (!Number.isInteger(idReservacion) || idReservacion <= 0) {
      setError('Ingresa un ID de reservación válido.');
      return;
    }

    if (titulo.length < 3) {
      setError('El título debe tener al menos 3 caracteres.');
      return;
    }

    setGuardando(true);

    try {
      await createGaleria({
        id_reservacion: idReservacion,
        titulo,
        descripcion: formulario.descripcion.trim() || null
      }, accessKey);

      setToast('Galería registrada correctamente.');
      setDialogoAbierto(false);
      setFormulario(FORMULARIO_VACIO);
      await cargarGalerias();
    } catch (err) {
      setError(err.message || 'No se pudo registrar la galería.');
    } finally {
      setGuardando(false);
    }
  };

  // Abrir detalle de galería y preparar enlaces de reproducción
  const abrirDetalle = async (galeria) => {
    setError('');

    try {
      const respuesta = await fetchGaleria(galeria.id, accessKey);
      const datos = respuesta?.galeria
        ? respuesta
        : { galeria: respuesta };

      const videosOriginales = datos.videos || [];

      const videos = await Promise.all(
        videosOriginales.map(async (item) => {
          if (item.proveedor !== 'Supabase') return item;

          try {
            const descarga = await descargarVideo(
              galeria.id,
              item.id_video,
              accessKey
            );

            return {
              ...item,
              url_temporal: descarga?.url || ''
            };
          } catch {
            return {
              ...item,
              url_temporal: ''
            };
          }
        })
      );

      setGaleriaSeleccionada({
        ...normalizarGaleria(datos.galeria || galeria),
        fotografias: datos.fotografias || [],
        videos
      });
    } catch (err) {
      setError(err.message || 'No se pudo consultar la galería.');
    }
  };

  // Publicar u ocultar galería
  const actualizarEstado = async (galeria) => {
    const accion = galeria.publicada ? ocultarGaleria : publicarGaleria;

    const mensaje = galeria.publicada
      ? '¿Deseas ocultar esta galería?'
      : '¿Deseas publicar esta galería?';

    if (!window.confirm(mensaje)) return;

    try {
      await accion(galeria.id, accessKey);

      setToast(
        galeria.publicada
          ? 'Galería ocultada correctamente.'
          : 'Galería publicada correctamente.'
      );

      await cargarGalerias();

      if (galeriaSeleccionada?.id === galeria.id) {
        await abrirDetalle({
          ...galeria,
          publicada: !galeria.publicada
        });
      }
    } catch (err) {
      setError(err.message || 'No se pudo cambiar el estado de la galería.');
    }
  };

  // Subir fotografías
  const seleccionarFotografias = async (event) => {
    const archivos = Array.from(event.target.files || []);
    event.target.value = '';

    if (!archivos.length || !galeriaSeleccionada) return;

    setSubiendo(true);
    setError('');

    try {
      for (const archivo of archivos) {
        await uploadFotografia(
          galeriaSeleccionada.id,
          archivo,
          accessKey
        );
      }

      setToast(
        archivos.length === 1
          ? 'Fotografía subida correctamente.'
          : 'Fotografías subidas correctamente.'
      );

      await abrirDetalle(galeriaSeleccionada);
    } catch (err) {
      setError(err.message || 'No se pudieron subir las fotografías.');
    } finally {
      setSubiendo(false);
    }
  };

  // Descargar fotografía
  const descargar = async (fotografia) => {
    try {
      setError('');

      const respuesta = await descargarFotografia(
        galeriaSeleccionada.id,
        fotografia.id_fotografia,
        accessKey
      );

      if (!respuesta?.url) {
        throw new Error('No se recibió el enlace de descarga.');
      }

      const archivo = await fetch(respuesta.url);

      if (!archivo.ok) {
        throw new Error('No se pudo obtener el archivo de Supabase.');
      }

      const blob = await archivo.blob();
      const urlTemporal = URL.createObjectURL(blob);

      const enlace = document.createElement('a');
      enlace.href = urlTemporal;
      enlace.download = fotografia.nombre_archivo || 'fotografia.jpg';

      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();

      URL.revokeObjectURL(urlTemporal);

      setToast('Descarga iniciada correctamente.');
    } catch (err) {
      setError(err.message || 'No se pudo descargar la fotografía.');
    }
  };

  // Eliminar fotografía
  const eliminarFoto = async (fotografia) => {
    const confirmar = window.confirm(
      `¿Deseas eliminar la fotografía "${fotografia.nombre_archivo}"? Esta acción no se puede deshacer.`
    );

    if (!confirmar) return;

    try {
      setSubiendo(true);
      setError('');

      await eliminarFotografia(
        galeriaSeleccionada.id,
        fotografia.id_fotografia,
        accessKey
      );

      setToast('Fotografía eliminada correctamente.');
      await abrirDetalle(galeriaSeleccionada);
    } catch (err) {
      setError(err.message || 'No se pudo eliminar la fotografía.');
    } finally {
      setSubiendo(false);
    }
  };

  // Eliminar video
  const eliminarVideoGaleria = async (item) => {
    const confirmar = window.confirm(
      `¿Deseas eliminar el video "${item.titulo}"? Esta acción no se puede deshacer.`
    );

    if (!confirmar) return;

    try {
      setSubiendo(true);
      setError('');

      await eliminarVideo(
        galeriaSeleccionada.id,
        item.id_video,
        accessKey
      );

      setToast('Video eliminado correctamente.');
      await abrirDetalle(galeriaSeleccionada);
    } catch (err) {
      setError(err.message || 'No se pudo eliminar el video.');
    } finally {
      setSubiendo(false);
    }
  };

  // Abrir formulario para agregar video
  const abrirDialogoVideo = () => {
    setVideo(VIDEO_VACIO);
    setArchivoVideo(null);
    setError('');
    setDialogoVideo(true);
  };

  const cerrarDialogoVideo = () => {
    if (!guardando && !subiendo) {
      setDialogoVideo(false);
      setArchivoVideo(null);
      setError('');
    }
  };

  // Agregar video de YouTube
  const guardarVideoYoutube = async (event) => {
    event.preventDefault();
    setError('');

    if (video.titulo.trim().length < 3 || !video.url_externa.trim()) {
      setError('Completa el título y la dirección del video.');
      return;
    }

    if (!obtenerYoutubeEmbed(video.url_externa.trim())) {
      setError('Ingresa una URL válida de YouTube.');
      return;
    }

    setGuardando(true);

    try {
      await createVideo(galeriaSeleccionada.id, {
        titulo: video.titulo.trim(),
        url_externa: video.url_externa.trim(),
        proveedor: 'YouTube',
        orden: galeriaSeleccionada.videos.length
      }, accessKey);

      setToast('Video de YouTube agregado correctamente.');
      setDialogoVideo(false);
      setVideo(VIDEO_VACIO);
      await abrirDetalle(galeriaSeleccionada);
    } catch (err) {
      setError(err.message || 'No se pudo agregar el video.');
    } finally {
      setGuardando(false);
    }
  };

  // Subir video MP4 desde el dispositivo
  const subirVideoMp4 = async () => {
    setError('');

    if (!archivoVideo) {
      setError('Selecciona un archivo MP4 de tu computadora.');
      return;
    }

    if (video.titulo.trim().length < 3) {
      setError('El título del video debe tener al menos 3 caracteres.');
      return;
    }

    setSubiendo(true);

    try {
      await uploadVideo(
        galeriaSeleccionada.id,
        archivoVideo,
        accessKey,
        galeriaSeleccionada.videos.length
      );

      setToast('Video MP4 subido correctamente.');
      setDialogoVideo(false);
      setArchivoVideo(null);
      setVideo(VIDEO_VACIO);

      await abrirDetalle(galeriaSeleccionada);
    } catch (err) {
      setError(err.message || 'No se pudo subir el video MP4.');
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <>
      <section className="panel">
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', md: 'center' }}
          spacing={2}
          sx={{ mb: 3 }}
        >
          <Box>
            <Typography
              variant="h5"
              sx={{ color: '#343B32', fontFamily: 'Georgia, serif' }}
            >
              Galerías y fotografías
            </Typography>

            <Typography variant="body2" color="text.secondary">
              Organiza y administra el material fotográfico y audiovisual de los eventos.
            </Typography>
          </Box>

          <Button
            variant="contained"
            startIcon={<Icon name="plus" />}
            onClick={abrirNueva}
            sx={{
              bgcolor: '#68745B',
              '&:hover': { bgcolor: '#59634B' }
            }}
          >
            Nueva galería
          </Button>
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
          <Box sx={{ flex: 1, p: 2, borderRadius: 2, bgcolor: '#F8F6F0' }}>
            <Typography variant="caption" color="text.secondary">
              Total de galerías
            </Typography>
            <Typography variant="h5" sx={{ color: '#343B32' }}>
              {galerias.length}
            </Typography>
          </Box>

          <Box sx={{ flex: 1, p: 2, borderRadius: 2, bgcolor: '#EEF0E9' }}>
            <Typography variant="caption" color="text.secondary">
              Galerías publicadas
            </Typography>
            <Typography variant="h5" sx={{ color: '#68745B' }}>
              {publicadas}
            </Typography>
          </Box>

          <Box sx={{ flex: 1, p: 2, borderRadius: 2, bgcolor: '#F8F6F0' }}>
            <Typography variant="caption" color="text.secondary">
              Fotografías registradas
            </Typography>
            <Typography variant="h5" sx={{ color: '#343B32' }}>
              {galerias.reduce(
                (total, g) => total + Number(g.total_fotografias || 0), 0
              )}
            </Typography>
          </Box>
        </Stack>

        <TextField
          fullWidth
          size="small"
          placeholder="Buscar galería por título, descripción o reservación..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          sx={{ mb: 3 }}
        />

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {cargando ? (
          <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
            Cargando galerías...
          </Typography>
        ) : galeriasFiltradas.length === 0 ? (
          <EmptyState
            icon="image"
            title="No hay galerías para mostrar"
            description={
              busqueda
                ? 'Prueba con otro término de búsqueda.'
                : 'Registra la primera galería del estudio.'
            }
            actionLabel={!busqueda ? 'Crear galería' : undefined}
            onAction={!busqueda ? abrirNueva : undefined}
          />
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Box sx={{ minWidth: 750 }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr 1.2fr',
                  gap: 2,
                  p: 1.5,
                  bgcolor: '#F8F6F0',
                  borderRadius: 2,
                  mb: 1
                }}
              >
                {['Galería', 'Reservación', 'Estado', 'Acciones'].map((t) => (
                  <Typography
                    key={t}
                    variant="caption"
                    fontWeight={700}
                    color="#68745B"
                  >
                    {t}
                  </Typography>
                ))}
              </Box>

              {galeriasFiltradas.map((galeria) => (
                <Box
                  key={galeria.id}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 1fr 1.2fr',
                    gap: 2,
                    alignItems: 'center',
                    p: 1.5,
                    borderBottom: '1px solid #EAE8E0'
                  }}
                >
                  <Box>
                    <Typography fontWeight={600} color="#343B32">
                      {galeria.titulo}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {galeria.descripcion || 'Sin descripción'}
                    </Typography>
                  </Box>

                  <Typography variant="body2">
                    #{galeria.reservacion || '—'}
                  </Typography>

                  <Chip
                    size="small"
                    label={galeria.publicada ? 'Publicada' : 'Oculta'}
                    color={galeria.publicada ? 'success' : 'default'}
                    variant="outlined"
                  />

                  <Stack direction="row" spacing={0.5}>
                    <IconButton
                      size="small"
                      title="Ver galería"
                      onClick={() => abrirDetalle(galeria)}
                    >
                      <Icon name="eye" />
                    </IconButton>

                    <IconButton
                      size="small"
                      title={galeria.publicada ? 'Ocultar' : 'Publicar'}
                      onClick={() => actualizarEstado(galeria)}
                      color={galeria.publicada ? 'warning' : 'success'}
                    >
                      <Icon name={galeria.publicada ? 'eye-off' : 'globe'} />
                    </IconButton>
                  </Stack>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </section>

      {/* DIÁLOGO PARA CREAR GALERÍA */}
      <Dialog
        open={dialogoAbierto}
        onClose={cerrarDialogo}
        fullWidth
        maxWidth="sm"
      >
        <Box component="form" onSubmit={guardarGaleria}>
          <DialogTitle sx={{ color: '#343B32', fontFamily: 'Georgia, serif' }}>
            Registrar nueva galería
          </DialogTitle>

          <DialogContent>
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              {error && <Alert severity="error">{error}</Alert>}

              <TextField
                label="ID de reservación"
                type="number"
                value={formulario.id_reservacion}
                onChange={(e) => cambiarCampo('id_reservacion', e.target.value)}
                required
                inputProps={{ min: 1 }}
                helperText="Ingresa el número de la reservación relacionada con el evento."
              />

              <TextField
                label="Título de la galería"
                value={formulario.titulo}
                onChange={(e) => cambiarCampo('titulo', e.target.value)}
                inputProps={{ maxLength: 150 }}
                required
              />

              <TextField
                label="Descripción"
                value={formulario.descripcion}
                onChange={(e) => cambiarCampo('descripcion', e.target.value)}
                multiline
                minRows={3}
                inputProps={{ maxLength: 500 }}
              />
            </Stack>
          </DialogContent>

          <DialogActions sx={{ p: 3 }}>
            <Button onClick={cerrarDialogo} disabled={guardando}>
              Cancelar
            </Button>

            <Button
              type="submit"
              variant="contained"
              disabled={guardando}
              sx={{
                bgcolor: '#68745B',
                '&:hover': { bgcolor: '#59634B' }
              }}
            >
              {guardando ? 'Guardando...' : 'Guardar galería'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* DETALLE DE GALERÍA */}
      <Dialog
        open={Boolean(galeriaSeleccionada)}
        onClose={() => !subiendo && setGaleriaSeleccionada(null)}
        fullWidth
        maxWidth="md"
      >
        {galeriaSeleccionada && (
          <>
            <DialogTitle sx={{ color: '#343B32', fontFamily: 'Georgia, serif' }}>
              {galeriaSeleccionada.titulo}
              <Typography variant="body2" color="text.secondary">
                Reservación #{galeriaSeleccionada.reservacion || galeriaSeleccionada.id_reservacion}
              </Typography>
            </DialogTitle>

            <DialogContent>
              <Stack spacing={3} sx={{ pt: 1 }}>
                {error && <Alert severity="error">{error}</Alert>}

                <Typography variant="body2" color="text.secondary">
                  {galeriaSeleccionada.descripcion || 'Sin descripción.'}
                </Typography>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <Button
                    component="label"
                    variant="contained"
                    disabled={subiendo}
                    startIcon={<Icon name="upload" />}
                    sx={{
                      bgcolor: '#68745B',
                      '&:hover': { bgcolor: '#59634B' }
                    }}
                  >
                    {subiendo ? 'Subiendo...' : 'Subir fotografías'}
                    <input
                      hidden
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      onChange={seleccionarFotografias}
                    />
                  </Button>

                  <Button
                    variant="outlined"
                    startIcon={<Icon name="video" />}
                    onClick={abrirDialogoVideo}
                    disabled={subiendo}
                  >
                    Agregar video
                  </Button>
                </Stack>

                {/* FOTOGRAFÍAS */}
                <Box>
                  <Typography variant="h6" sx={{ color: '#343B32', mb: 1 }}>
                    Fotografías ({galeriaSeleccionada.fotografias.length})
                  </Typography>

                  {galeriaSeleccionada.fotografias.length === 0 ? (
                    <Typography color="text.secondary" variant="body2">
                      Todavía no hay fotografías en esta galería.
                    </Typography>
                  ) : (
                    <Stack spacing={1}>
                      {galeriaSeleccionada.fotografias.map((foto) => (
                        <Box
                          key={foto.id_fotografia}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 2,
                            p: 1.5,
                            bgcolor: '#F8F6F0',
                            borderRadius: 2
                          }}
                        >
                          <Box sx={{ minWidth: 0 }}>
                            <Typography fontWeight={600} noWrap>
                              {foto.nombre_archivo}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {Math.round(Number(foto.tamano_bytes || 0) / 1024)} KB
                            </Typography>
                          </Box>

                          <Stack direction="row" spacing={1}>
                            <IconButton
                              title="Descargar fotografía"
                              onClick={() => descargar(foto)}
                              disabled={subiendo}
                            >
                              <Icon name="download" />
                            </IconButton>

                            <IconButton
                              title="Eliminar fotografía"
                              color="error"
                              onClick={() => eliminarFoto(foto)}
                              disabled={subiendo}
                            >
                              <Icon name="trash-2" />
                            </IconButton>
                          </Stack>
                        </Box>
                      ))}
                    </Stack>
                  )}
                </Box>

                {/* VIDEOS */}
                <Box>
                  <Typography variant="h6" sx={{ color: '#343B32', mb: 1 }}>
                    Videos ({galeriaSeleccionada.videos.length})
                  </Typography>

                  {galeriaSeleccionada.videos.length === 0 ? (
                    <Typography color="text.secondary" variant="body2">
                      Todavía no hay videos registrados.
                    </Typography>
                  ) : (
                    <Stack spacing={2}>
                      {galeriaSeleccionada.videos.map((item) => {
                        const esSupabase = item.proveedor === 'Supabase';
                        const urlYoutube = !esSupabase
                          ? obtenerYoutubeEmbed(item.url_externa || '')
                          : '';

                        return (
                          <Box
                            key={item.id_video}
                            sx={{
                              p: 1.5,
                              bgcolor: '#F8F6F0',
                              borderRadius: 2
                            }}
                          >
                            <Stack
  direction="row"
  justifyContent="space-between"
  alignItems="center"
  spacing={1}
  sx={{ mb: 1 }}
>
  <Typography fontWeight={600}>
    {item.titulo}
  </Typography>

  <IconButton
    title="Eliminar video"
    color="error"
    onClick={() => eliminarVideoGaleria(item)}
    disabled={subiendo}
  >
    <Icon name="trash-2" />
  </IconButton>
</Stack>

                            {esSupabase ? (
                              item.url_temporal ? (
                                <Box
                                  component="video"
                                  controls
                                  preload="metadata"
                                  src={item.url_temporal}
                                  sx={{
                                    width: '100%',
                                    maxHeight: 420,
                                    borderRadius: 2,
                                    bgcolor: '#000'
                                  }}
                                />
                              ) : (
                                <Alert severity="warning">
                                  No se pudo generar el enlace temporal para reproducir este video.
                                  Vuelve a abrir la galería e inténtalo nuevamente.
                                </Alert>
                              )
                            ) : urlYoutube ? (
                              <Box
                                sx={{
                                  position: 'relative',
                                  width: '100%',
                                  paddingTop: '56.25%',
                                  overflow: 'hidden',
                                  borderRadius: 2,
                                  bgcolor: '#000'
                                }}
                              >
                                <Box
                                  component="iframe"
                                  src={urlYoutube}
                                  title={item.titulo}
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                  allowFullScreen
                                  sx={{
                                    position: 'absolute',
                                    inset: 0,
                                    width: '100%',
                                    height: '100%',
                                    border: 0
                                  }}
                                />
                              </Box>
                            ) : (
                              <Typography
                                component="a"
                                href={item.url_externa}
                                target="_blank"
                                rel="noopener noreferrer"
                                variant="body2"
                                sx={{ color: '#68745B', overflowWrap: 'anywhere' }}
                              >
                                Ver video externo
                              </Typography>
                            )}
                          </Box>
                        );
                      })}
                    </Stack>
                  )}
                </Box>
              </Stack>
            </DialogContent>

            <DialogActions sx={{ p: 3 }}>
              <Button
                onClick={() => setGaleriaSeleccionada(null)}
                disabled={subiendo}
              >
                Cerrar
              </Button>

              <Button
                variant="contained"
                onClick={() => actualizarEstado(galeriaSeleccionada)}
                sx={{
                  bgcolor: '#68745B',
                  '&:hover': { bgcolor: '#59634B' }
                }}
              >
                {galeriaSeleccionada.publicada ? 'Ocultar galería' : 'Publicar galería'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* DIÁLOGO PARA AGREGAR VIDEO */}
      <Dialog
        open={dialogoVideo}
        onClose={cerrarDialogoVideo}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ color: '#343B32', fontFamily: 'Georgia, serif' }}>
          Agregar video a la galería
        </DialogTitle>

        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}

            <TextField
              label="Título del video"
              value={video.titulo}
              onChange={(e) => setVideo({ ...video, titulo: e.target.value })}
              inputProps={{ maxLength: 150 }}
              required
            />

            <Box sx={{ p: 2, border: '1px solid #EAE8E0', borderRadius: 2 }}>
              <Typography fontWeight={600} sx={{ mb: 1, color: '#343B32' }}>
                Subir un video MP4 desde mi dispositivo
              </Typography>

              <Button
                component="label"
                variant="outlined"
                startIcon={<Icon name="upload" />}
                disabled={subiendo || guardando}
              >
                Seleccionar video MP4
                <input
                  hidden
                  type="file"
                  accept="video/mp4,.mp4"
                  onChange={(e) => setArchivoVideo(e.target.files?.[0] || null)}
                />
              </Button>

              {archivoVideo && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>
                    {archivoVideo.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {(archivoVideo.size / (1024 * 1024)).toFixed(2)} MB
                  </Typography>
                </Box>
              )}

              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
                sx={{ mt: 1 }}
              >
                Formato permitido: MP4. Tamaño máximo: 50 MB.
              </Typography>

              <Button
                fullWidth
                variant="contained"
                onClick={subirVideoMp4}
                disabled={
                  subiendo ||
                  guardando ||
                  !archivoVideo ||
                  video.titulo.trim().length < 3
                }
                sx={{
                  mt: 2,
                  bgcolor: '#68745B',
                  '&:hover': { bgcolor: '#59634B' }
                }}
              >
                {subiendo ? 'Subiendo video...' : 'Subir video MP4'}
              </Button>
            </Box>

            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                O bien, agrega un enlace de YouTube
              </Typography>
            </Box>

            <TextField
              label="URL de YouTube"
              placeholder="https://www.youtube.com/watch?v=..."
              value={video.url_externa}
              onChange={(e) => setVideo({ ...video, url_externa: e.target.value })}
              helperText="Pega el enlace del video de YouTube."
            />

            <Button
              variant="outlined"
              onClick={guardarVideoYoutube}
              disabled={
                subiendo ||
                guardando ||
                video.titulo.trim().length < 3 ||
                !video.url_externa.trim()
              }
            >
              {guardando ? 'Guardando...' : 'Agregar enlace de YouTube'}
            </Button>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 3 }}>
          <Button onClick={cerrarDialogoVideo} disabled={subiendo || guardando}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
