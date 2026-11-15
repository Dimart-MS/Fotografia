import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Snackbar,
  TextField
} from '@mui/material';
import { EVENT_TYPES } from '../../config';
import { formatMoney, formatPrettyDate, getLocalToday } from '../../utils/formatters';
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
    clients,
    packages,
    selectedBooking,
    paymentAmount,
    setPaymentAmount,
    handleSaveModal
  } = useStudio();

  const selectedPackage = packages.find((pkg) => pkg.id === form.package);

  const dialogHeading =
    modal === 'client'
      ? 'Registrar nuevo cliente'
      : modal === 'booking'
        ? 'Nueva solicitud de reserva'
        : modal === 'payment'
          ? 'Confirmación de anticipo'
          : 'Cancelar solicitud';

  const submitButtonLabel = saving
    ? 'Guardando…'
    : modal === 'client'
      ? 'Guardar cliente'
      : modal === 'booking'
        ? 'Crear solicitud'
        : modal === 'payment'
          ? 'Registrar y confirmar'
          : 'Cancelar solicitud';

  return (
    <>
      <Dialog open={Boolean(modal)} onClose={closeModal} fullWidth maxWidth="sm">
        <form onSubmit={handleSaveModal}>
          <DialogTitle>
            <span className="eyebrow">LUZ &amp; MEMORIA</span>
            <span className="dialog-heading">{dialogHeading}</span>
          </DialogTitle>

          <DialogContent>
            <div className="form-fields">
              {modal === 'client' && (
                <>
                  <p>Captura los datos de contacto y dirección de entrega del cliente.</p>
                  <TextField
                    label="Nombre completo"
                    required
                    value={form.name || ''}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    slotProps={{ htmlInput: { minLength: 3, maxLength: 100 } }}
                  />
                  <div className="form-row">
                    <TextField
                      label="Correo electrónico"
                      type="email"
                      required
                      value={form.email || ''}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      slotProps={{ htmlInput: { maxLength: 160 } }}
                    />
                    <TextField
                      label="Teléfono de 10 dígitos"
                      required
                      value={form.phone || ''}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      slotProps={{
                        htmlInput: {
                          pattern: '[0-9]{10}',
                          maxLength: 10,
                          inputMode: 'numeric'
                        }
                      }}
                    />
                  </div>
                  <TextField
                    label="Domicilio de entrega"
                    required
                    multiline
                    rows={2}
                    value={form.address || ''}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    slotProps={{ htmlInput: { minLength: 5, maxLength: 250 } }}
                  />
                </>
              )}

              {modal === 'booking' && (
                <>
                  <p>
                    La solicitud se registrará como pendiente y apartará la fecha
                    al confirmar un anticipo mínimo del 50 %.
                  </p>
                  <TextField
                    select
                    label="Cliente"
                    required
                    value={form.client_id || ''}
                    onChange={(e) =>
                      setForm({ ...form, client_id: e.target.value })
                    }
                  >
                    {clients.map((client) => (
                      <MenuItem key={client.id} value={client.id}>
                        {client.name}
                      </MenuItem>
                    ))}
                  </TextField>

                  <div className="form-row">
                    <TextField
                      type="date"
                      label="Fecha del evento"
                      required
                      value={form.event_date || ''}
                      onChange={(e) =>
                        setForm({ ...form, event_date: e.target.value })
                      }
                      slotProps={{
                        inputLabel: { shrink: true },
                        htmlInput: { min: getLocalToday() }
                      }}
                    />
                    <TextField
                      select
                      label="Tipo de evento"
                      value={form.event_type || 'Boda'}
                      onChange={(e) =>
                        setForm({ ...form, event_type: e.target.value })
                      }
                    >
                      {EVENT_TYPES.map((eventType) => (
                        <MenuItem key={eventType} value={eventType}>
                          {eventType}
                        </MenuItem>
                      ))}
                    </TextField>
                  </div>

                  <TextField
                    select
                    label="Paquete"
                    value={form.package || 'foto'}
                    onChange={(e) =>
                      setForm({ ...form, package: e.target.value })
                    }
                  >
                    {packages.map((pkg) => (
                      <MenuItem key={pkg.id} value={pkg.id}>
                        {pkg.name} · {formatMoney(pkg.price_cents)}
                      </MenuItem>
                    ))}
                  </TextField>

                  {selectedPackage && (
                    <div className="price-summary">
                      <div>
                        <span>Total del paquete</span>
                        <strong>{formatMoney(selectedPackage.price_cents)}</strong>
                      </div>
                      <div>
                        <span>Anticipo mínimo (50 %)</span>
                        <strong>
                          {formatMoney(selectedPackage.price_cents / 2)}
                        </strong>
                      </div>
                      <small>Importes expresados en pesos mexicanos (MXN).</small>
                    </div>
                  )}
                </>
              )}

              {modal === 'payment' && selectedBooking && (
                <>
                  <p>
                    <strong>{selectedBooking.client_name}</strong>
                    <br />
                    {formatPrettyDate(selectedBooking.event_date)} ·{' '}
                    {selectedBooking.event_type}
                  </p>
                  <Alert severity="info">
                    Confirma el monto recibido para bloquear la fecha en el
                    calendario del estudio.
                  </Alert>
                  <TextField
                    label="Anticipo recibido en MXN"
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    required
                    slotProps={{
                      htmlInput: {
                        min: selectedBooking.total_cents / 200,
                        max: selectedBooking.total_cents / 100,
                        step: '.01'
                      }
                    }}
                  />
                  <p>
                    Mínimo requerido: {formatMoney(selectedBooking.total_cents / 2)} ·
                    Total del paquete: {formatMoney(selectedBooking.total_cents)}
                  </p>
                </>
              )}

              {modal === 'cancel' && (
                <p>
                  Se cancelará la solicitud de{' '}
                  <strong>{selectedBooking?.client_name}</strong> programada para el{' '}
                  {selectedBooking && formatPrettyDate(selectedBooking.event_date)}
                  . El registro permanecerá en el historial.
                </p>
              )}

              {error && <Alert severity="error">{error}</Alert>}
            </div>
          </DialogContent>

          <DialogActions>
            <Button onClick={closeModal} disabled={saving}>
              Volver
            </Button>
            <Button
              variant="contained"
              type="submit"
              disabled={saving || (modal === 'booking' && !clients.length)}
            >
              {submitButtonLabel}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={6000}
        onClose={() => setToast('')}
      >
        <Alert severity="success" onClose={() => setToast('')}>
          {toast}
        </Alert>
      </Snackbar>
    </>
  );
}
