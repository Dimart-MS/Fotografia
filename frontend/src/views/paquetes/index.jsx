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
  InputAdornment,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';

import useStudio from '../../hooks/useStudio';
import Icon from '../../ui-component/Icon';
import EmptyState from '../../ui-component/EmptyState';

import {
  fetchPaquetesAdministracion,
  createPaquete,
  updatePaquete,
  inactivarPaquete,
  reactivarPaquete
} from '../../api/paquetesService';

const FORMULARIO_VACIO = {
  clave: '',
  nombre: '',
  descripcion: '',
  precio: ''
};

const formatoMoneda = (centavos) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(Number(centavos || 0) / 100);

function normalizarPaquete(item) {
  return {
    clave: item.clave ?? item.id ?? '',
    nombre: item.nombre ?? item.name ?? '',
    descripcion: item.descripcion ?? item.description ?? '',
    precioCentavos: Number(
      item.precio_centavos ?? item.price_cents ?? 0
    ),
    activo: item.activo ?? item.active ?? true
  };
}

export default function PaquetesView() {
  const { accessKey, setToast } = useStudio();

  const [paquetes, setPaquetes] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const [dialogoAbierto, setDialogoAbierto] = useState(false);
  const [paqueteEditar, setPaqueteEditar] = useState(null);
  const [formulario, setFormulario] = useState(FORMULARIO_VACIO);

  const cargarPaquetes = async () => {
    setCargando(true);
    setError('');

    try {
      const respuesta = await fetchPaquetesAdministracion(accessKey);
      setPaquetes(Array.isArray(respuesta)
        ? respuesta.map(normalizarPaquete)
        : []);
    } catch (err) {
      setError(err.message || 'No se pudieron cargar los paquetes.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarPaquetes();
  }, [accessKey]);

  const paquetesFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return paquetes.filter((paquete) =>
      `${paquete.clave} ${paquete.nombre} ${paquete.descripcion}`
        .toLowerCase()
        .includes(texto)
    );
  }, [paquetes, busqueda]);

  const abrirNuevo = () => {
    setPaqueteEditar(null);
    setFormulario(FORMULARIO_VACIO);
    setError('');
    setDialogoAbierto(true);
  };

  const abrirEdicion = (paquete) => {
    setPaqueteEditar(paquete);

    setFormulario({
      clave: paquete.clave,
      nombre: paquete.nombre,
      descripcion: paquete.descripcion,
      precio: (paquete.precioCentavos / 100).toFixed(2)
    });

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

  const guardarPaquete = async (event) => {
    event.preventDefault();
    setError('');

    const precio = Number(formulario.precio);

    if (!Number.isFinite(precio) || precio <= 0) {
      setError('Ingresa un precio mayor a cero.');
      return;
    }

    const datos = {
      nombre: formulario.nombre.trim(),
      descripcion: formulario.descripcion.trim() || null,
      precio_centavos: Math.round(precio * 100)
    };

    if (!datos.nombre || datos.nombre.length < 3) {
      setError('El nombre debe tener al menos 3 caracteres.');
      return;
    }

    if (!paqueteEditar) {
      datos.clave = formulario.clave.trim().toLowerCase();

      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(datos.clave)) {
        setError(
          'La clave debe usar minúsculas, números y guiones. Ejemplo: sesion-premium.'
        );
        return;
      }
    }

    setGuardando(true);

    try {
      if (paqueteEditar) {
        await updatePaquete(paqueteEditar.clave, datos, accessKey);
        setToast('Paquete actualizado correctamente.');
      } else {
        await createPaquete(datos, accessKey);
        setToast('Paquete registrado correctamente.');
      }

      setDialogoAbierto(false);
      setFormulario(FORMULARIO_VACIO);
      await cargarPaquetes();
    } catch (err) {
      setError(err.message || 'No se pudo guardar el paquete.');
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstado = async (paquete) => {
    const accion = paquete.activo ? inactivarPaquete : reactivarPaquete;

    const mensaje = paquete.activo
      ? `¿Deseas desactivar el paquete "${paquete.nombre}"?`
      : `¿Deseas reactivar el paquete "${paquete.nombre}"?`;

    if (!window.confirm(mensaje)) return;

    setError('');

    try {
      await accion(paquete.clave, accessKey);
      setToast(
        paquete.activo
          ? 'Paquete desactivado correctamente.'
          : 'Paquete reactivado correctamente.'
      );
      await cargarPaquetes();
    } catch (err) {
      setError(err.message || 'No se pudo cambiar el estado del paquete.');
    }
  };

  const activos = paquetes.filter((p) => p.activo).length;

  return (
    <>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* ESTADÍSTICAS */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, minmax(0, 1fr))'
            },
            gap: 2
          }}
        >
          {[
            {
              label: 'Total de paquetes',
              value: paquetes.length,
              icon: 'package'
            },
            {
              label: 'Paquetes activos',
              value: activos,
              icon: 'check-circle'
            }
          ].map((stat) => (
            <Paper
              key={stat.label}
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 3,
                border: '1px solid #E2E5DD',
                bgcolor: '#FFFFFF'
              }}
            >
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="flex-start"
              >
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    {stat.label}
                  </Typography>
                  <Typography
                    sx={{
                      mt: 1,
                      fontFamily: 'Georgia, serif',
                      fontSize: 38,
                      fontWeight: 700,
                      color: '#343B32'
                    }}
                  >
                    {stat.value}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    bgcolor: '#E9EDE4',
                    color: '#68745B',
                    display: 'grid',
                    placeItems: 'center'
                  }}
                >
                  <Icon name={stat.icon} size={22} />
                </Box>
              </Stack>
            </Paper>
          ))}
        </Box>

        {/* LISTADO DE PAQUETES */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, md: 3 },
            borderRadius: 3,
            border: '1px solid #E2E5DD',
            bgcolor: '#FFFFFF'
          }}
        >
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
                sx={{
                  fontFamily: 'Georgia, serif',
                  color: '#343B32'
                }}
              >
                Paquetes registrados
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                {paquetesFiltrados.length} de {paquetes.length} paquetes
              </Typography>
            </Box>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              alignItems={{ xs: 'stretch', sm: 'center' }}
              spacing={1.5}
            >

              <TextField
                size="small"
                placeholder="Buscar paquete..."
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                sx={{
                  width: { xs: '100%', sm: 300 },

                  '& .MuiOutlinedInput-root': {
                    height: 44,
                    borderRadius: '12px',
                    bgcolor: '#FFFFFF',

                    '& fieldset': {
                      borderColor: '#DDE5D7'
                    },

                    '&:hover fieldset': {
                      borderColor: '#AAB8A1'
                    },

                    '&.Mui-focused fieldset': {
                      borderColor: '#68745B',
                      borderWidth: '1px'
                    }
                  },

                  '& .MuiOutlinedInput-input': {
                    border: 'none !important',
                    outline: 'none !important',
                    boxShadow: 'none !important',

                    '&:focus, &:focus-visible': {
                      border: 'none !important',
                      outline: 'none !important',
                      boxShadow: 'none !important'
                    }
                  }
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Icon name="search" size={18} />
                    </InputAdornment>
                  )
                }}
              />

              <Button
                variant="contained"
                startIcon={<Icon name="plus" />}
                onClick={abrirNuevo}
                sx={{
                  minHeight: 44,
                  bgcolor: '#254C41',
                  whiteSpace: 'nowrap',
                  '&:hover': {
                    bgcolor: '#1D3D34'
                  }
                }}
              >
                Nuevo paquete
              </Button>
            </Stack>
          </Stack>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {cargando ? (
            <Typography
              color="text.secondary"
              sx={{ py: 4, textAlign: 'center' }}
            >
              Cargando paquetes...
            </Typography>
          ) : paquetesFiltrados.length === 0 ? (
            <EmptyState
              icon="package"
              title="No hay paquetes para mostrar"
              description={
                busqueda
                  ? 'Prueba con otro término de búsqueda.'
                  : 'Registra el primer paquete del estudio.'
              }
              actionLabel={!busqueda ? 'Crear paquete' : undefined}
              onAction={!busqueda ? abrirNuevo : undefined}
            />
          ) : (
            <TableContainer
              sx={{
                border: '1px solid #E2E5DD',
                borderRadius: 2
              }}
            >
              <Table sx={{ minWidth: 750 }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#F1F4EE' }}>
                    <TableCell>Paquete</TableCell>
                    <TableCell>Clave</TableCell>
                    <TableCell>Precio</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell align="right">Acciones</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {paquetesFiltrados.map((paquete) => (
                    <TableRow
                      key={paquete.clave}
                      hover
                      sx={{
                        opacity: paquete.activo ? 1 : 0.65,
                        '&:last-child td': {
                          borderBottom: 0
                        }
                      }}
                    >
                      <TableCell>
                        <Stack
                          direction="row"
                          alignItems="center"
                          spacing={1.5}
                        >
                          <Box
                            sx={{
                              width: 36,
                              height: 36,
                              borderRadius: '50%',
                              bgcolor: '#E9EDE4',
                              color: '#526047',
                              display: 'grid',
                              placeItems: 'center',
                              flexShrink: 0
                            }}
                          >
                            <Icon name="camera" size={18} />
                          </Box>

                          <Box sx={{ minWidth: 0 }}>
                            <Typography
                              variant="body2"
                              fontWeight={600}
                              sx={{ color: '#343B32' }}
                            >
                              {paquete.nombre}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ overflowWrap: 'anywhere' }}
                            >
                              {paquete.descripcion || 'Sin descripción'}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2">
                          {paquete.clave}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          sx={{ color: '#254C41' }}
                        >
                          {formatoMoneda(paquete.precioCentavos)}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Chip
                          size="small"
                          label={paquete.activo ? 'Activo' : 'Inactivo'}
                          sx={{
                            bgcolor: paquete.activo ? '#E9F0E5' : '#F1F1F1',
                            color: paquete.activo ? '#526B48' : '#747474',
                            fontWeight: 600
                          }}
                        />
                      </TableCell>

                      <TableCell align="right">
                        <Stack
                          direction="row"
                          spacing={1}
                          justifyContent="flex-end"
                        >
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => abrirEdicion(paquete)}
                            disabled={!paquete.activo}
                            sx={{
                              color: '#526047',
                              borderColor: '#AAB8A1',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            Editar
                          </Button>

                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => cambiarEstado(paquete)}
                            sx={{
                              bgcolor: '#254C41',
                              whiteSpace: 'nowrap',
                              '&:hover': {
                                bgcolor: '#1D3D34'
                              }
                            }}
                          >
                            {paquete.activo ? 'Desactivar' : 'Reactivar'}
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </Box>


      <Dialog
        open={dialogoAbierto}
        onClose={cerrarDialogo}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: '24px',
            bgcolor: '#FFFFFF',
            overflow: 'hidden'
          }
        }}
      >
        <Box component="form" onSubmit={guardarPaquete}>

          <DialogTitle
            sx={{
              px: { xs: 3, sm: 4 },
              pt: 4,
              pb: 3,
              borderBottom: '1px solid #E5E8E1'
            }}
          >
            <Typography
              sx={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.18em',
                color: '#68745B',
                mb: 1.5
              }}
            >
              LUZ & MEMORIA
            </Typography>

            <Typography
              sx={{
                fontFamily: 'Georgia, serif',
                fontSize: { xs: 25, sm: 29 },
                fontWeight: 600,
                color: '#343B32',
                mb: 1
              }}
            >
              {paqueteEditar ? 'Editar paquete' : 'Registrar paquete'}
            </Typography>

            <Typography
              variant="body2"
              sx={{
                color: '#7B8278',
                lineHeight: 1.7
              }}
            >
              {paqueteEditar
                ? 'Actualiza la información y el precio del servicio fotográfico.'
                : 'Configura un nuevo servicio fotográfico para el catálogo del estudio.'}
            </Typography>
          </DialogTitle>


          <DialogContent
            sx={{
              px: { xs: 3, sm: 4 },
              py: 3,
              '& .MuiOutlinedInput-root': {
                borderRadius: '12px'
              }
            }}
          >
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              {error && <Alert severity="error">{error}</Alert>}

              <TextField
                label="Clave del paquete"
                placeholder="sesion-premium"
                value={formulario.clave}
                onChange={(e) => cambiarCampo('clave', e.target.value)}
                disabled={Boolean(paqueteEditar)}
                required
                helperText="Usa minúsculas, números y guiones. No se puede cambiar después."
              />

              <TextField
                label="Nombre del paquete"
                value={formulario.nombre}
                onChange={(e) => cambiarCampo('nombre', e.target.value)}
                inputProps={{ maxLength: 120 }}
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

              <TextField
                label="Precio"
                type="number"
                value={formulario.precio}
                onChange={(e) => cambiarCampo('precio', e.target.value)}
                required
                inputProps={{ min: 0.01, step: 0.01 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">$</InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">MXN</InputAdornment>
                  )
                }}
              />
            </Stack>
          </DialogContent>

          <DialogActions
            sx={{
              px: { xs: 3, sm: 4 },
              py: 2.5,
              borderTop: '1px solid #E5E8E1',
              gap: 2
            }}
          >
            <Button
              onClick={cerrarDialogo}
              disabled={guardando}
              sx={{
                color: '#68745B',
                fontWeight: 600,
                textTransform: 'none'
              }}
            >
              Cancelar
            </Button>

            <Button
              type="submit"
              variant="contained"
              disabled={guardando}
              sx={{
                bgcolor: '#68745B',
                borderRadius: '12px',
                minHeight: 44,
                px: 3,
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': {
                  bgcolor: '#59634B'
                }
              }}
            >
              {guardando ? 'Guardando...' : 'Guardar paquete'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </>
  );
}
