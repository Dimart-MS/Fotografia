import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Avatar, Box, Button, Card, CardContent, Chip, CircularProgress,
  Dialog, DialogActions, DialogContent, DialogTitle, Divider, Drawer,
  IconButton, LinearProgress, Paper, Stack, TextField, Typography, useMediaQuery
} from '@mui/material';
import Icon from '../../ui-component/Icon';
import LogoutConfirmDialog from '../../ui-component/LogoutConfirmDialog';
import { studioRequest } from '../../api/httpClient';
import { fetchReservas } from '../../api/reservasService';
import { updateCliente } from '../../api/clientesService';
import {
  fetchMisComprobantes,
  fetchMisPagos,
  presentarComprobante
} from '../../api/pagosService';

// ==============================|| PORTAL DEL CLIENTE ||============================== //

const SECTIONS = [
  { id: 'reservas', label: 'Mis reservaciones', icon: 'calendar', description: 'Consulta las fechas y detalles de tus eventos.' },
  { id: 'pagos', label: 'Mis pagos', icon: 'wallet', description: 'Revisa los importes y saldos de tus reservaciones.' },
  { id: 'galeria', label: 'Mi galería', icon: 'image', description: 'Tus recuerdos estarán disponibles aquí cuando el estudio los publique.' },
  { id: 'perfil', label: 'Mis datos', icon: 'people', description: 'Consulta y actualiza tu información de contacto.' }
];

const PACKAGE_NAMES = {
  foto: 'Fotografía', video: 'Video', combinado: 'Fotografía y video'
};

const formatPrice = (cents = 0) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })
    .format((Number(cents) || 0) / 100);

function formatDate(value) {
  if (!value) return 'Fecha no disponible';
  const [year, month, day] = String(value).split('T')[0].split('-').map(Number);
  if (!year || !month || !day) return 'Fecha no disponible';
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric', month: 'long', year: 'numeric'
  }).format(new Date(year, month - 1, day));
}

const moneyValue = (value) => Math.max(Number(value) || 0, 0);
const isCancelled = (reservation) =>
  String(reservation.status || '').toLowerCase() === 'cancelada';

function ReservationStatus({ status }) {
  const normalized = String(status || '').toLowerCase();
  const palette = normalized === 'confirmada'
    ? { bg: '#E8F0E2', color: '#3B5C30' }
    : normalized === 'cancelada'
      ? { bg: '#F3E8E7', color: '#A34D4D' }
      : normalized === 'entregada'
        ? { bg: '#E8EFF4', color: '#456A85' }
        : { bg: '#F5EDE0', color: '#8A6536' };
  return <Chip size="small" label={status || 'Sin estado'} sx={{ bgcolor: palette.bg, color: palette.color, fontWeight: 700 }} />;
}

function EmptySection({ icon, title, description }) {
  return (
    <Box sx={{ py: 6, px: 2, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Box sx={{ width: 64, height: 64, borderRadius: '50%', bgcolor: '#EEF0E9', color: '#68745B', display: 'grid', placeItems: 'center', mb: 2 }}>
        <Icon name={icon} size={28} />
      </Box>
      <Typography variant="h6" sx={{ fontFamily: 'Georgia, serif', color: '#343B32' }}>{title}</Typography>
      <Typography variant="body2" sx={{ color: '#72766E', mt: 1, maxWidth: 440 }}>{description}</Typography>
    </Box>
  );
}

function MoneySummary({ title, amount, highlight = false }) {
  return (
    <Paper elevation={0} sx={{ p: 2.5, border: '1px solid #E2E5DD', borderRadius: 3, bgcolor: highlight ? '#F1F4EE' : '#FFFFFF' }}>
      <Typography variant="body2" color="text.secondary">{title}</Typography>
      <Typography variant="h5" sx={{ mt: 1, fontWeight: 700, color: '#354337', overflowWrap: 'anywhere' }}>{formatPrice(amount)}</Typography>
    </Paper>
  );
}

function MoneyLine({ label, value, strong = false }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
      <Typography variant="body2" color={strong ? 'text.primary' : 'text.secondary'} fontWeight={strong ? 700 : 400}>{label}</Typography>
      <Typography variant="body2" fontWeight={strong ? 700 : 600} sx={{ color: strong ? '#526047' : '#343B32' }}>{formatPrice(value)}</Typography>
    </Stack>
  );
}

export default function CustomerPortalView({
  session,
  onLogout,
  onNewReservation
}) {
  const [activeSection, setActiveSection] = useState('reservas');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const desktop = useMediaQuery('(min-width:900px)');
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [profileForm, setProfileForm] = useState({ name: '', email: '', phone: '', address: '' });
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [customerPayments, setCustomerPayments] = useState([]);
  const [customerProofs, setCustomerProofs] = useState([]);
  const [paymentError, setPaymentError] = useState('');
  const [paymentMessage, setPaymentMessage] = useState('');
  const [uploadReservation, setUploadReservation] = useState(null);
  const [proofFile, setProofFile] = useState(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [proofPreview, setProofPreview] = useState(null);

  useEffect(() => {
    if (!proofFile || !['image/jpeg', 'image/png'].includes(proofFile.type)) {
      setProofPreview(null);
      return;
    }

    const previewUrl = URL.createObjectURL(proofFile);
    setProofPreview(previewUrl);

    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [proofFile]);

  useEffect(() => {
    let active = true;
    async function loadCustomerData() {
      setLoading(true);
      setLoadError('');
      try {
        const [customerData, reservationData, paymentsData, proofsData] =
          await Promise.all([
            studioRequest(
              `/api/clientes/${session.user.client_id}`,
              { method: 'GET' },
              session.token
            ),
            fetchReservas(session.token),
            fetchMisPagos(session.token),
            fetchMisComprobantes(session.token)
          ]);
        if (!active) return;
        setCustomer(customerData);
        setReservations(Array.isArray(reservationData) ? reservationData : []);
        setCustomerPayments(Array.isArray(paymentsData) ? paymentsData : []);
        setCustomerProofs(Array.isArray(proofsData) ? proofsData : []);
        setProfileForm({
          name: customerData.name || '', email: customerData.email || '',
          phone: customerData.phone || '', address: customerData.address || ''
        });
      } catch (error) {
        if (active) setLoadError(error.message || 'No fue posible cargar tu información.');
      } finally {
        if (active) setLoading(false);
      }
    }
    loadCustomerData();
    return () => { active = false; };
  }, [session.token, session.user.client_id]);

  const activeReservations = useMemo(() => reservations.filter((r) => !isCancelled(r)), [reservations]);
  const paymentSummary = useMemo(() => activeReservations.reduce((acc, reservation) => ({
    total: acc.total + moneyValue(reservation.total_cents),
    paid: acc.paid + moneyValue(reservation.paid_cents)
  }), { total: 0, paid: 0 }), [activeReservations]);
  const pendingBalance = Math.max(paymentSummary.total - paymentSummary.paid, 0);
  const activeInfo = SECTIONS.find((section) => section.id === activeSection) || SECTIONS[0];
  const confirmedCount = reservations.filter((r) => String(r.status || '').toLowerCase() === 'confirmada').length;
  const pendingCount = reservations.filter((r) => String(r.status || '').toLowerCase().includes('pendiente')).length;
  const customerName = customer?.name || session?.user?.name || 'Cliente';
  const firstName = customerName.trim().split(/\s+/)[0];
  const sidebarWidth = 260;
  const selectSection = (id) => { setActiveSection(id); setMobileNavOpen(false); };
  const sidebar = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#FFFFFF' }}>
      <Box sx={{ px: 3, pt: 4, pb: 3, borderBottom: '1px solid #E2E5DD' }}>
        <Typography sx={{ fontFamily: 'Georgia, serif', fontSize: 24, color: '#343B32' }}>Luz &amp; Memoria</Typography>
        <Typography variant="caption" sx={{ letterSpacing: 2, color: '#68745B' }}>PORTAL DEL CLIENTE</Typography>
      </Box>
      <Box component="nav" aria-label="Navegación del cliente" sx={{ p: 2, flexGrow: 1 }}>
        <Typography variant="overline" sx={{ px: 2, color: '#879080', letterSpacing: 1.5 }}>MI ESPACIO</Typography>
        <Stack spacing={0.75} sx={{ mt: 1 }}>
          {SECTIONS.map((section) => {
            const active = section.id === activeSection;
            return (
              <Button key={section.id} fullWidth onClick={() => selectSection(section.id)} aria-current={active ? 'page' : undefined}
                startIcon={<Icon name={section.icon} size={19} />}
                sx={{
                  justifyContent: 'flex-start', textAlign: 'left', px: 2, py: 1.5, borderRadius: 2, textTransform: 'none',
                  fontWeight: active ? 700 : 500, bgcolor: active ? '#E9EDE4' : 'transparent',
                  color: active ? '#526047' : '#626B60',
                  '&:hover': { bgcolor: '#F1F4EE' },
                  '& .MuiButton-startIcon': { mr: 1.5 }
                }}>
                {section.label}
              </Button>
            );
          })}
        </Stack>
      </Box>
      <Box sx={{ p: 2, borderTop: '1px solid #E2E5DD' }}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ px: 1, pb: 2 }}>
          <Avatar sx={{ bgcolor: '#E9EDE4', color: '#526047', width: 40, height: 40 }}>{firstName.charAt(0).toUpperCase()}</Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" fontWeight={700} noWrap>{customerName}</Typography>
            <Typography variant="caption" color="text.secondary">Cuenta de cliente</Typography>
          </Box>
        </Stack>
        <Button fullWidth onClick={() => setLogoutDialogOpen(true)} startIcon={<Icon name="logout" />} sx={{ justifyContent: 'flex-start', color: '#526047', textTransform: 'none', px: 2 }}>Cerrar sesión</Button>
      </Box>
    </Box>
  );

  async function refreshPaymentData() {
    const [reservationData, paymentsData, proofsData] = await Promise.all([
      fetchReservas(session.token),
      fetchMisPagos(session.token),
      fetchMisComprobantes(session.token)
    ]);

    setReservations(Array.isArray(reservationData) ? reservationData : []);
    setCustomerPayments(Array.isArray(paymentsData) ? paymentsData : []);
    setCustomerProofs(Array.isArray(proofsData) ? proofsData : []);
  }

  function getReservationProofs(reservation) {
    return customerProofs.filter(
      (proof) => Number(proof.id_reservacion) === Number(reservation.id)
    );
  }

  function canUploadProof(reservation) {
    const status = String(reservation.status || '');
    const total = moneyValue(reservation.total_cents);
    const paid = moneyValue(reservation.paid_cents);

    if (!['Pendiente de anticipo', 'Confirmada'].includes(status)) {
      return false;
    }

    if (total <= 0 || paid >= total) {
      return false;
    }

    if (
      status === 'Pendiente de anticipo' &&
      reservation.decision_anticipo_pendiente === true
    ) {
      return false;
    }

    return !getReservationProofs(reservation).some(
      (proof) => proof.estado === 'Pendiente'
    );
  }

  function openProofUpload(reservation) {
    setUploadReservation(reservation);
    setProofFile(null);
    setPaymentError('');
    setPaymentMessage('');
  }

  function closeProofUpload() {
    if (uploadingProof) return;

    setUploadReservation(null);
    setProofFile(null);
    setPaymentError('');
  }

  async function handleProofUpload() {
    if (!uploadReservation || uploadingProof) return;

    setPaymentError('');

    if (!proofFile) {
      setPaymentError('Selecciona una imagen del comprobante.');
      return;
    }

    if (!['image/jpeg', 'image/png'].includes(proofFile.type)) {
      setPaymentError('Solo se permiten imágenes JPG o PNG.');
      return;
    }

    if (proofFile.size > 10 * 1024 * 1024 || proofFile.size === 0) {
      setPaymentError('La imagen debe tener un tamaño mayor que cero y no superar 10 MB.');
      return;
    }

    setUploadingProof(true);

    try {
      await presentarComprobante(
        {
          id_reservacion: uploadReservation.id,
          archivo: proofFile
        },
        session.token
      );

      setUploadReservation(null);
      setProofFile(null);
      setPaymentMessage(
        'Comprobante enviado correctamente. El administrador revisará ' +
        'la imagen y registrará el importe recibido.'
      );

      await refreshPaymentData();
    } catch (error) {
      setPaymentError(
        error.message || 'No fue posible enviar el comprobante.'
      );
    } finally {
      setUploadingProof(false);
    }
  }

  async function handleSaveProfile(event) {
    event.preventDefault();
    setProfileMessage('');
    setProfileError('');
    const name = profileForm.name.trim();
    const email = profileForm.email.trim();
    const phone = profileForm.phone.trim();
    const address = profileForm.address.trim();
    if (name.length < 3 || !email) {
      setProfileError('Escribe un nombre de al menos 3 caracteres y un correo válido.');
      return;
    }
    if (phone && !/^\d{10}$/.test(phone)) {
      setProfileError('El teléfono debe contener exactamente 10 dígitos.');
      return;
    }
    setSavingProfile(true);
    try {
      await updateCliente(session.user.client_id, { name, email, phone, address }, session.token);
      const customerData = await studioRequest(
        `/api/clientes/${session.user.client_id}`, { method: 'GET' }, session.token
      );
      setCustomer(customerData);
      setProfileForm({
        name: customerData.name || '', email: customerData.email || '',
        phone: customerData.phone || '', address: customerData.address || ''
      });
      setProfileMessage('Tus datos se actualizaron correctamente.');
    } catch (error) {
      setProfileError(error.message || 'No se pudieron guardar los cambios.');
    } finally {
      setSavingProfile(false);
    }
  }

  function renderReservations() {
    if (!reservations.length) return (
      <EmptySection icon="calendar" title="Todavía no tienes reservaciones" description="Cuando tengas una reservación registrada, aquí podrás consultar la fecha, el paquete y el estado de tu evento." />
    );
    return (
      <Stack spacing={2} sx={{ mt: 3 }}>
        {reservations.map((reservation) => {
          const total = moneyValue(reservation.total_cents);
          const paid = moneyValue(reservation.paid_cents);
          return (
            <Paper key={reservation.id} elevation={0} sx={{ p: { xs: 2, sm: 3 }, border: '1px solid #E2E5DD', borderRadius: 3 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} gap={2}>
                <Box>
                  <Typography variant="h6" sx={{ fontFamily: 'Georgia, serif', color: '#343B32' }}>{reservation.event_type || 'Evento'}</Typography>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1, color: '#68745B' }}>
                    <Icon name="calendar" size={18} />
                    <Typography variant="body2">{formatDate(reservation.event_date)}</Typography>
                  </Stack>
                  <Typography variant="body2" sx={{ mt: 1, color: '#72766E' }}>Paquete: {PACKAGE_NAMES[reservation.package] || reservation.package || 'No especificado'}</Typography>
                </Box>
                <Stack alignItems={{ xs: 'flex-start', sm: 'flex-end' }} spacing={1}>
                  <ReservationStatus status={reservation.status} />
                  <Typography variant="h6" sx={{ color: '#354337', fontWeight: 700 }}>{formatPrice(total)}</Typography>
                </Stack>
              </Stack>
              <Divider sx={{ my: 2 }} />
              <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between" gap={2}>
                <Box>
                  <Typography variant="body2" color="text.secondary">Anticipo registrado: <strong>{formatPrice(paid)}</strong></Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Saldo calculado: <strong>{formatPrice(Math.max(total - paid, 0))}</strong></Typography>
                </Box>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  {canUploadProof(reservation) && (
                    <Button
                      variant="contained"
                      onClick={() => openProofUpload(reservation)}
                      sx={{
                        bgcolor: '#68745B',
                        textTransform: 'none',
                        '&:hover': { bgcolor: '#526047' }
                      }}
                    >
                      Subir comprobante
                    </Button>
                  )}

                  <Button
                    variant="outlined"
                    onClick={() => setSelectedReservation(reservation)}
                    sx={{
                      borderColor: '#AAB8A1',
                      color: '#526047',
                      textTransform: 'none'
                    }}
                  >
                    Ver detalles
                  </Button>
                </Stack>
              </Stack>
              {getReservationProofs(reservation).some(
                (proof) => proof.estado === 'Pendiente'
              ) && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    Tienes un comprobante pendiente de revisión.
                    Podrás enviar otro cuando el administrador lo revise,
                    siempre que exista saldo pendiente.
                  </Alert>
                )}
            </Paper>
          );
        })}
      </Stack>
    );
  }

  function renderPayments() {
    if (!reservations.length) return (
      <EmptySection icon="wallet" title="No hay información de pagos" description="Cuando tengas una reservación, podrás consultar aquí el total contratado, los anticipos y el saldo calculado." />
    );
    return (
      <Stack spacing={3} sx={{ mt: 3 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' }, gap: 2 }}>
          <MoneySummary title="Total contratado" amount={paymentSummary.total} />
          <MoneySummary title="Anticipos registrados" amount={paymentSummary.paid} />
          <MoneySummary title="Saldo calculado" amount={pendingBalance} highlight />
        </Box>
        <Typography variant="body2" color="text.secondary">Resumen de reservaciones no canceladas. Los importes de reservaciones canceladas no se incluyen en estos totales.</Typography>
        <Box>
          <Typography variant="h6" sx={{ fontFamily: 'Georgia, serif', color: '#343B32', mb: 2 }}>Desglose por reservación</Typography>
          {reservations.map((reservation) => {
            const total = moneyValue(reservation.total_cents);
            const paid = moneyValue(reservation.paid_cents);
            return (
              <Paper key={reservation.id} elevation={0} sx={{ p: 2.5, mb: 2, border: '1px solid #E2E5DD', borderRadius: 3 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} gap={1} sx={{ mb: 2 }}>
                  <Box>
                    <Typography fontWeight={700}>{reservation.event_type || 'Evento'}</Typography>
                    <Typography variant="caption" color="text.secondary">{formatDate(reservation.event_date)}</Typography>
                  </Box>
                  <ReservationStatus status={reservation.status} />
                </Stack>
                <Stack spacing={1}>
                  <MoneyLine label="Total del paquete" value={total} />
                  <MoneyLine label="Anticipo registrado" value={paid} />
                  <Divider />
                  <MoneyLine label="Saldo calculado" value={Math.max(total - paid, 0)} strong />
                </Stack>
                {isCancelled(reservation) && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>Reservación cancelada: este importe no se suma al resumen general. No representa una solicitud de pago.</Typography>}
              </Paper>
            );
          })}
        </Box>
        <Box>
          <Typography
            variant="h6"
            sx={{
              fontFamily: 'Georgia, serif',
              color: '#343B32',
              mb: 2
            }}
          >
            Historial de comprobantes
          </Typography>

          {customerProofs.length === 0 ? (
            <Alert severity="info">
              Todavía no has presentado comprobantes de transferencia.
            </Alert>
          ) : (
            <Stack spacing={2}>
              {customerProofs.map((proof) => {
                const payment = customerPayments.find(
                  (item) => Number(item.id_pago) === Number(proof.id_pago)
                );

                const amount = payment?.monto_centavos ?? proof.monto_centavos;

                return (
                  <Paper
                    key={proof.id_comprobante}
                    elevation={0}
                    sx={{
                      p: 2,
                      border: '1px solid #E2E5DD',
                      borderRadius: 2
                    }}
                  >
                    <Stack spacing={1}>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        flexWrap="wrap"
                        gap={1}
                      >
                        <Typography fontWeight={700}>
                          Comprobante #{proof.id_comprobante}
                        </Typography>

                        <Chip
                          size="small"
                          label={proof.estado}
                          color={
                            proof.estado === 'Aprobado'
                              ? 'success'
                              : proof.estado === 'Rechazado'
                                ? 'error'
                                : 'warning'
                          }
                        />
                      </Stack>

                      <Typography variant="body2">
                        Reservación #{proof.id_reservacion}
                      </Typography>

                      <Typography variant="body2" color="text.secondary">
                        {proof.estado === 'Aprobado' && amount != null
                          ? `Importe aprobado: ${formatPrice(amount)}`
                          : 'Importe pendiente de validación'}
                      </Typography>

                      {proof.estado === 'Rechazado' && (
                        <Alert severity="error">
                          <strong>Motivo del rechazo:</strong>{' '}
                          {proof.motivo_rechazo || 'No disponible'}
                        </Alert>
                      )}
                    </Stack>
                  </Paper>
                );
              })}
            </Stack>
          )}
        </Box>
      </Stack>
    );
  }

  function renderGallery() {
    return <EmptySection icon="image" title="Tu galería estará aquí" description="Cuando el estudio publique las fotografías y los videos de tu evento, podrás consultarlos desde este espacio. Por ahora no hay contenido disponible en el portal." />;
  }

  function renderProfile() {
    return (
      <Box component="form" onSubmit={handleSaveProfile} sx={{ mt: 3 }}>
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
          <Avatar sx={{ bgcolor: '#E9EDE4', color: '#526047', width: 54, height: 54 }}>{(customer?.name || 'C').trim().charAt(0).toUpperCase()}</Avatar>
          <Box>
            <Typography fontWeight={700}>{customer?.name || 'Mi cuenta'}</Typography>
            <Typography variant="body2" color="text.secondary">Actualiza tu información de contacto</Typography>
          </Box>
        </Stack>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 2.5 }}>
          <TextField required label="Nombre completo" value={profileForm.name} onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))} slotProps={{ htmlInput: { minLength: 3, maxLength: 100 } }} fullWidth />
          <TextField required type="email" label="Correo electrónico" value={profileForm.email} onChange={(e) => setProfileForm((prev) => ({ ...prev, email: e.target.value }))} slotProps={{ htmlInput: { maxLength: 160 } }} fullWidth />
          <TextField label="Teléfono (10 dígitos)" value={profileForm.phone} onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))} slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 10 } }} fullWidth />
          <TextField label="Domicilio de entrega" value={profileForm.address} onChange={(e) => setProfileForm((prev) => ({ ...prev, address: e.target.value }))} slotProps={{ htmlInput: { maxLength: 250 } }} fullWidth multiline minRows={2} />
        </Box>
        {profileError && <Alert severity="error" sx={{ mt: 2 }}>{profileError}</Alert>}
        {profileMessage && <Alert severity="success" sx={{ mt: 2 }}>{profileMessage}</Alert>}
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="flex-end" sx={{ mt: 3 }}>
          <Button type="submit" variant="contained" disabled={savingProfile || loading || Boolean(loadError)} startIcon={savingProfile ? <CircularProgress size={16} color="inherit" /> : null} sx={{ bgcolor: '#68745B', textTransform: 'none', '&:hover': { bgcolor: '#526047' } }}>
            {savingProfile ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F6F7F3', display: 'flex' }}>
      {desktop ? (
        <Box component="aside" sx={{ width: sidebarWidth, flexShrink: 0, borderRight: '1px solid #E2E5DD', bgcolor: '#FFFFFF' }}>
          <Box sx={{ position: 'sticky', top: 0, height: '100vh' }}>{sidebar}</Box>
        </Box>
      ) : (
        <Drawer open={mobileNavOpen} onClose={() => setMobileNavOpen(false)}
          slotProps={{ paper: { sx: { width: sidebarWidth } } }}>{sidebar}</Drawer>
      )}

      <Box component="main" sx={{ flex: 1, minWidth: 0 }}>
        <Box component="header" sx={{
          bgcolor: '#FFFFFF', borderBottom: '1px solid #E2E5DD', px: { xs: 2, sm: 3, lg: 5 }, py: 2,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2
        }}>
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
            {!desktop && <IconButton onClick={() => setMobileNavOpen(true)} aria-label="Abrir menú"><Icon name="menu" /></IconButton>}
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" sx={{ color: '#818A7B' }}>Luz &amp; Memoria / Mi espacio</Typography>
              <Typography fontWeight={700} sx={{ color: '#343B32' }}>{activeInfo.label}</Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <Avatar sx={{ width: 36, height: 36, bgcolor: '#E9EDE4', color: '#526047' }}>{firstName.charAt(0).toUpperCase()}</Avatar>
            {desktop && <Typography variant="body2" fontWeight={600} sx={{ color: '#526047' }}>{firstName}</Typography>}
          </Stack>
        </Box>

        <Box sx={{ px: { xs: 2, sm: 3, lg: 5 }, py: { xs: 3, md: 4 }, maxWidth: 1500, mx: 'auto' }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="overline" sx={{ color: '#68745B', letterSpacing: 2 }}>ESPACIO DEL CLIENTE</Typography>
            <Typography variant="h4" sx={{ fontFamily: 'Georgia, serif', color: '#343B32', mt: 0.5, fontSize: { xs: 27, md: 34 } }}>
              {activeSection === 'reservas' ? `Bienvenido, ${firstName}` : activeInfo.label}
            </Typography>
            <Typography variant="body2" sx={{ color: '#72796D', mt: 1 }}>{activeInfo.description}</Typography>
          </Box>

          {loading && <LinearProgress sx={{ mb: 2, '& .MuiLinearProgress-bar': { bgcolor: '#68745B' } }} />}
          {loadError && <Alert severity="error" sx={{ mb: 2 }}>{loadError}</Alert>}

          {paymentMessage && (
            <Alert
              severity="success"
              onClose={() => setPaymentMessage('')}
              sx={{ mb: 2 }}
            >
              {paymentMessage}
            </Alert>
          )}

          {!loading && !loadError && activeSection === 'reservas' && (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' }, gap: 2, mb: 3 }}>
              {[
                { title: 'Total de reservaciones', value: reservations.length, icon: 'calendar' },
                { title: 'Eventos confirmados', value: confirmedCount, icon: 'check' },
                { title: 'Pendientes de anticipo', value: pendingCount, icon: 'wallet' }
              ].map((stat) => (
                <Paper key={stat.title} elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #E2E5DD', bgcolor: '#FFFFFF' }}>
                  <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={2}>
                    <Box>
                      <Typography variant="body2" sx={{ color: '#72796D' }}>{stat.title}</Typography>
                      <Typography variant="h3" sx={{ color: '#354337', fontWeight: 700, mt: 1 }}>{stat.value}</Typography>
                    </Box>
                    <Box sx={{ width: 44, height: 44, flexShrink: 0, borderRadius: 2, bgcolor: '#E9EDE4', color: '#68745B', display: 'grid', placeItems: 'center' }}>
                      <Icon name={stat.icon} size={22} />
                    </Box>
                  </Stack>
                </Paper>
              ))}
            </Box>
          )}

          <Paper elevation={0} sx={{
            border: '1px solid #E2E5DD', borderRadius: 3, bgcolor: '#FFFFFF', minHeight: 300,
            p: { xs: 2, sm: 3 }
          }}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              justifyContent="space-between"
              alignItems={{ xs: 'stretch', sm: 'center' }}
              spacing={2}
            >
              <Box>
                <Typography
                  variant="h5"
                  sx={{
                    fontFamily: 'Georgia, serif',
                    color: '#343B32'
                  }}
                >
                  {activeInfo.label}
                </Typography>

                <Typography
                  variant="body2"
                  sx={{
                    color: '#72796D',
                    mt: 0.5
                  }}
                >
                  {activeInfo.description}
                </Typography>
              </Box>

              {activeSection === 'reservas' && (
                <Button
                  variant="contained"
                  onClick={onNewReservation}
                  startIcon={<Icon name="plus" size={18} />}
                  sx={{
                    bgcolor: '#284C40',
                    color: '#FFFFFF',
                    borderRadius: 2,
                    px: 3,
                    py: 1.2,
                    textTransform: 'none',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    boxShadow: 'none',
                    '&:hover': {
                      bgcolor: '#1E3D33',
                      boxShadow: 'none'
                    }
                  }}
                >
                  Nueva reservación
                </Button>
              )}
            </Stack>
            {!loading && !loadError && (
              activeSection === 'reservas' ? renderReservations()
                : activeSection === 'pagos' ? renderPayments()
                  : activeSection === 'galeria' ? renderGallery()
                    : renderProfile()
            )}
            {loading && <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>Cargando tu información...</Typography>}
          </Paper>
          <Typography variant="caption" sx={{ display: 'block', mt: 3, textAlign: 'center', color: '#888' }}>
            Luz &amp; Memoria · Cada historia merece ser recordada.
          </Typography>
        </Box>
      </Box>

      <Dialog
        open={Boolean(uploadReservation)}
        onClose={closeProofUpload}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Subir comprobante de transferencia</DialogTitle>

        <DialogContent dividers>
          <Stack spacing={2}>
            <Typography variant="body2">
              Reservación #{uploadReservation?.id}
            </Typography>

            <Alert severity="info">
              Adjunta la imagen de tu transferencia bancaria.
              No necesitas introducir ninguna cantidad.
              El administrador verificará el importe recibido.
            </Alert>

            {uploadReservation && (
              <Stack spacing={1}>
                <MoneyLine
                  label="Total contratado"
                  value={moneyValue(uploadReservation.total_cents)}
                />
                <MoneyLine
                  label="Pagos registrados"
                  value={moneyValue(uploadReservation.paid_cents)}
                />
                <Divider />
                <MoneyLine
                  label="Saldo pendiente"
                  value={Math.max(
                    moneyValue(uploadReservation.total_cents) -
                    moneyValue(uploadReservation.paid_cents),
                    0
                  )}
                  strong
                />
              </Stack>
            )}

            <Button
              component="label"
              variant="outlined"
              disabled={uploadingProof}
              sx={{
                color: '#526047',
                borderColor: '#AAB8A1',
                textTransform: 'none'
              }}
            >
              Seleccionar imagen JPG o PNG
              <input
                type="file"
                accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                hidden
                disabled={uploadingProof}
                onChange={(event) => {
                  const file = event.target.files?.[0] || null;

                  setProofFile(file);
                  setPaymentError('');

                  // Permite volver a seleccionar el mismo archivo.
                  event.target.value = '';
                }}
              />
            </Button>

            {proofFile && (
              <Stack spacing={2}>
                <Box
                  sx={{
                    border: '1px solid #E2E5DD',
                    borderRadius: 2,
                    p: 2,
                    bgcolor: '#F8F9F6'
                  }}
                >
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Vista previa del comprobante
                  </Typography>

                  <Box
                    component="img"
                    src={proofPreview}
                    alt="Vista previa del comprobante seleccionado"
                    sx={{
                      display: 'block',
                      width: '100%',
                      maxHeight: 320,
                      objectFit: 'contain',
                      borderRadius: 1
                    }}
                  />

                  <Typography
                    variant="body2"
                    sx={{ mt: 1, overflowWrap: 'anywhere' }}
                  >
                    {proofFile.name}
                  </Typography>
                </Box>

                <Button
                  variant="outlined"
                  color="error"
                  disabled={uploadingProof}
                  onClick={() => {
                    setProofFile(null);
                    setPaymentError('');
                  }}
                  sx={{ alignSelf: 'flex-start', textTransform: 'none' }}
                >
                  Quitar imagen
                </Button>
              </Stack>
            )}

            {paymentError && (
              <Alert severity="error">{paymentError}</Alert>
            )}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={closeProofUpload}
            disabled={uploadingProof}
          >
            Cancelar
          </Button>

          <Button
            variant="contained"
            onClick={handleProofUpload}
            disabled={!proofFile || uploadingProof}
            sx={{
              bgcolor: '#68745B',
              '&:hover': { bgcolor: '#526047' }
            }}
          >
            {uploadingProof ? 'Enviando...' : 'Enviar comprobante'}
          </Button>
        </DialogActions>
      </Dialog>

      <LogoutConfirmDialog
        open={logoutDialogOpen}
        onClose={() => setLogoutDialogOpen(false)}
        onConfirm={onLogout}
      />
      <Dialog open={Boolean(selectedReservation)} onClose={() => setSelectedReservation(null)} fullWidth maxWidth="sm" scroll="paper" slotProps={{ paper: { sx: { borderRadius: 3, maxHeight: 'calc(100dvh - 32px)' } } }}>
        {selectedReservation && (() => {
          const total = moneyValue(selectedReservation.total_cents);
          const paid = moneyValue(selectedReservation.paid_cents);
          const balance = Math.max(total - paid, 0);
          const progress = total > 0 ? Math.min((paid / total) * 100, 100) : 0;
          return (
            <>
              <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
                <Box>
                  <Typography variant="overline" sx={{ color: '#68745B', letterSpacing: 2 }}>LUZ &amp; MEMORIA</Typography>
                  <Typography variant="h5" sx={{ fontFamily: 'Georgia, serif', color: '#343B32' }}>Detalles de reservación</Typography>
                </Box>
                <IconButton aria-label="Cerrar detalles" onClick={() => setSelectedReservation(null)}><Icon name="x" /></IconButton>
              </DialogTitle>
              <DialogContent dividers sx={{ p: { xs: 2.5, sm: 3 } }}>
                <Stack spacing={3}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2} flexWrap="wrap">
                    <Typography variant="h6" sx={{ fontFamily: 'Georgia, serif', color: '#343B32' }}>{selectedReservation.event_type || 'Evento'}</Typography>
                    <ReservationStatus status={selectedReservation.status} />
                  </Stack>
                  <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, bgcolor: '#F8F6F0' }}>
                    <Stack spacing={2}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Fecha del evento</Typography>
                        <Typography fontWeight={600}>{formatDate(selectedReservation.event_date)}</Typography>
                      </Box>
                      <Divider />
                      <Box>
                        <Typography variant="caption" color="text.secondary">Paquete contratado</Typography>
                        <Typography fontWeight={600}>{PACKAGE_NAMES[selectedReservation.package] || selectedReservation.package || 'No especificado'}</Typography>
                      </Box>
                    </Stack>
                  </Paper>
                  <Box>
                    <Typography variant="h6" sx={{ fontFamily: 'Georgia, serif', color: '#343B32', mb: 2 }}>Información de pago</Typography>
                    <Stack spacing={1.5}>
                      <MoneyLine label="Total del paquete" value={total} />
                      <MoneyLine label="Anticipo registrado" value={paid} />
                      <Divider />
                      <MoneyLine label="Saldo calculado" value={balance} strong />
                      <Box sx={{ pt: 1 }}>
                        <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                          <Typography variant="caption" color="text.secondary">Avance de pago</Typography>
                          <Typography variant="caption" fontWeight={700} sx={{ color: '#526047' }}>{Math.round(progress)}%</Typography>
                        </Stack>
                        <LinearProgress variant="determinate" value={progress} sx={{ height: 9, borderRadius: 5, bgcolor: '#E9EDE4', '& .MuiLinearProgress-bar': { bgcolor: '#879174', borderRadius: 5 } }} />
                      </Box>
                    </Stack>
                  </Box>
                  {isCancelled(selectedReservation) && <Alert severity="info">Esta reservación fue cancelada. Los importes se conservan como información histórica; el saldo mostrado no representa una solicitud de pago.</Alert>}
                  <Alert severity="info">
                    Los importes corresponden a los pagos registrados y aprobados
                    en el sistema. Puedes consultar el estado de tus comprobantes
                    en la sección «Mis pagos».
                  </Alert>
                </Stack>
              </DialogContent>
              <DialogActions sx={{ p: 2.5 }}>
                <Button variant="contained" onClick={() => setSelectedReservation(null)} sx={{ bgcolor: '#68745B', '&:hover': { bgcolor: '#526047' } }}>Cerrar</Button>
              </DialogActions>
            </>
          );
        })()}
      </Dialog>
    </Box>
  );
}
