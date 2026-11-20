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
    handleSaveModal
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
          ? 'Confirmación de anticipo'
          : modal === 'cancel'
            ? 'Cancelar solicitud'
            : '';

  const dialogDescription =
    modal === 'client'
      ? 'Registra la información de contacto del cliente.'
      : modal === 'booking'
        ? 'Organiza una nueva solicitud de reservación.'
        : modal === 'payment'
          ? 'Registra el anticipo recibido para confirmar el evento.'
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
          ? 'Registrar y confirmar'
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
        open={Boolean(modal) && !isDetailsModal}
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

                <Alert
                  severity="info"
                  sx={{ borderRadius: 2 }}
                >
                  Para confirmar la reservación debes
                  registrar un anticipo mínimo del 50 %
                  del total contratado.
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
                  </Stack>
                </Box>

                <TextField
                  label="Anticipo recibido (MXN)"
                  type="number"
                  required
                  fullWidth
                  value={paymentAmount}
                  onChange={(event) =>
                    setPaymentAmount(event.target.value)
                  }
                  helperText="Ingresa el importe recibido en pesos mexicanos."
                  slotProps={{
                    htmlInput: {
                      min:
                        selectedBooking.total_cents / 200,
                      max:
                        selectedBooking.total_cents / 100,
                      step: '0.01'
                    }
                  }}
                />
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
                (modal === 'booking' && !clients.length) ||
                ((modal === 'payment' || modal === 'cancel') &&
                  !selectedBooking)
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
                        Anticipo registrado
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
