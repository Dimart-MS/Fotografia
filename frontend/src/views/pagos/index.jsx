
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
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

import Icon from '../../ui-component/Icon';
import EmptyState from '../../ui-component/EmptyState';
import useStudio from '../../hooks/useStudio';

import {
    aprobarComprobante,
    fetchArchivoComprobante,
    fetchComprobantesPendientes,
    fetchPagos,
    rechazarComprobante
} from '../../api/pagosService';

const COLORS = {
    primary: '#68745B',
    primaryHover: '#59634B',
    dark: '#343B32',
    muted: '#72796D',
    border: '#E2E5DD',
    soft: '#E9EDE4',
    header: '#F1F4EE'
};

function formatAmount(cents) {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
    }).format(Number(cents || 0) / 100);
}

function getReservationTotal(bookings, reservationId) {
    const reservation = bookings.find(
        (booking) => Number(booking.id) === Number(reservationId)
    );

    if (!reservation || reservation.total_cents == null) {
        return 'No disponible';
    }

    return formatAmount(reservation.total_cents);
}

function getReservationPaid(bookings, reservationId) {
    const reservation = bookings.find(
        (booking) => Number(booking.id) === Number(reservationId)
    );

    if (!reservation || reservation.paid_cents == null) {
        return 'No disponible';
    }

    return formatAmount(reservation.paid_cents);
}

function getReservationBalance(bookings, reservationId) {
    const reservation = bookings.find(
        (booking) => Number(booking.id) === Number(reservationId)
    );

    if (
        !reservation ||
        reservation.total_cents == null ||
        reservation.paid_cents == null
    ) {
        return 'No disponible';
    }

    const balance = Math.max(
        0,
        Number(reservation.total_cents) - Number(reservation.paid_cents)
    );

    return formatAmount(balance);
}

function formatDate(value) {
    if (!value) return 'No disponible';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return 'No disponible';
    }

    return new Intl.DateTimeFormat('es-MX', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'America/Mexico_City'
    }).format(date);
}

function PaymentStatus({ status }) {
    const colors = {
        Pendiente: {
            background: '#FFF4DC',
            foreground: '#93621E'
        },
        Aprobado: {
            background: '#E9EDE4',
            foreground: '#526047'
        },
        Rechazado: {
            background: '#FCEBE9',
            foreground: '#A34D4D'
        }
    };

    const selected = colors[status] || {
        background: '#F1F1F1',
        foreground: '#555555'
    };

    return (
        <Chip
            label={status || 'Sin estado'}
            size="small"
            sx={{
                bgcolor: selected.background,
                color: selected.foreground,
                fontWeight: 600
            }}
        />
    );
}

function IndicatorCard({ title, value, icon }) {
    return (
        <Paper
            elevation={0}
            sx={{
                p: 3,
                borderRadius: 3,
                border: `1px solid ${COLORS.border}`,
                bgcolor: '#FFFFFF'
            }}
        >
            <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="flex-start"
            >
                <Box>
                    <Typography
                        variant="body2"
                        sx={{ color: COLORS.muted }}
                    >
                        {title}
                    </Typography>

                    <Typography
                        variant="h3"
                        sx={{
                            fontWeight: 700,
                            color: '#354337',
                            mt: 1
                        }}
                    >
                        {value}
                    </Typography>
                </Box>

                <Box
                    sx={{
                        width: 44,
                        height: 44,
                        borderRadius: 2,
                        bgcolor: COLORS.soft,
                        color: COLORS.primary,
                        display: 'grid',
                        placeItems: 'center'
                    }}
                >
                    <Icon name={icon} size={22} />
                </Box>
            </Stack>
        </Paper>
    );
}

export default function PagosView() {
    const {
        accessKey,
        bookings,
        navigateToPage,
        setToast,
        refreshStudioData,
        notifyDataChanged
    } = useStudio();

    const [payments, setPayments] = useState([]);
    const [pendingProofs, setPendingProofs] = useState([]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('Todos');

    const [selectedProof, setSelectedProof] = useState(null);
    const [proofUrl, setProofUrl] = useState('');
    const [proofLoading, setProofLoading] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [verifiedAmount, setVerifiedAmount] = useState('');

    const loadData = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const [paymentsData, proofsData] = await Promise.all([
                fetchPagos(accessKey),
                fetchComprobantesPendientes(accessKey)
            ]);

            setPayments(Array.isArray(paymentsData) ? paymentsData : []);
            setPendingProofs(Array.isArray(proofsData) ? proofsData : []);
        } catch (err) {
            setError(
                err.message || 'No se pudieron cargar los pagos.'
            );
        } finally {
            setLoading(false);
        }
    }, [accessKey]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const filteredPayments = useMemo(() => {
        const query = search.trim().toLowerCase();

        return payments.filter((payment) => {
            const text = [
                payment.id_pago,
                payment.id_reservacion,
                payment.nombre_cliente,
                payment.metodo_pago,
                payment.referencia
            ]
                .filter((value) => value != null)
                .join(' ')
                .toLowerCase();

            const matchesSearch = text.includes(query);
            const matchesStatus =
                statusFilter === 'Todos' ||
                payment.estado === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [payments, search, statusFilter]);

    const totalApproved = payments.filter(
        (payment) => payment.estado === 'Aprobado'
    ).length;

    const totalRejected = payments.filter(
        (payment) => payment.estado === 'Rechazado'
    ).length;

    const reservationsRequiringDecision = bookings.filter(
        (booking) =>
            booking.status === 'Pendiente de anticipo' &&
            booking.decision_anticipo_pendiente === true
    );

    const openProof = async (proof) => {
        setSelectedProof(proof);
        setProofUrl('');
        setRejectReason('');
        setVerifiedAmount('');
        setProofLoading(true);
        setError('');

        try {
            const result = await fetchArchivoComprobante(
                proof.id_comprobante,
                accessKey
            );

            setProofUrl(result?.url || '');
        } catch (err) {
            setError(
                err.message || 'No se pudo consultar el comprobante.'
            );
        } finally {
            setProofLoading(false);
        }
    };

    const closeProof = () => {
        if (saving) return;

        setSelectedProof(null);
        setProofUrl('');
        setRejectReason('');
    };

    const reviewProof = async (approve) => {
        if (!selectedProof || saving) return;

        if (!approve && !rejectReason.trim()) {
            setError('Debes indicar el motivo del rechazo.');
            return;
        }

        const amountText = verifiedAmount.trim();
        const validAmount =
            /^\d+(?:\.\d{1,2})?$/.test(amountText) &&
            Number.isFinite(Number(amountText)) &&
            Number(amountText) > 0;

        if (approve && !validAmount) {
            setError(
                'Introduce un importe válido mayor que cero, ' +
                'con un máximo de dos decimales.'
            );
            return;
        }

        setSaving(true);
        setError('');

        try {
            let result;

            if (approve) {
                result = await aprobarComprobante(
                    selectedProof.id_comprobante,
                    amountText,
                    accessKey
                );
            } else {
                result = await rechazarComprobante(
                    selectedProof.id_comprobante,
                    rejectReason,
                    accessKey
                );
            }

            closeProofAfterReview();

            if (approve) {
                const saldo = Number(result?.saldo_centavos);
                const estado = result?.estado_reservacion;

                if (estado === 'Confirmada' && saldo === 0) {
                    setToast(
                        'Comprobante aprobado. La reservación ' +
                        'ha quedado completamente liquidada.'
                    );
                } else if (estado === 'Confirmada') {
                    setToast(
                        'Abono aprobado. La reservación está confirmada ' +
                        'y todavía tiene saldo pendiente.'
                    );
                } else {
                    setToast(
                        'Abono aprobado. La reservación continúa ' +
                        'pendiente de completar el anticipo mínimo.'
                    );
                }
            } else {
                setToast(
                    'Comprobante rechazado. Se registró el motivo.'
                );
            }

            await Promise.all([
                loadData(),
                refreshStudioData()
            ]);

            notifyDataChanged();
        } catch (err) {
            setError(
                err.message || 'No se pudo revisar el comprobante.'
            );
        } finally {
            setSaving(false);
        }
    };

    const closeProofAfterReview = () => {
        setSelectedProof(null);
        setProofUrl('');
        setRejectReason('');
    };

    return (
        <Box sx={{ pb: 5 }}>
            <Alert
                severity="info"
                sx={{
                    mb: 3,
                    borderRadius: 2,
                    bgcolor: '#EEF2EA',
                    color: '#343B32',
                    '& .MuiAlert-icon': {
                        color: '#68745B'
                    }
                }}
            >
                <strong>Proceso de validación de pagos y abonos</strong>
                <br />
                Los clientes presentan sus comprobantes desde su portal,
                sin introducir cantidades.
                El administrador revisa la imagen, registra el importe
                verificado y aprueba o rechaza el comprobante.
                <br />
                Los abonos aprobados se acumulan. La reservación y su venta
                se confirman al alcanzar el anticipo mínimo requerido.
                Después pueden registrarse más abonos hasta liquidar el total.
            </Alert>
            {/* INDICADORES */}
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                        xs: '1fr',
                        sm: 'repeat(2, minmax(0, 1fr))',
                        lg: 'repeat(4, minmax(0, 1fr))'
                    },
                    gap: 2,
                    mb: 3
                }}
            >
                <IndicatorCard
                    title="Total de pagos"
                    value={payments.length}
                    icon="check"
                />

                <IndicatorCard
                    title="Pendientes de revisión"
                    value={pendingProofs.length}
                    icon="calendar"
                />

                <IndicatorCard
                    title="Pagos aprobados"
                    value={totalApproved}
                    icon="check"
                />

                <IndicatorCard
                    title="Pagos rechazados"
                    value={totalRejected}
                    icon="x"
                />
            </Box>

            {error && !selectedProof && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {reservationsRequiringDecision.length > 0 && (
                <Alert
                    severity="warning"
                    sx={{ mb: 3, borderRadius: 2 }}
                    action={
                        <Button
                            color="inherit"
                            size="small"
                            onClick={() => navigateToPage('reservas')}
                        >
                            Ver reservas
                        </Button>
                    }
                >
                    <strong>
                        {reservationsRequiringDecision.length}
                        {' '}reservación(es) requieren una decisión.
                    </strong>
                    {' '}
                    Hay anticipos rechazados después del vencimiento.
                    Debes conceder una prórroga o cancelar la solicitud.
                </Alert>
            )}

            {/* COMPROBANTES PENDIENTES */}
            <Paper
                elevation={0}
                sx={{
                    p: { xs: 2, md: 3 },
                    borderRadius: 3,
                    border: `1px solid ${COLORS.border}`,
                    mb: 3
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
                        <Typography
                            variant="h5"
                            sx={{
                                fontFamily: 'Georgia, serif',
                                color: COLORS.dark
                            }}
                        >
                            Comprobantes pendientes
                        </Typography>

                        <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mt: 0.5 }}
                        >
                            {pendingProofs.length} comprobantes por revisar
                        </Typography>
                    </Box>

                    <Button
                        variant="outlined"
                        onClick={loadData}
                        disabled={loading || saving}
                        sx={{
                            color: COLORS.primary,
                            borderColor: '#AAB8A1'
                        }}
                    >
                        Actualizar
                    </Button>
                </Stack>

                {loading ? (
                    <Box sx={{ py: 5, textAlign: 'center' }}>
                        <CircularProgress size={30} />
                    </Box>
                ) : pendingProofs.length === 0 ? (
                    <EmptyState
                        icon="check"
                        title="Sin comprobantes pendientes"
                        description="Todos los comprobantes recibidos han sido revisados."
                    />
                ) : (
                    <TableContainer
                        sx={{
                            border: `1px solid ${COLORS.border}`,
                            borderRadius: 2
                        }}
                    >
                        <Table sx={{ minWidth: 1100 }}>
                            <TableHead>
                                <TableRow sx={{ bgcolor: COLORS.header }}>
                                    <TableCell>Cliente</TableCell>
                                    <TableCell>Reservación</TableCell>
                                    <TableCell>Total de reservación</TableCell>
                                    <TableCell>Total abonado</TableCell>
                                    <TableCell>Monto</TableCell>
                                    <TableCell>Fecha de envío</TableCell>
                                    <TableCell>Estado</TableCell>
                                    <TableCell align="right">Acciones</TableCell>
                                </TableRow>
                            </TableHead>

                            <TableBody>
                                {pendingProofs.map((proof) => (
                                    <TableRow
                                        key={proof.id_comprobante}
                                        hover
                                    >
                                        <TableCell>
                                            {proof.nombre_cliente || 'Sin cliente'}
                                        </TableCell>

                                        <TableCell>
                                            #{proof.id_reservacion}
                                        </TableCell>

                                        <TableCell>
                                            {getReservationTotal(bookings, proof.id_reservacion)}
                                        </TableCell>

                                        <TableCell>
                                            {getReservationPaid(bookings, proof.id_reservacion)}
                                        </TableCell>

                                        <TableCell>
                                            {proof.monto_centavos != null
                                                ? formatAmount(proof.monto_centavos)
                                                : 'Por verificar'}
                                        </TableCell>

                                        <TableCell>
                                            {formatDate(proof.enviado_en)}
                                        </TableCell>

                                        <TableCell>
                                            <PaymentStatus status={proof.estado} />
                                        </TableCell>

                                        <TableCell align="right">
                                            <Button
                                                size="small"
                                                variant="contained"
                                                onClick={() => openProof(proof)}
                                                sx={{
                                                    bgcolor: COLORS.primary,
                                                    '&:hover': {
                                                        bgcolor: COLORS.primaryHover
                                                    }
                                                }}
                                            >
                                                Revisar
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Paper>

            {/* HISTORIAL DE PAGOS */}
            <Paper
                elevation={0}
                sx={{
                    p: { xs: 2, md: 3 },
                    borderRadius: 3,
                    border: `1px solid ${COLORS.border}`
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
                                color: COLORS.dark
                            }}
                        >
                            Historial de pagos
                        </Typography>

                        <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mt: 0.5 }}
                        >
                            {filteredPayments.length} de {payments.length} pagos
                        </Typography>
                    </Box>

                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={1.5}
                    >
                        <TextField
                            size="small"
                            label="Buscar pago"
                            placeholder="Cliente, referencia o reserva"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            sx={{ minWidth: { sm: 260 } }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Icon name="search" size={18} />
                                    </InputAdornment>
                                )
                            }}
                        />

                        <TextField
                            select
                            size="small"
                            label="Estado"
                            value={statusFilter}
                            onChange={(event) =>
                                setStatusFilter(event.target.value)
                            }
                            SelectProps={{ native: true }}
                        >
                            <option value="Todos">Todos</option>
                            <option value="Pendiente">Pendiente</option>
                            <option value="Aprobado">Aprobado</option>
                            <option value="Rechazado">Rechazado</option>
                        </TextField>
                    </Stack>
                </Stack>

                {loading ? (
                    <Box sx={{ py: 5, textAlign: 'center' }}>
                        <CircularProgress size={30} />
                    </Box>
                ) : filteredPayments.length === 0 ? (
                    <EmptyState
                        icon="search"
                        title="No hay pagos para mostrar"
                        description="No se encontraron pagos con los filtros seleccionados."
                    />
                ) : (
                    <TableContainer
                        sx={{
                            border: `1px solid ${COLORS.border}`,
                            borderRadius: 2
                        }}
                    >
                        <Table sx={{ minWidth: 850 }}>
                            <TableHead>
                                <TableRow sx={{ bgcolor: COLORS.header }}>
                                    <TableCell>Pago</TableCell>
                                    <TableCell>Cliente</TableCell>
                                    <TableCell>Reservación</TableCell>
                                    <TableCell>Importe registrado</TableCell>
                                    <TableCell>Método</TableCell>
                                    <TableCell>Fecha</TableCell>
                                    <TableCell>Estado</TableCell>
                                </TableRow>
                            </TableHead>

                            <TableBody>
                                {filteredPayments.map((payment) => (
                                    <TableRow key={payment.id_pago} hover>
                                        <TableCell>#{payment.id_pago}</TableCell>

                                        <TableCell>
                                            {payment.nombre_cliente || 'Sin cliente'}
                                        </TableCell>

                                        <TableCell>
                                            #{payment.id_reservacion}
                                        </TableCell>

                                        <TableCell>
                                            {formatAmount(payment.monto_centavos)}
                                        </TableCell>

                                        <TableCell>
                                            {payment.metodo_pago || 'No registrado'}
                                        </TableCell>

                                        <TableCell>
                                            {formatDate(payment.fecha_pago)}
                                        </TableCell>

                                        <TableCell>
                                            <PaymentStatus status={payment.estado} />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Paper>

            {/* DIÁLOGO DE REVISIÓN */}
            <Dialog
                open={Boolean(selectedProof)}
                onClose={closeProof}
                fullWidth
                maxWidth="md"
                PaperProps={{
                    sx: {
                        borderRadius: 4,
                        bgcolor: '#FFFFFF'
                    }
                }}
            >
                {selectedProof && (
                    <>
                        <DialogTitle
                            sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                fontFamily: 'Georgia, serif',
                                color: COLORS.dark
                            }}
                        >
                            Revisar comprobante

                            <IconButton
                                onClick={closeProof}
                                disabled={saving}
                                aria-label="Cerrar"
                            >
                                <Typography
                                    component="span"
                                    sx={{
                                        fontSize: 28,
                                        fontWeight: 400,
                                        lineHeight: 1,
                                        color: '#526047'
                                    }}
                                >
                                    ×
                                </Typography>
                            </IconButton>
                        </DialogTitle>

                        <DialogContent dividers>
                            <Stack spacing={2.5}>
                                {error && (
                                    <Alert severity="error">
                                        {error}
                                    </Alert>
                                )}

                                <Typography variant="body2">
                                    <strong>Cliente:</strong>{' '}
                                    {selectedProof.nombre_cliente}
                                </Typography>

                                <Typography variant="body2">
                                    <strong>Reservación:</strong>{' '}
                                    #{selectedProof.id_reservacion}
                                </Typography>

                                <Typography variant="body2">
                                    <strong>Total de reservación:</strong>{' '}
                                    {getReservationTotal(bookings, selectedProof.id_reservacion)}
                                </Typography>

                                <Typography variant="body2">
                                    <strong>Total abonado anteriormente:</strong>{' '}
                                    {getReservationPaid(bookings, selectedProof.id_reservacion)}
                                </Typography>

                                <Typography variant="body2">
                                    <strong>Saldo pendiente:</strong>{' '}
                                    {getReservationBalance(bookings, selectedProof.id_reservacion)}
                                </Typography>

                                <Divider />

                                <Typography variant="body2">
                                    <strong>Importe de este comprobante:</strong>{' '}
                                    {selectedProof.monto_centavos != null
                                        ? formatAmount(selectedProof.monto_centavos)
                                        : 'Por verificar'}
                                </Typography>

                                <Typography variant="body2">
                                    <strong>Método de pago:</strong>{' '}
                                    {selectedProof.metodo_pago || 'Transferencia'}
                                </Typography>

                                <Divider />

                                <Alert severity="warning" sx={{ borderRadius: 2 }}>
                                    <strong>Importante:</strong> rechazar este comprobante
                                    no cancela automáticamente la reservación.

                                    Si el plazo del anticipo ya venció, será necesario
                                    decidir si se concede una prórroga o se cancela
                                    la solicitud desde Agenda y reservas.
                                </Alert>

                                {proofLoading ? (
                                    <Box sx={{ py: 5, textAlign: 'center' }}>
                                        <CircularProgress />
                                    </Box>
                                ) : proofUrl ? (
                                    <Box
                                        component="img"
                                        src={proofUrl}
                                        alt="Comprobante presentado por el cliente"
                                        sx={{
                                            display: 'block',
                                            width: '100%',
                                            maxHeight: 450,
                                            objectFit: 'contain',
                                            borderRadius: 2,
                                            border: `1px solid ${COLORS.border}`
                                        }}
                                    />
                                ) : (
                                    <Alert severity="warning">
                                        No fue posible obtener la imagen.
                                    </Alert>
                                )}

                                <TextField
                                    label="Importe verificado (MXN)"
                                    placeholder="Ej. 750.00"
                                    fullWidth
                                    required
                                    value={verifiedAmount}
                                    onChange={(event) => setVerifiedAmount(event.target.value)}
                                    disabled={saving || proofLoading || !proofUrl}
                                    inputProps={{
                                        inputMode: 'decimal',
                                        maxLength: 18
                                    }}
                                    error={
                                        verifiedAmount.trim() !== '' &&
                                        !(
                                            /^\d+(?:\.\d{1,2})?$/.test(verifiedAmount.trim()) &&
                                            Number(verifiedAmount) > 0
                                        )
                                    }
                                    helperText={
                                        'Introduce únicamente la cantidad que realmente ' +
                                        'se recibió. Es obligatoria para aprobar.'
                                    }
                                />

                                <TextField
                                    label="Motivo del rechazo"
                                    placeholder="Explica por qué se rechaza el comprobante"
                                    multiline
                                    minRows={3}
                                    fullWidth
                                    value={rejectReason}
                                    onChange={(event) =>
                                        setRejectReason(event.target.value)
                                    }
                                    inputProps={{ maxLength: 2000 }}
                                    helperText="Obligatorio únicamente al rechazar."
                                />
                            </Stack>
                        </DialogContent>

                        <DialogActions sx={{ p: 3 }}>
                            <Button
                                onClick={closeProof}
                                disabled={saving}
                            >
                                Cerrar
                            </Button>

                            <Button
                                variant="outlined"
                                color="error"
                                disabled={
                                    saving ||
                                    proofLoading ||
                                    !proofUrl ||
                                    !rejectReason.trim()
                                }
                                onClick={() => reviewProof(false)}
                            >
                                Rechazar
                            </Button>

                            <Button
                                variant="contained"
                                disabled={
                                    saving ||
                                    proofLoading ||
                                    !proofUrl ||
                                    !/^\d+(?:\.\d{1,2})?$/.test(verifiedAmount.trim()) ||
                                    !Number.isFinite(Number(verifiedAmount)) ||
                                    Number(verifiedAmount) <= 0
                                }
                                onClick={() => reviewProof(true)}
                                sx={{
                                    bgcolor: COLORS.primary,
                                    '&:hover': {
                                        bgcolor: COLORS.primaryHover
                                    }
                                }}
                            >
                                {saving ? 'Procesando...' : 'Aprobar comprobante'}
                            </Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>
        </Box>
    );
}
