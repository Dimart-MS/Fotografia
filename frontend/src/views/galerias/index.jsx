
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
  MenuItem,
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

import { fetchReservas } from '../../api/reservasService';
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

function obtenerListaReservas(respuesta) {
  if (Array.isArray(respuesta)) return respuesta;
  if (Array.isArray(respuesta?.reservas)) return respuesta.reservas;
  if (Array.isArray(respuesta?.reservaciones)) return respuesta.reservaciones;
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
  const [reservacionesDisponibles, setReservacionesDisponibles] = useState([]);
  const [cargandoReservaciones, setCargandoReservaciones] = useState(false);
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
  const abrirNueva = async () => {
    setFormulario(FORMULARIO_VACIO);
    setError('');
    setCargandoReservaciones(true);
    setDialogoAbierto(true);

    try {
      const respuesta = await fetchReservas(accessKey);
      const reservas = obtenerListaReservas(respuesta);

      // Reservaciones que ya tienen una galería registrada.
      const idsConGaleria = galerias.map(
        (galeria) => Number(galeria.reservacion)
      );

      // Mostrar únicamente reservaciones confirmadas o finalizadas
      // que todavía no tengan una galería.
      const disponibles = reservas.filter((reserva) => {
        const id = Number(reserva.id ?? reserva.id_reservacion);
        const estado = String(reserva.status ?? '').trim().toLowerCase();

        const estadoValido = [
          'confirmada',
          'realizada',
          'entregada'
        ].includes(estado);

        return (
          Number.isInteger(id) &&
          id > 0 &&
          estadoValido &&
          !idsConGaleria.includes(id)
        );
      });

      setReservacionesDisponibles(disponibles);
    } catch (err) {
      setError(err.message || 'No se pudieron cargar las reservaciones.');
    } finally {
      setCargandoReservaciones(false);
    }
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
      <Box sx={{ py: 1 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3 }}>
          {[
            { titulo: 'Total de galerías', valor: galerias.length, icono: 'image' },
            { titulo: 'Galerías publicadas', valor: publicadas, icono: 'globe' },
            {
              titulo: 'Fotografías registradas',
              valor: galerias.reduce((total, g) => total + Number(g.total_fotografias || 0), 0),
              icono: 'image'
            }
          ].map((tarjeta) => (
            <Box
              key={tarjeta.titulo}
              sx={{
                flex: 1,
                minWidth: 0,
                p: 3,
                bgcolor: '#FFFFFF',
                border: '1px solid #E2E5DD',
                borderRadius: '26px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 2
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ color: '#72796D', fontSize: 13, fontWeight: 600, mb: 1.5 }}>
                  {tarjeta.titulo}
                </Typography>
                <Typography
                  sx={{
                    color: '#254C41',
                    fontFamily: 'Georgia, serif',
                    fontSize: { xs: 30, md: 36 },
                    fontWeight: 600,
                    lineHeight: 1.15,
                    fontVariantNumeric: 'tabular-nums'
                  }}
                >
                  {tarjeta.valor}
                </Typography>
              </Box>
              <Box
                sx={{
                  flexShrink: 0,
                  width: 48,
                  height: 48,
                  borderRadius: '14px',
                  bgcolor: '#E9EDE4',
                  color: '#68745B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Icon name={tarjeta.icono} />
              </Box>
            </Box>
          ))}
        </Stack>

        <Box
          sx={{
            p: { xs: 2, md: 3 },
            bgcolor: '#FFFFFF',
            border: '1px solid #E2E5DD',
            borderRadius: '26px'
          }}
        >
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'stretch', sm: 'center' }}
            spacing={2}
            sx={{ mb: 3 }}
          >
            <Box>
              <Typography variant="h5" sx={{ color: '#343B32', fontFamily: 'Georgia, serif' }}>
                Galerías registradas
              </Typography>
              <Typography variant="body2" sx={{ color: '#72796D', mt: 0.5 }}>
                {galeriasFiltradas.length} de {galerias.length} galerías
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<Icon name="plus" />}
              onClick={abrirNueva}
              sx={{
                bgcolor: '#68745B',
                borderRadius: '12px',
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': { bgcolor: '#59634B' }
              }}
            >
              Nueva galería
            </Button>
          </Stack>

          <TextField
            fullWidth
            size="small"
            placeholder="Buscar galería por título, descripción o reservación..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            sx={{
              mb: 3,
              '& .MuiOutlinedInput-root': {
                minHeight: 46,
                borderRadius: '12px',
                bgcolor: '#FFFFFF',
                '& fieldset': { borderColor: '#DCE2D8' },
                '&:hover fieldset': { borderColor: '#AAB8A1' },
                '&.Mui-focused fieldset': { borderColor: '#254C41', borderWidth: '1px' },
                '& input': {
                  border: 'none !important',
                  outline: 'none !important',
                  boxShadow: 'none !important',
                  background: 'transparent !important'
                }
              }
            }}
            InputProps={{
              startAdornment: (
                <Box sx={{ display: 'flex', color: '#72796D', mr: 1 }}>
                  <Icon name="search" />
                </Box>
              )
            }}
          />

          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
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
            <Box sx={{ overflowX: 'auto', border: '1px solid #E2E5DD', borderRadius: '14px' }}>
              <Box sx={{ minWidth: 820 }}>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(190px, 2fr) minmax(110px, 1fr) minmax(105px, 1fr) minmax(240px, 1.6fr)',
                    gap: 2,
                    px: 2,
                    py: 2,
                    bgcolor: '#F5F6F2',
                    borderBottom: '1px solid #E2E5DD'
                  }}
                >
                  {['GALERÍA', 'RESERVACIÓN', 'ESTADO', 'ACCIONES'].map((t) => (
                    <Typography key={t} sx={{ fontSize: 12, fontWeight: 700, color: '#68745B' }}>
                      {t}
                    </Typography>
                  ))}
                </Box>

                {galeriasFiltradas.map((galeria) => (
                  <Box
                    key={galeria.id}
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(190px, 2fr) minmax(110px, 1fr) minmax(105px, 1fr) minmax(240px, 1.6fr)',
                      gap: 2,
                      alignItems: 'center',
                      px: 2,
                      py: 2,
                      borderBottom: '1px solid #EAE8E0',
                      '&:last-child': { borderBottom: 0 },
                      '&:hover': { bgcolor: '#FAFBF8' }
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography fontWeight={600} color="#343B32">
                        {galeria.titulo}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#72796D' }}>
                        {galeria.descripcion || 'Sin descripción'}
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ color: '#343B32' }}>
                      #{galeria.reservacion || '—'}
                    </Typography>
                    <Box>
                      <Chip
                        size="small"
                        label={galeria.publicada ? 'Publicada' : 'Oculta'}
                        sx={{
                          bgcolor: galeria.publicada ? '#E8F0E2' : '#F1F1ED',
                          color: galeria.publicada ? '#3B5C30' : '#72796D',
                          fontWeight: 700,
                          borderRadius: '8px'
                        }}
                      />
                    </Box>
                    <Stack direction="row" spacing={1.2} alignItems="center">
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => abrirDetalle(galeria)}
                        sx={{
                          bgcolor: '#254C40',
                          color: '#FFFFFF',
                          borderRadius: '10px',
                          textTransform: 'none',
                          fontWeight: 600,
                          fontSize: 13,
                          px: 2.5,
                          py: 1,
                          boxShadow: 'none',
                          whiteSpace: 'nowrap',
                          '&:hover': {
                            bgcolor: '#1D3D33',
                            boxShadow: 'none'
                          }
                        }}
                      >
                        Ver galería
                      </Button>

                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => actualizarEstado(galeria)}
                        sx={{
                          color: '#254C40',
                          borderColor: '#A9BCA8',
                          borderRadius: '10px',
                          textTransform: 'none',
                          fontWeight: 600,
                          fontSize: 13,
                          px: 2.5,
                          py: 1,
                          whiteSpace: 'nowrap',
                          '&:hover': {
                            bgcolor: '#F2F6F1',
                            borderColor: '#254C40'
                          }
                        }}
                      >
                        {galeria.publicada ? 'Ocultar' : 'Publicar'}
                      </Button>
                    </Stack>
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </Box>
      </Box>

      {/* DIÁLOGO PARA CREAR GALERÍA */}
      <Dialog
        open={dialogoAbierto}
        onClose={cerrarDialogo}
        fullWidth
        maxWidth="sm"
        slotProps={{ paper: { sx: { borderRadius: '24px' } } }}
      >
        <Box component="form" onSubmit={guardarGaleria}>
          <DialogTitle sx={{ px: 3, pt: 3, pb: 1 }}>
            <Typography variant="overline" sx={{ color: '#68745B', fontWeight: 700, letterSpacing: 2 }}>
              LUZ &amp; MEMORIA
            </Typography>
            <Typography sx={{ color: '#343B32', fontFamily: 'Georgia, serif', fontSize: 26, fontWeight: 600 }}>
              Registrar nueva galería
            </Typography>
            <Typography variant="body2" sx={{ color: '#72796D', mt: 0.5 }}>
              Asocia el material fotográfico y audiovisual a una reservación.
            </Typography>
          </DialogTitle>

          <DialogContent sx={{ px: 3, pt: '16px !important' }}>
            <Stack spacing={2.5} sx={{ pt: 1, '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}>
              {error && <Alert severity="error">{error}</Alert>}

              <TextField
                select
                fullWidth
                label="Seleccionar reservación"
                value={formulario.id_reservacion}
                onChange={(e) =>
                  cambiarCampo('id_reservacion', e.target.value)
                }
                required
                disabled={
                  cargandoReservaciones ||
                  reservacionesDisponibles.length === 0
                }
                helperText={
                  cargandoReservaciones
                    ? 'Cargando reservaciones...'
                    : reservacionesDisponibles.length === 0
                      ? 'No hay reservaciones disponibles para crear una galería.'
                      : 'Selecciona el evento al que pertenecerá esta galería.'
                }
              >
                {reservacionesDisponibles.map((reserva) => (
                  <MenuItem
                    key={reserva.id ?? reserva.id_reservacion}
                    value={String(reserva.id ?? reserva.id_reservacion)}
                  >
                    {`#${reserva.id ?? reserva.id_reservacion} - ${reserva.client_name} - ${reserva.event_type} - ${reserva.event_date?.slice(0, 10)}`}
                  </MenuItem>
                ))}
              </TextField>

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

          <DialogActions sx={{ px: 3, py: 2.5, borderTop: '1px solid #E2E5DD' }}>
            <Button onClick={cerrarDialogo} disabled={guardando} sx={{ textTransform: 'none', color: '#68745B' }}>
              Cancelar
            </Button>

            <Button
              type="submit"
              variant="contained"
              disabled={
                guardando ||
                cargandoReservaciones ||
                reservacionesDisponibles.length === 0
              }
              sx={{
                borderRadius: '12px',
                textTransform: 'none',
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
        PaperProps={{
          sx: {
            borderRadius: '22px',
            bgcolor: '#FFFEFB',
            border: '1px solid #E4E8DE',
            boxShadow: '0 20px 60px rgba(35, 52, 40, 0.12)',
            overflow: 'hidden'
          }
        }}
      >
        {galeriaSeleccionada && (
          <>
            <DialogTitle
              sx={{
                px: 3.5,
                pt: 3,
                pb: 2,
                borderBottom: '1px solid #E5E9E1'
              }}
            >
              <Typography
                sx={{
                  fontFamily: 'Georgia, serif',
                  fontSize: { xs: 25, sm: 30 },
                  fontWeight: 600,
                  color: '#343B32'
                }}
              >
                {galeriaSeleccionada.titulo}
              </Typography>

              <Typography
                sx={{
                  color: '#788174',
                  fontSize: 13,
                  mt: 0.5
                }}
              >
                Reservación #{galeriaSeleccionada.reservacion || galeriaSeleccionada.id_reservacion}
              </Typography>
            </DialogTitle>

            <DialogContent sx={{ px: 3 }}>
              <Stack spacing={3} sx={{ pt: 1 }}>
                {error && <Alert severity="error">{error}</Alert>}

                <Typography variant="body2" color="text.secondary">
                  {galeriaSeleccionada.descripcion || 'Sin descripción.'}
                </Typography>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <Button
                    component="label"
                    variant="contained"
                    disabled={subiendo}
                    sx={{
                      bgcolor: '#254C40',
                      color: '#FFFFFF',
                      textTransform: 'none',
                      borderRadius: '10px',
                      fontWeight: 600,
                      px: 3,
                      py: 1.2,
                      boxShadow: 'none',
                      '&:hover': {
                        bgcolor: '#1D3D33',
                        boxShadow: 'none'
                      }
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
                    onClick={abrirDialogoVideo}
                    disabled={subiendo}
                    sx={{
                      color: '#254C40',
                      borderColor: '#A9BCA8',
                      textTransform: 'none',
                      borderRadius: '10px',
                      fontWeight: 600,
                      px: 3,
                      py: 1.2,
                      '&:hover': {
                        bgcolor: '#F2F6F1',
                        borderColor: '#254C40'
                      }
                    }}
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

                          <Stack direction="row" spacing={1} alignItems="center">
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => descargar(foto)}
                              disabled={subiendo}
                              sx={{
                                color: '#254C40',
                                borderColor: '#A9BCA8',
                                textTransform: 'none',
                                borderRadius: '8px',
                                fontWeight: 600,
                                px: 2,
                                '&:hover': {
                                  bgcolor: '#F2F6F1',
                                  borderColor: '#254C40'
                                }
                              }}
                            >
                              Descargar
                            </Button>

                            <Button
                              size="small"
                              variant="text"
                              color="error"
                              onClick={() => eliminarFoto(foto)}
                              disabled={subiendo}
                              sx={{
                                textTransform: 'none',
                                borderRadius: '8px',
                                fontWeight: 600,
                                px: 2,
                                '&:hover': {
                                  bgcolor: '#FFF1F0'
                                }
                              }}
                            >
                              Eliminar
                            </Button>
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

            <DialogActions sx={{ px: 3, py: 2.5, borderTop: '1px solid #E2E5DD' }}>
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
        PaperProps={{
          sx: {
            borderRadius: '20px',
            bgcolor: '#FFFEFB',
            border: '1px solid #E3E8DE',
            boxShadow: '0 20px 60px rgba(35, 52, 40, 0.12)',
            overflow: 'hidden'
          }
        }}
      >
        {/* ENCABEZADO */}
        <DialogTitle
          sx={{
            px: 3.5,
            pt: 3,
            pb: 2
          }}
        >
          <Typography
            sx={{
              color: '#68745B',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 2,
              mb: 0.8
            }}
          >
            LUZ & MEMORIA
          </Typography>

          <Typography
            sx={{
              fontFamily: 'Georgia, serif',
              fontSize: { xs: 25, sm: 29 },
              fontWeight: 600,
              color: '#343B32'
            }}
          >
            Agregar video a la galería
          </Typography>

          <Typography
            sx={{
              color: '#788174',
              fontSize: 13,
              mt: 0.7
            }}
          >
            Selecciona un archivo MP4 o agrega un enlace de YouTube.
          </Typography>
        </DialogTitle>

        {/* CONTENIDO */}
        <DialogContent sx={{ px: 3.5, pb: 3 }}>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {error && (
              <Alert severity="error" sx={{ borderRadius: 2 }}>
                {error}
              </Alert>
            )}

            {/* TÍTULO */}
            <TextField
              fullWidth
              size="small"
              label="Título del video"
              value={video.titulo}
              onChange={(e) =>
                setVideo({ ...video, titulo: e.target.value })
              }
              inputProps={{ maxLength: 150 }}
              required
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '10px',
                  bgcolor: '#FFFFFF'
                }
              }}
            />

            {/* OPCIÓN 1: ARCHIVO MP4 */}
            <Box
              sx={{
                p: 2.5,
                border: '1px solid #E3E8DE',
                borderRadius: '14px',
                bgcolor: '#FAFAF7'
              }}
            >
              <Typography
                sx={{
                  fontWeight: 700,
                  color: '#343B32',
                  fontSize: 14,
                  mb: 0.5
                }}
              >
                Subir video desde mi dispositivo
              </Typography>

              <Typography
                sx={{
                  color: '#788174',
                  fontSize: 12,
                  mb: 2
                }}
              >
                Selecciona un archivo MP4 de hasta 50 MB.
              </Typography>

              <Button
                component="label"
                variant="outlined"
                disabled={subiendo || guardando}
                sx={{
                  color: '#254C40',
                  borderColor: '#A9BCA8',
                  borderRadius: '10px',
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 2.5,
                  py: 1,
                  '&:hover': {
                    bgcolor: '#F2F6F1',
                    borderColor: '#254C40'
                  }
                }}
              >
                Seleccionar archivo MP4

                <input
                  hidden
                  type="file"
                  accept="video/mp4,.mp4"
                  onChange={(e) =>
                    setArchivoVideo(e.target.files?.[0] || null)
                  }
                />
              </Button>

              {archivoVideo && (
                <Box
                  sx={{
                    mt: 2,
                    p: 1.5,
                    bgcolor: '#FFFFFF',
                    border: '1px solid #E3E8DE',
                    borderRadius: '10px'
                  }}
                >
                  <Typography
                    sx={{
                      color: '#343B32',
                      fontSize: 13,
                      fontWeight: 600,
                      overflowWrap: 'anywhere'
                    }}
                  >
                    {archivoVideo.name}
                  </Typography>

                  <Typography
                    sx={{
                      color: '#788174',
                      fontSize: 12,
                      mt: 0.3
                    }}
                  >
                    {(archivoVideo.size / (1024 * 1024)).toFixed(2)} MB
                  </Typography>
                </Box>
              )}

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
                  bgcolor: '#254C40',
                  color: '#FFFFFF',
                  borderRadius: '10px',
                  textTransform: 'none',
                  fontWeight: 600,
                  py: 1.1,
                  boxShadow: 'none',
                  '&:hover': {
                    bgcolor: '#1D3D33',
                    boxShadow: 'none'
                  }
                }}
              >
                {subiendo ? 'Subiendo video...' : 'Subir video MP4'}
              </Button>
            </Box>

            {/* SEPARADOR */}
            <Stack
              direction="row"
              spacing={2}
              alignItems="center"
            >
              <Box
                sx={{
                  flex: 1,
                  height: '1px',
                  bgcolor: '#E3E8DE'
                }}
              />

              <Typography
                sx={{
                  fontSize: 12,
                  color: '#788174',
                  whiteSpace: 'nowrap'
                }}
              >
                O agregar desde YouTube
              </Typography>

              <Box
                sx={{
                  flex: 1,
                  height: '1px',
                  bgcolor: '#E3E8DE'
                }}
              />
            </Stack>

            {/* OPCIÓN 2: YOUTUBE */}
            <Box
              sx={{
                p: 2.5,
                border: '1px solid #E3E8DE',
                borderRadius: '14px',
                bgcolor: '#FAFAF7'
              }}
            >
              <Typography
                sx={{
                  fontWeight: 700,
                  color: '#343B32',
                  fontSize: 14,
                  mb: 1.5
                }}
              >
                Agregar video de YouTube
              </Typography>

              <TextField
                fullWidth
                size="small"
                label="URL de YouTube"
                placeholder="https://www.youtube.com/watch?v=..."
                value={video.url_externa}
                onChange={(e) =>
                  setVideo({ ...video, url_externa: e.target.value })
                }
                helperText="Pega el enlace del video de YouTube."
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '10px',
                    bgcolor: '#FFFFFF'
                  }
                }}
              />

              <Button
                fullWidth
                variant="outlined"
                onClick={guardarVideoYoutube}
                disabled={
                  subiendo ||
                  guardando ||
                  video.titulo.trim().length < 3 ||
                  !video.url_externa.trim()
                }
                sx={{
                  mt: 2,
                  color: '#254C40',
                  borderColor: '#A9BCA8',
                  borderRadius: '10px',
                  textTransform: 'none',
                  fontWeight: 600,
                  py: 1.1,
                  '&:hover': {
                    bgcolor: '#F2F6F1',
                    borderColor: '#254C40'
                  }
                }}
              >
                {guardando
                  ? 'Guardando...'
                  : 'Agregar enlace de YouTube'}
              </Button>
            </Box>
          </Stack>
        </DialogContent>

        {/* PIE DE VENTANA */}
        <DialogActions
          sx={{
            px: 3.5,
            py: 2,
            borderTop: '1px solid #E3E8DE',
            bgcolor: '#FFFEFB'
          }}
        >
          <Button
            onClick={cerrarDialogoVideo}
            disabled={subiendo || guardando}
            sx={{
              color: '#254C40',
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: '10px',
              px: 3
            }}
          >
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
