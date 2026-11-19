
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
  Stack,
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
              Catálogo de paquetes
            </Typography>

            <Typography variant="body2" color="text.secondary">
              Administra los servicios y precios del estudio fotográfico.
            </Typography>
          </Box>

          <Button
            variant="contained"
            startIcon={<Icon name="plus" />}
            onClick={abrirNuevo}
            sx={{
              bgcolor: '#68745B',
              '&:hover': { bgcolor: '#59634B' }
            }}
          >
            Nuevo paquete
          </Button>
        </Stack>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ mb: 3 }}
        >
          <Box
            sx={{
              flex: 1,
              p: 2,
              borderRadius: 2,
              bgcolor: '#F8F6F0'
            }}
          >
            <Typography variant="caption" color="text.secondary">
              Total de paquetes
            </Typography>
            <Typography variant="h5" sx={{ color: '#343B32' }}>
              {paquetes.length}
            </Typography>
          </Box>

          <Box
            sx={{
              flex: 1,
              p: 2,
              borderRadius: 2,
              bgcolor: '#EEF0E9'
            }}
          >
            <Typography variant="caption" color="text.secondary">
              Paquetes activos
            </Typography>
            <Typography variant="h5" sx={{ color: '#68745B' }}>
              {activos}
            </Typography>
          </Box>
        </Stack>

        <TextField
          fullWidth
          size="small"
          placeholder="Buscar por clave, nombre o descripción..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          sx={{ mb: 3 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Icon name="search" />
              </InputAdornment>
            )
          }}
        />

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {cargando ? (
          <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
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
          <Box sx={{ overflowX: 'auto' }}>
            <Box sx={{ minWidth: 700 }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 2fr 1.2fr 1fr 1.3fr',
                  gap: 2,
                  p: 1.5,
                  bgcolor: '#F8F6F0',
                  borderRadius: 2,
                  mb: 1
                }}
              >
                {['Clave', 'Paquete', 'Precio', 'Estado', 'Acciones'].map((t) => (
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

              {paquetesFiltrados.map((paquete) => (
                <Box
                  key={paquete.clave}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 2fr 1.2fr 1fr 1.3fr',
                    gap: 2,
                    alignItems: 'center',
                    p: 1.5,
                    borderBottom: '1px solid #EAE8E0',
                    opacity: paquete.activo ? 1 : 0.65
                  }}
                >
                  <Typography variant="body2">
                    {paquete.clave}
                  </Typography>

                  <Box>
                    <Typography fontWeight={600} color="#343B32">
                      {paquete.nombre}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {paquete.descripcion || 'Sin descripción'}
                    </Typography>
                  </Box>

                  <Typography fontWeight={600}>
                    {formatoMoneda(paquete.precioCentavos)}
                  </Typography>

                  <Chip
                    size="small"
                    label={paquete.activo ? 'Activo' : 'Inactivo'}
                    color={paquete.activo ? 'success' : 'default'}
                    variant="outlined"
                  />

                  <Stack direction="row" spacing={0.5}>
                    <IconButton
                      size="small"
                      title="Editar paquete"
                      onClick={() => abrirEdicion(paquete)}
                      disabled={!paquete.activo}
                    >
                      <Icon name="edit" />
                    </IconButton>

                    <IconButton
                      size="small"
                      title={paquete.activo ? 'Desactivar' : 'Reactivar'}
                      onClick={() => cambiarEstado(paquete)}
                      color={paquete.activo ? 'error' : 'success'}
                    >
                      <Icon name={paquete.activo ? 'power' : 'refresh-cw'} />
                    </IconButton>
                  </Stack>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </section>

      <Dialog
        open={dialogoAbierto}
        onClose={cerrarDialogo}
        fullWidth
        maxWidth="sm"
      >
        <Box component="form" onSubmit={guardarPaquete}>
          <DialogTitle sx={{ color: '#343B32', fontFamily: 'Georgia, serif' }}>
            {paqueteEditar ? 'Editar paquete' : 'Registrar paquete'}
          </DialogTitle>

          <DialogContent>
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
              {guardando ? 'Guardando...' : 'Guardar paquete'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </>
  );
}
