import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  MenuItem,
  Snackbar,
  Stack,
  TextField,
  Typography
} from '@mui/material';

import { EVENT_TYPES } from '../../config';

import {
  formatMoney,
  formatPrettyDate,
  getLocalToday
} from '../../utils/formatters';

import useStudio from '../../hooks/useStudio';

// ==============================|| GESTOR DE MODALES Y NOTIFICACIONES ||============================== //

function formatPaymentDeadline(value) {
  if (!value) return 'No disponible';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'No disponible';
  }

  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'America/Mexico_City'
  }).format(date);
}

export default function StudioDialogManager() {
  const {
    modal,
    closeModal,
    saving,
    error,
    toast,
    setToast,
    form,
    setForm,
    clients = [],
    packages = [],
    selectedBooking,
    paymentAmount,
    setPaymentAmount,
    extensionDate,
    setExtensionDate,
    extensionReason,
    setExtensionReason,
    cancelReason,
    setCancelReason,
    handleSaveModal,
    temporaryPassword,
    setTemporaryPassword
  } = useStudio();

  // ==============================|| DATOS CALCULADOS ||============================== //

  const selectedPackage = packages.find(
    (pkg) => String(pkg.id) === String(form.package)
  );

  const isDetailsModal = modal === 'bookingDetails';

  const dialogHeading =
    modal === 'client'
      ? 'Registrar nuevo cliente'
      : modal === 'booking'
        ? 'Nueva solicitud de reserva'
        : modal === 'payment'
          ? 'Registrar pago en efectivo'
          : modal === 'extension'
            ? 'Conceder prórroga de anticipo'
            : modal === 'cancel'
              ? 'Cancelar solicitud'
              : '';

  const dialogDescription =
    modal === 'client'
      ? 'Registra la información de contacto del cliente.'
      : modal === 'booking'
        ? 'Organiza una nueva solicitud de reservación.'
        : modal === 'payment'
          ? 'Registra un anticipo o abono en efectivo. Los pagos aprobados se acumulan.'
          : modal === 'extension'
            ? 'Establece una nueva fecha límite y registra el motivo de la prórroga.'
            : modal === 'cancel'
              ? 'Revisa la información antes de cancelar la solicitud.'
              : '';

  const submitButtonLabel = saving
    ? 'Guardando…'
    : modal === 'client'
      ? 'Guardar cliente'
      : modal === 'booking'
        ? 'Crear solicitud'
        : modal === 'payment'
          ? 'Registrar pago'
          : modal === 'extension'
            ? 'Conceder prórroga'
            : 'Cancelar solicitud';

  // ==============================|| ESTILOS COMPARTIDOS ||============================== //

  const dialogPaperSx = {
    borderRadius: 3,
    maxHeight: 'calc(100dvh - 32px)',
    display: 'flex',
    flexDirection: 'column'
  };

  const sectionTitleSx = {
    fontWeight: 700,
    color: '#343B32'
  };

  const summaryBoxSx = {
    bgcolor: '#F1F4EE',
    border: '1px solid #DDE5D7',
    borderRadius: 2,
    p: 2.5
  };

  const primaryButtonSx = {
    bgcolor: '#68745B',
    color: '#FFFFFF',
    textTransform: 'none',
    fontWeight: 600,
    px: 3,
    '&:hover': {
      bgcolor: '#526047'
    }
  };

  // ==============================|| DETALLES DE RESERVACIÓN ||============================== //

  const bookingPackage = selectedBooking
    ? packages.find(
      (pkg) =>
        String(pkg.id) === String(selectedBooking.package)
    )
    : null;

  const bookingTotal = Number(selectedBooking?.total_cents) || 0;
  const bookingPaid = Number(selectedBooking?.paid_cents) || 0;
  const bookingRemaining = Math.max(
    bookingTotal - bookingPaid,
    0
  );

  const bookingMinimum = Math.ceil(bookingTotal * 0.5);

  const bookingMinimumRemaining = Math.max(
    bookingMinimum - bookingPaid,
    0
  );

  const isConfirmedBooking =
    selectedBooking?.status === 'Confirmada';

  const paymentAmountNumber = Number(paymentAmount);

  const paymentAmountIsValid =
    String(paymentAmount ?? '').trim() !== '' &&
    Number.isFinite(paymentAmountNumber) &&
    paymentAmountNumber > 0 &&
    Math.round(paymentAmountNumber * 100) ===
    paymentAmountNumber * 100 &&
    paymentAmountNumber * 100 <= bookingRemaining;

  const bookingDetails = selectedBooking
    ? [
      {
        label: 'Cliente',
        value:
          selectedBooking.client_name || 'No registrado'
      },
      {
        label: 'Tipo de evento',
        value:
          selectedBooking.event_type || 'No registrado'
      },
      {
        label: 'Fecha del evento',
        value: selectedBooking.event_date
          ? formatPrettyDate(selectedBooking.event_date)
          : 'No registrada'
      },
      {
        label: 'Paquete contratado',
        value: bookingPackage?.name || 'No disponible'
      }
    ]
    : [];

  const bookingStatus = selectedBooking?.status || '';

  const statusColors =
    bookingStatus === 'Confirmada'
      ? {
        background: '#E8F0E2',
        text: '#3B5C30'
      }
      : bookingStatus === 'Cancelada'
        ? {
          background: '#ECEEE8',
          text: '#72786E'
        }
        : {
          background: '#F5EDE0',
          text: '#8A6536'
        };

  // ==============================|| RENDERIZADO ||============================== //

  return (
    <>
      {/* ========================================================= */}
      {/* FORMULARIOS PRINCIPALES                                   */}
      {/* CLIENTE / RESERVA / ANTICIPO / CANCELACIÓN                 */}
      {/* ========================================================= */}

      <Dialog
        open={Boolean(modal) && !isDetailsModal && modal !== 'temporaryPassword'}
        onClose={closeModal}
        fullWidth
        maxWidth="sm"
        scroll="paper"
        slotProps={{
          paper: {
            sx: dialogPaperSx
          }
        }}
      >
        <Box
          component="form"
          onSubmit={handleSaveModal}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0,
            overflow: 'hidden'
          }}
        >
          {/* ENCABEZADO FIJO */}

          <DialogTitle
            sx={{
              px: 3,
              pt: 3,
              pb: 2,
              flexShrink: 0
            }}
          >
            <Stack spacing={0.8}>
              <Typography
                variant="overline"
                sx={{
                  color: '#68745B',
                  letterSpacing: 2,
                  fontWeight: 700
                }}
              >
                LUZ & MEMORIA
              </Typography>

              <Typography
                variant="h5"
                sx={{
                  fontFamily: 'Georgia, serif',
                  fontWeight: 600,
                  color: '#343B32'
                }}
              >
                {dialogHeading}
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
              >
                {dialogDescription}
              </Typography>
            </Stack>
          </DialogTitle>

          {/* CONTENIDO DESPLAZABLE */}

          <DialogContent
            dividers
            sx={{
              px: 3,
              py: 3,
              minHeight: 0,
              overflowY: 'auto',
              flex: '1 1 auto'
            }}
          >
            {/* ================================================= */}
            {/* REGISTRAR NUEVO CLIENTE                            */}
            {/* ================================================= */}

            {modal === 'client' && (
              <Stack spacing={3}>
                <Box>
                  <Typography
                    variant="subtitle1"
                    sx={{
                      ...sectionTitleSx,
                      mb: 0.5
                    }}
                  >
                    Información personal
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                  >
                    Captura los datos del cliente para
                    mantener actualizado el directorio
                    del estudio.
                  </Typography>
                </Box>

                <TextField
                  label="Nombre completo"
                  required
                  fullWidth
                  value={form.name || ''}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      name: event.target.value
                    })
                  }
                  helperText="Ingresa el nombre y apellidos del cliente."
                  slotProps={{
                    htmlInput: {
                      minLength: 3,
                      maxLength: 100
                    }
                  }}
                />

                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Correo electrónico"
                      type="email"
                      required
                      fullWidth
                      value={form.email || ''}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          email: event.target.value
                        })
                      }
                      placeholder="correo@ejemplo.com"
                      slotProps={{
                        htmlInput: {
                          maxLength: 160
                        }
                      }}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Teléfono"
                      required
                      fullWidth
                      value={form.phone || ''}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          phone: event.target.value
                            .replace(/\D/g, '')
                            .slice(0, 10)
                        })
                      }
                      placeholder="10 dígitos"
                      slotProps={{
                        htmlInput: {
                          pattern: '[0-9]{10}',
                          maxLength: 10,
                          inputMode: 'numeric'
                        }
                      }}
                    />
                  </Grid>
                </Grid>

                <Divider />

                <Box>
                  <Typography
                    variant="subtitle1"
                    sx={{
                      ...sectionTitleSx,
                      mb: 0.5
                    }}
                  >
                    Dirección de entrega
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2 }}
                  >
                    Esta información permitirá organizar
                    las entregas relacionadas con los
                    servicios contratados.
                  </Typography>

                  <TextField
                    label="Domicilio de entrega"
                    required
                    fullWidth
                    multiline
                    rows={3}
                    value={form.address || ''}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        address: event.target.value
                      })
                    }
                    helperText="Incluye calle, número, colonia y referencias necesarias."
                    slotProps={{
                      htmlInput: {
                        minLength: 5,
                        maxLength: 250
                      }
                    }}
                  />
                </Box>
              </Stack>
            )}

            {/* ================================================= */}
            {/* NUEVA SOLICITUD DE RESERVA                         */}
            {/* ================================================= */}

            {modal === 'booking' && (
              <Stack spacing={3}>
                <Alert
                  severity="info"
                  sx={{ borderRadius: 2 }}
                >
                  La solicitud se registrará como
                  pendiente. La fecha quedará apartada
                  cuando se confirme un anticipo mínimo
                  del 50 %.
                </Alert>

                <Box>
                  <Typography
                    variant="subtitle1"
                    sx={{
                      ...sectionTitleSx,
                      mb: 2
                    }}
                  >
                    Información del evento
                  </Typography>

                  <Stack spacing={2.5}>
                    <TextField
                      select
                      label="Cliente"
                      required
                      fullWidth
                      value={form.client_id || ''}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          client_id: event.target.value
                        })
                      }
                    >
                      {clients.map((client) => (
                        <MenuItem
                          key={client.id}
                          value={client.id}
                        >
                          {client.name}
                        </MenuItem>
                      ))}
                    </TextField>

                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          type="date"
                          label="Fecha del evento"
                          required
                          fullWidth
                          value={form.event_date || ''}
                          onChange={(event) =>
                            setForm({
                              ...form,
                              event_date: event.target.value
                            })
                          }
                          slotProps={{
                            inputLabel: {
                              shrink: true
                            },
                            htmlInput: {
                              min: getLocalToday()
                            }
                          }}
                        />
                      </Grid>

                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          select
                          label="Tipo de evento"
                          fullWidth
                          value={form.event_type || 'Boda'}
                          onChange={(event) =>
                            setForm({
                              ...form,
                              event_type: event.target.value
                            })
                          }
                        >
                          {EVENT_TYPES.map((eventType) => (
                            <MenuItem
                              key={eventType}
                              value={eventType}
                            >
                              {eventType}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                    </Grid>
                  </Stack>
                </Box>

                <Divider />

                <Box>
                  <Typography
                    variant="subtitle1"
                    sx={{
                      ...sectionTitleSx,
                      mb: 2
                    }}
                  >
                    Paquete contratado
                  </Typography>

                  <TextField
                    select
                    label="Seleccionar paquete"
                    fullWidth
                    value={form.package || 'foto'}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        package: event.target.value
                      })
                    }
                  >
                    {packages.map((pkg) => (
                      <MenuItem
                        key={pkg.id}
                        value={pkg.id}
                      >
                        {pkg.name} ·{' '}
                        {formatMoney(pkg.price_cents)}
                      </MenuItem>
                    ))}
                  </TextField>
                </Box>

                {selectedPackage && (
                  <Box sx={summaryBoxSx}>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        ...sectionTitleSx,
                        mb: 2
                      }}
                    >
                      Resumen de contratación
                    </Typography>

                    <Stack spacing={1.5}>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        spacing={2}
                      >
                        <Typography variant="body2">
                          Total del paquete
                        </Typography>

                        <Typography
                          variant="body2"
                          fontWeight={700}
                        >
                          {formatMoney(
                            selectedPackage.price_cents
                          )}
                        </Typography>
                      </Stack>

                      <Divider />

                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        spacing={2}
                      >
                        <Typography
                          variant="body2"
                          fontWeight={600}
                        >
                          Anticipo mínimo (50 %)
                        </Typography>

                        <Typography
                          variant="body1"
                          fontWeight={700}
                          sx={{
                            color: '#526047',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {formatMoney(
                            selectedPackage.price_cents / 2
                          )}
                        </Typography>
                      </Stack>
                    </Stack>

                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        display: 'block',
                        mt: 2
                      }}
                    >
                      Importes expresados en pesos
                      mexicanos (MXN).
                    </Typography>
                  </Box>
                )}
              </Stack>
            )}

            {/* ================================================= */}
            {/* CONFIRMAR ANTICIPO                                 */}
            {/* ================================================= */}

            {modal === 'payment' && selectedBooking && (
              <Stack spacing={3}>
                <Box>
                  <Typography
                    variant="subtitle1"
                    sx={sectionTitleSx}
                  >
                    {selectedBooking.client_name}
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 0.5 }}
                  >
                    {formatPrettyDate(
                      selectedBooking.event_date
                    )}
                    {' · '}
                    {selectedBooking.event_type}
                  </Typography>
                </Box>

                <Alert severity="info" sx={{ borderRadius: 2 }}>
                  {isConfirmedBooking
                    ? 'La reservación ya está confirmada. Puedes registrar abonos adicionales hasta liquidar el saldo.'
                    : 'Puedes registrar abonos inferiores al 50 %. La reservación se confirmará cuando los pagos aprobados acumulados alcancen el anticipo mínimo.'}
                </Alert>

                <Box sx={summaryBoxSx}>
                  <Stack spacing={1.5}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      spacing={2}
                    >
                      <Typography variant="body2">
                        Total contratado
                      </Typography>

                      <Typography
                        fontWeight={700}
                        sx={{ whiteSpace: 'nowrap' }}
                      >
                        {formatMoney(
                          selectedBooking.total_cents
                        )}
                      </Typography>
                    </Stack>

                    <Divider />

                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      spacing={2}
                    >
                      <Typography variant="body2">
                        Anticipo mínimo
                      </Typography>

                      <Typography
                        fontWeight={700}
                        sx={{
                          color: '#526047',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {formatMoney(
                          selectedBooking.total_cents / 2
                        )}
                      </Typography>
                    </Stack>

                    <Divider />

                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      spacing={2}
                    >
                      <Typography variant="body2">
                        Pagos aprobados acumulados
                      </Typography>

                      <Typography fontWeight={700}>
                        {formatMoney(bookingPaid)}
                      </Typography>
                    </Stack>

                    {!isConfirmedBooking && (
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        spacing={2}
                      >
                        <Typography variant="body2">
                          Falta para confirmar
                        </Typography>

                        <Typography fontWeight={700} color="warning.main">
                          {formatMoney(bookingMinimumRemaining)}
                        </Typography>
                      </Stack>
                    )}

                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      spacing={2}
                    >
                      <Typography variant="body2">
                        Saldo pendiente
                      </Typography>

                      <Typography fontWeight={700}>
                        {formatMoney(bookingRemaining)}
                      </Typography>
                    </Stack>

                  </Stack>
                </Box>

                <TextField
                  label="Importe recibido en efectivo (MXN)"
                  type="number"
                  required
                  fullWidth
                  value={paymentAmount}
                  onChange={(event) =>
                    setPaymentAmount(event.target.value)
                  }
                  error={
                    String(paymentAmount ?? '').trim() !== '' &&
                    !paymentAmountIsValid
                  }
                  helperText={
                    String(paymentAmount ?? '').trim() !== '' &&
                      !paymentAmountIsValid
                      ? 'Ingresa un importe válido, mayor que cero, con máximo dos decimales y sin superar el saldo pendiente.'
                      : 'Puedes registrar un abono parcial o liquidar el saldo restante.'
                  }
                  slotProps={{
                    htmlInput: {
                      min: 0.01,
                      max: bookingRemaining / 100,
                      step: '0.01'
                    }
                  }}
                />
              </Stack>
            )}

            {/* ================================================= */}
            {/* CONCEDER PRÓRROGA DE ANTICIPO                      */}
            {/* ================================================= */}

            {modal === 'extension' && selectedBooking && (
              <Stack spacing={3}>
                <Alert severity="warning" sx={{ borderRadius: 2 }}>
                  Esta reservación requiere una decisión administrativa
                  sobre el anticipo. Puedes conceder una nueva fecha límite
                  para que el cliente presente otro comprobante.
                </Alert>

                <Box sx={summaryBoxSx}>
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Cliente
                      </Typography>

                      <Typography fontWeight={700}>
                        {selectedBooking.client_name}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Reservación
                      </Typography>

                      <Typography fontWeight={600}>
                        #{selectedBooking.id}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Fecha del evento
                      </Typography>

                      <Typography fontWeight={600}>
                        {formatPrettyDate(selectedBooking.event_date)}
                      </Typography>
                    </Box>

                    <Divider />

                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Fecha límite actual del anticipo
                      </Typography>

                      <Typography fontWeight={700} color="warning.main">
                        {formatPaymentDeadline(
                          selectedBooking.payment_deadline
                        )}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Prórrogas anteriores
                      </Typography>

                      <Typography fontWeight={600}>
                        {selectedBooking.numero_prorrogas ?? 0}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>

                <TextField
                  label="Nueva fecha límite"
                  type="date"
                  required
                  fullWidth
                  value={extensionDate || ''}
                  onChange={(event) => setExtensionDate(event.target.value)}
                  slotProps={{
                    inputLabel: {
                      shrink: true
                    },
                    htmlInput: {
                      min: getLocalToday()
                    }
                  }}
                  helperText="Selecciona una fecha posterior al plazo anterior. El límite será a las 23:59:59, hora de Ciudad de México."
                />

                <TextField
                  label="Motivo de la prórroga"
                  required
                  fullWidth
                  multiline
                  minRows={3}
                  value={extensionReason || ''}
                  onChange={(event) => setExtensionReason(event.target.value)}
                  slotProps={{
                    htmlInput: {
                      maxLength: 2000
                    }
                  }}
                  placeholder="Explica por qué se concede un nuevo plazo al cliente."
                  helperText="El motivo se conservará en el historial de prórrogas."
                />

                <Alert severity="info" sx={{ borderRadius: 2 }}>
                  Al conceder la prórroga, la reservación seguirá
                  pendiente de anticipo y se actualizará la fecha
                  límite. No se eliminarán pagos, comprobantes
                  ni registros anteriores.
                </Alert>
              </Stack>
            )}

            {/* ================================================= */}
            {/* CANCELAR SOLICITUD                                 */}
            {/* ================================================= */}

            {modal === 'cancel' && selectedBooking && (
              <Stack spacing={2.5}>
                <Alert
                  severity="warning"
                  sx={{ borderRadius: 2 }}
                >
                  Estás a punto de cancelar una solicitud
                  de reservación. Revisa los datos antes
                  de continuar.
                </Alert>

                <Box
                  sx={{
                    p: 2.5,
                    bgcolor: '#F7F7F3',
                    border: '1px solid #E2E5DD',
                    borderRadius: 2
                  }}
                >
                  <Stack spacing={2}>
                    <Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                      >
                        Cliente
                      </Typography>

                      <Typography fontWeight={700}>
                        {selectedBooking.client_name}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                      >
                        Fecha del evento
                      </Typography>

                      <Typography fontWeight={600}>
                        {formatPrettyDate(
                          selectedBooking.event_date
                        )}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                      >
                        Tipo de evento
                      </Typography>

                      <Typography fontWeight={600}>
                        {selectedBooking.event_type}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>

                <Typography
                  variant="body2"
                  color="text.secondary"
                >
                  La solicitud cambiará a estado
                  Cancelada. El registro permanecerá
                  disponible en el historial del estudio.
                </Typography>

                <TextField
                  label="Motivo de cancelación"
                  required
                  fullWidth
                  multiline
                  minRows={3}
                  value={cancelReason || ''}
                  onChange={(event) => setCancelReason(event.target.value)}
                  slotProps={{
                    htmlInput: {
                      maxLength: 500
                    }
                  }}
                  placeholder="Explica por qué se cancela la solicitud."
                  error={
                    cancelReason.trim().length > 0 &&
                    cancelReason.trim().length < 5
                  }
                  helperText="Obligatorio: entre 5 y 500 caracteres. El motivo quedará registrado en el historial de la reservación."
                />
              </Stack>
            )}

            {/* ================================================= */}
            {/* MENSAJES DE ERROR                                  */}
            {/* ================================================= */}

            {error && (
              <Alert
                severity="error"
                sx={{ mt: 3, borderRadius: 2 }}
              >
                {error}
              </Alert>
            )}
          </DialogContent>

          {/* BOTONES INFERIORES FIJOS */}

          <DialogActions
            sx={{
              px: 3,
              py: 2,
              borderTop: '1px solid #E5E7E1',
              gap: 1,
              flexShrink: 0,
              bgcolor: '#FFFFFF'
            }}
          >
            <Button
              onClick={closeModal}
              disabled={saving}
              sx={{
                color: '#68745B',
                textTransform: 'none',
                fontWeight: 600
              }}
            >
              Volver
            </Button>

            <Button
              variant="contained"
              type="submit"
              disabled={
                saving ||
                (modal === 'payment' && !paymentAmountIsValid) ||
                (modal === 'booking' && !clients.length) ||
                (
                  ['payment', 'cancel', 'extension'].includes(modal) &&
                  !selectedBooking
                ) ||
                (
                  modal === 'extension' &&
                  (!extensionDate || !extensionReason.trim())
                ) ||
                (
                  modal === 'cancel' &&
                  (
                    cancelReason.trim().length < 5 ||
                    cancelReason.trim().length > 500
                  )
                )
              }
              color={
                modal === 'cancel'
                  ? 'error'
                  : 'primary'
              }
              sx={
                modal === 'cancel'
                  ? {
                    textTransform: 'none',
                    fontWeight: 600,
                    px: 3
                  }
                  : primaryButtonSx
              }
            >
              {submitButtonLabel}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* ========================================================= */}
      {/* DETALLES DE RESERVACIÓN - SOLO LECTURA                     */}
      {/* ========================================================= */}

      <Dialog
        open={isDetailsModal}
        onClose={closeModal}
        fullWidth
        maxWidth="sm"
        scroll="paper"
        slotProps={{
          paper: {
            sx: dialogPaperSx
          }
        }}
      >
        <DialogTitle
          sx={{
            px: 3,
            pt: 3,
            pb: 2,
            flexShrink: 0
          }}
        >
          <Stack spacing={0.8}>
            <Typography
              variant="overline"
              sx={{
                color: '#68745B',
                letterSpacing: 2,
                fontWeight: 700
              }}
            >
              LUZ & MEMORIA
            </Typography>

            <Typography
              variant="h5"
              sx={{
                fontFamily: 'Georgia, serif',
                fontWeight: 600,
                color: '#343B32'
              }}
            >
              Detalles de reservación
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
            >
              Consulta la información del evento
              y los importes registrados.
            </Typography>
          </Stack>
        </DialogTitle>

        <DialogContent
          dividers
          sx={{
            px: 3,
            py: 3,
            minHeight: 0,
            overflowY: 'auto'
          }}
        >
          {selectedBooking && (
            <Stack spacing={3}>
              {/* ESTADO DE RESERVACIÓN */}

              <Box>
                <Typography
                  variant="subtitle2"
                  sx={{
                    ...sectionTitleSx,
                    mb: 1.5
                  }}
                >
                  Estado de la reservación
                </Typography>

                <Chip
                  label={
                    bookingStatus || 'Sin estado'
                  }
                  size="small"
                  sx={{
                    bgcolor: statusColors.background,
                    color: statusColors.text,
                    fontWeight: 700
                  }}
                />
              </Box>

              <Divider />

              {/* INFORMACIÓN DEL EVENTO */}

              <Box>
                <Typography
                  variant="subtitle1"
                  sx={{
                    ...sectionTitleSx,
                    mb: 2
                  }}
                >
                  Información del evento
                </Typography>

                <Grid container spacing={2.5}>
                  {bookingDetails.map((detail) => (
                    <Grid
                      key={detail.label}
                      size={{ xs: 12, sm: 6 }}
                    >
                      <Typography
                        variant="caption"
                        color="text.secondary"
                      >
                        {detail.label}
                      </Typography>

                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          mt: 0.5,
                          overflowWrap: 'anywhere'
                        }}
                      >
                        {detail.value}
                      </Typography>
                    </Grid>
                  ))}
                </Grid>
              </Box>

              <Divider />

              {/* PLAZO DEL ANTICIPO */}

              {selectedBooking.payment_deadline && (
                <>
                  <Box>
                    <Typography
                      variant="subtitle1"
                      sx={{
                        ...sectionTitleSx,
                        mb: 2
                      }}
                    >
                      Plazo del anticipo
                    </Typography>

                    <Stack spacing={1.5}>
                      <Typography variant="body2">
                        <strong>Fecha límite:</strong>{' '}
                        {formatPaymentDeadline(
                          selectedBooking.payment_deadline
                        )}
                      </Typography>

                      <Typography variant="body2">
                        <strong>Prórrogas concedidas:</strong>{' '}
                        {selectedBooking.numero_prorrogas ?? 0}
                      </Typography>
                    </Stack>
                  </Box>

                  <Divider />
                </>
              )}

              {/* INFORMACIÓN DE PAGO */}

              <Box>
                <Typography
                  variant="subtitle1"
                  sx={{
                    ...sectionTitleSx,
                    mb: 2
                  }}
                >
                  Información de pago
                </Typography>

                <Box sx={summaryBoxSx}>
                  <Stack spacing={1.5}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      spacing={2}
                    >
                      <Typography variant="body2">
                        Total contratado
                      </Typography>

                      <Typography
                        variant="body2"
                        fontWeight={700}
                      >
                        {formatMoney(bookingTotal)}
                      </Typography>
                    </Stack>

                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      spacing={2}
                    >
                      <Typography variant="body2">
                        Pagos aprobados acumulados
                      </Typography>

                      <Typography
                        variant="body2"
                        fontWeight={700}
                      >
                        {formatMoney(bookingPaid)}
                      </Typography>
                    </Stack>

                    <Divider />

                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      spacing={2}
                    >
                      <Typography
                        variant="body1"
                        fontWeight={700}
                      >
                        {bookingStatus === 'Cancelada'
                          ? 'Importe no pagado'
                          : 'Saldo pendiente'}
                      </Typography>

                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 700,
                          color:
                            bookingStatus === 'Cancelada'
                              ? '#72786E'
                              : bookingRemaining > 0
                                ? '#9A6A32'
                                : '#526047',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {formatMoney(bookingRemaining)}
                      </Typography>
                    </Stack>
                  </Stack>
                </Box>
              </Box>

              {/* AVISOS SEGÚN EL ESTADO */}

              {bookingStatus === 'Comprobante enviado' && (
                <Alert severity="info" sx={{ borderRadius: 2 }}>
                  El cliente presentó un comprobante de anticipo.
                  La reservación está pendiente de revisión administrativa
                  desde el módulo de Pagos.
                </Alert>
              )}

              {bookingStatus === 'Pendiente de anticipo' &&
                selectedBooking.decision_anticipo_pendiente && (
                  <Alert severity="warning" sx={{ borderRadius: 2 }}>
                    Esta reservación requiere una decisión administrativa.
                    Debes conceder una prórroga o cancelar la solicitud.
                  </Alert>
                )}

              {bookingStatus === 'Pendiente de anticipo' &&
                !selectedBooking.decision_anticipo_pendiente && (
                  <Alert severity="info" sx={{ borderRadius: 2 }}>
                    La reservación todavía no está confirmada.
                    Se requiere registrar y aprobar un anticipo mínimo
                    del 50 % del total contratado.
                  </Alert>
                )}

              {/* AVISO PARA RESERVAS CANCELADAS */}

              {bookingStatus === 'Cancelada' && (
                <Alert
                  severity="info"
                  sx={{ borderRadius: 2 }}
                >
                  Esta reservación fue cancelada.
                  El registro se conserva en el historial.
                  El importe no pagado no representa
                  necesariamente una deuda activa.
                </Alert>
              )}
            </Stack>
          )}
        </DialogContent>

        {/* BOTÓN DE CIERRE */}

        <DialogActions
          sx={{
            px: 3,
            py: 2,
            borderTop: '1px solid #E5E7E1',
            flexShrink: 0,
            bgcolor: '#FFFFFF'
          }}
        >
          <Button
            variant="contained"
            onClick={closeModal}
            sx={primaryButtonSx}
          >
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

      {/* ========================================================= */}
      {/* CONTRASEÑA TEMPORAL DEL NUEVO CLIENTE                     */}
      {/* ========================================================= */}

      <Dialog
        open={modal === 'temporaryPassword'}
        onClose={(event, reason) => {
          if (reason !== 'backdropClick' && reason !== 'escapeKeyDown') {
            closeModal();
          }
        }}
        fullWidth
        maxWidth="sm"
        disableEscapeKeyDown
        slotProps={{
          paper: {
            sx: dialogPaperSx
          }
        }}
      >
        <DialogTitle sx={{ px: 3, pt: 3, pb: 2 }}>
          <Stack spacing={1}>
            <Typography
              variant="overline"
              sx={{
                color: '#68745B',
                letterSpacing: 2,
                fontWeight: 700
              }}
            >
              LUZ & MEMORIA
            </Typography>

            <Typography
              variant="h5"
              sx={{
                fontFamily: 'Georgia, serif',
                fontWeight: 600,
                color: '#343B32'
              }}
            >
              Cliente registrado correctamente
            </Typography>

            <Typography variant="body2" color="text.secondary">
              Se generó una contraseña temporal para el nuevo cliente.
            </Typography>
          </Stack>
        </DialogTitle>

        <DialogContent dividers sx={{ px: 3, py: 3 }}>
          <Stack spacing={3}>
            <Alert severity="success" sx={{ borderRadius: 2 }}>
              El cliente fue registrado y su cuenta de acceso fue creada.
            </Alert>

            <Box>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 700, mb: 1 }}
              >
                Contraseña temporal
              </Typography>

              <TextField
                fullWidth
                value={temporaryPassword || ''}
                InputProps={{
                  readOnly: true
                }}
                helperText="Esta contraseña solamente se mostrará una vez."
              />
            </Box>

            <Button
              variant="outlined"
              fullWidth
              disabled={!temporaryPassword}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(temporaryPassword);
                  setToast('Contraseña temporal copiada correctamente.');
                } catch {
                  setToast(
                    'No se pudo copiar automáticamente. Selecciona la contraseña para copiarla.'
                  );
                }
              }}
              sx={{
                borderColor: '#68745B',
                color: '#3B5C30',
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': {
                  borderColor: '#3B5C30',
                  backgroundColor: '#F4F6F1'
                }
              }}
            >
              Copiar contraseña temporal
            </Button>

            <Alert severity="warning" sx={{ borderRadius: 2 }}>
              Comparte esta contraseña de forma segura con el cliente.
              En su primer inicio de sesión deberá cambiarla
              obligatoriamente antes de utilizar el sistema.
            </Alert>

            <Typography variant="body2" color="text.secondary">
              Por seguridad, la contraseña no podrá consultarse nuevamente
              después de cerrar esta ventana.
            </Typography>
          </Stack>
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            py: 2,
            borderTop: '1px solid #E5E7E1'
          }}
        >
          <Button
            variant="contained"
            onClick={() => {
              setTemporaryPassword('');
              closeModal();
            }}
            sx={primaryButtonSx}
          >
            Entendido, cerrar
          </Button>
        </DialogActions>
      </Dialog>

      {/* ========================================================= */}
      {/* NOTIFICACIONES                                           */}
      {/* ========================================================= */}

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={6000}
        onClose={() => setToast('')}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right'
        }}
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={() => setToast('')}
          sx={{ width: '100%' }}
        >
          {toast}
        </Alert>
      </Snackbar>
    </>
  );
}
