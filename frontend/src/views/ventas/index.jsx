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
    InputAdornment,
    MenuItem,
    Paper,
    Stack,
    TextField,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow
} from '@mui/material';
import {
    Search as SearchIcon,
    Refresh as RefreshIcon,
    ReceiptLong as ReceiptIcon,
    CheckCircleOutline as ConfirmedIcon,
    Schedule as PendingIcon,
    Close as CloseIcon
} from '@mui/icons-material';

import useStudio from '../../hooks/useStudio';
import { fetchVentas } from '../../api/ventasService';

const COLORS = {
    primary: '#68745B',
    hover: '#59634B',
    text: '#343B32',
    muted: '#72796D',
    border: '#E2E5DD',
    background: '#F6F7F3',
    soft: '#E9EDE4'
};

const moneda = (centavos) =>
    new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
    }).format(Number(centavos || 0) / 100);

const fecha = (valor) => {
    if (!valor) return 'Sin fecha';

    const date = new Date(valor);
    if (Number.isNaN(date.getTime())) return 'Sin fecha';

    return date.toLocaleString('es-MX', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const estadoConfig = {
    Pendiente: {
        background: '#F5EDE0',
        color: '#8A6536'
    },
    Confirmada: {
        background: '#E8F0E2',
        color: '#3B5C30'
    },
    Cancelada: {
        background: '#F3E8E7',
        color: '#A34D4D'
    }
};

function EstadoChip({ estado }) {
    const estilo = estadoConfig[estado] || {
        background: '#ECEEEB',
        color: '#59645A'
    };

    return (
        <Chip
            label={estado || 'Sin estado'}
            size="small"
            sx={{
                bgcolor: estilo.background,
                color: estilo.color,
                fontWeight: 700,
                borderRadius: 2
            }}
        />
    );
}

function ResumenCard({ titulo, valor, icono }) {
    return (
        <Paper
            elevation={0}
            sx={{
                flex: 1,
                minWidth: 0,
                p: 3,
                bgcolor: '#FFFFFF',
                border: `1px solid ${COLORS.border}`,
                borderRadius: '26px'
            }}
        >
            <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="flex-start"
                spacing={2}
            >
                <Box sx={{ minWidth: 0 }}>
                    <Typography
                        variant="body2"
                        sx={{
                            color: COLORS.muted,
                            fontSize: 13
                        }}
                    >
                        {titulo}
                    </Typography>

                    <Typography
                        sx={{
                            fontFamily: 'Georgia, serif',
                            fontSize: { xs: '2rem', md: '2.25rem' },
                            fontWeight: 600,
                            color: '#254C41',
                            lineHeight: 1.2,
                            letterSpacing: '-0.5px',
                            fontVariantNumeric: 'tabular-nums'
                        }}
                    >
                        {valor}
                    </Typography>
                </Box>

                <Box
                    sx={{
                        width: 52,
                        height: 52,
                        borderRadius: '17px',
                        bgcolor: '#E9EDE4',
                        color: '#68745B',
                        display: 'grid',
                        placeItems: 'center',
                        flexShrink: 0
                    }}
                >
                    {icono}
                </Box>
            </Stack>
        </Paper>
    );
}

export default function VentasView() {
    const { accessKey, dataVersion } = useStudio();

    const [ventas, setVentas] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    const [detalle, setDetalle] = useState(null);
    const [busqueda, setBusqueda] = useState('');
    const [estado, setEstado] = useState('Todas');

    const cargar = useCallback(async () => {
        if (!accessKey) {
            setVentas([]);
            setCargando(false);
            return;
        }

        setCargando(true);

        try {
            const resultado = await fetchVentas(accessKey);
            setVentas(Array.isArray(resultado) ? resultado : []);
            setError('');
        } catch (err) {
            setError(err.message || 'No se pudieron cargar las ventas.');
        } finally {
            setCargando(false);
        }
    }, [accessKey]);

    useEffect(() => {
        cargar();
    }, [cargar, dataVersion]);

    const filtradas = useMemo(() => {
        const termino = busqueda.trim().toLowerCase();

        return ventas.filter((venta) => {
            const coincideEstado =
                estado === 'Todas' || venta.estado === estado;

            const contenido = [
                venta.id_venta,
                venta.nombre_cliente,
                venta.id_reservacion
            ]
                .filter((valor) => valor !== null && valor !== undefined)
                .join(' ')
                .toLowerCase();

            return coincideEstado && contenido.includes(termino);
        });
    }, [ventas, busqueda, estado]);

    const resumen = useMemo(() => {
        const vigentes = ventas.filter(
            (venta) => venta.estado !== 'Cancelada'
        );

        return {
            total: vigentes.reduce(
                (suma, venta) => suma + Number(venta.total_centavos || 0),
                0
            ),
            confirmadas: ventas.filter(
                (venta) => venta.estado === 'Confirmada'
            ).length,
            pendientes: ventas.filter(
                (venta) => venta.estado === 'Pendiente'
            ).length
        };
    }, [ventas]);

    return (
        <Box sx={{ py: 1 }}>
            <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={2}
                sx={{ mb: 3 }}
            >
                <ResumenCard
                    titulo="Importe contratado vigente"
                    valor={moneda(resumen.total)}
                    icono={<ReceiptIcon />}
                />

                <ResumenCard
                    titulo="Ventas confirmadas"
                    valor={resumen.confirmadas}
                    icono={<ConfirmedIcon />}
                />

                <ResumenCard
                    titulo="Ventas pendientes"
                    valor={resumen.pendientes}
                    icono={<PendingIcon />}
                />
            </Stack>

            <Paper
                elevation={0}
                sx={{
                    p: { xs: 2, md: 3 },
                    mb: 3,
                    bgcolor: '#FFFFFF',
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 3
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
                            sx={{ fontFamily: 'Georgia, serif', color: COLORS.text }}
                        >
                            Ventas registradas
                        </Typography>
                        <Typography
                            variant="body2"
                            sx={{ color: COLORS.muted, mt: 0.5 }}
                        >
                            {filtradas.length} de {ventas.length} ventas
                        </Typography>
                    </Box>
                    <Button
                        variant="outlined"
                        startIcon={cargando ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />}
                        onClick={cargar}
                        disabled={cargando}
                        sx={{
                            borderColor: '#AAB8A1',
                            color: COLORS.primary,
                            borderRadius: 2,
                            textTransform: 'none',
                            fontWeight: 600,
                            '&:hover': { borderColor: COLORS.primary, bgcolor: COLORS.soft }
                        }}
                    >
                        Actualizar
                    </Button>
                </Stack>
                <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    spacing={2}
                >
                    <TextField
                        placeholder="Buscar por folio, cliente o reservación..."
                        value={busqueda}
                        onChange={(event) => setBusqueda(event.target.value)}
                        size="small"
                        fullWidth
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                height: 46,
                                borderRadius: '12px',
                                bgcolor: '#FFFFFF',

                                '& fieldset': {
                                    borderColor: '#DCE2D8'
                                },

                                '&:hover fieldset': {
                                    borderColor: '#AAB8A1'
                                },

                                '&.Mui-focused fieldset': {
                                    borderColor: '#254C41',
                                    borderWidth: '1px'
                                },

                                '& input': {
                                    outline: 'none !important',
                                    boxShadow: 'none !important',
                                    border: 'none !important',
                                    background: 'transparent !important'
                                }
                            }
                        }}
                        slotProps={{
                            input: {
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon
                                            sx={{
                                                fontSize: 20,
                                                color: '#72796D'
                                            }}
                                        />
                                    </InputAdornment>
                                )
                            }
                        }}
                    />

                    <TextField
                        select
                        value={estado}
                        onChange={(event) => setEstado(event.target.value)}
                        size="small"
                        sx={{
                            width: { xs: '100%', md: 230 },
                            flexShrink: 0,
                            '& .MuiOutlinedInput-root': {
                                height: 46,
                                borderRadius: '12px',
                                bgcolor: '#FFFFFF',
                                '& fieldset': {
                                    borderColor: '#DCE2D8'
                                },
                                '&:hover fieldset': {
                                    borderColor: '#AAB8A1'
                                },
                                '&.Mui-focused fieldset': {
                                    borderColor: '#254C41',
                                    borderWidth: '1px'
                                }
                            }
                        }}
                    >
                        {['Todas', 'Pendiente', 'Confirmada', 'Cancelada'].map(
                            (opcion) => (
                                <MenuItem key={opcion} value={opcion}>
                                    {opcion === 'Todas' ? 'Todos los estados' : opcion}
                                </MenuItem>
                            )
                        )}
                    </TextField>

                </Stack>
                <Alert severity="info" sx={{ mt: 2.5, mb: 3, borderRadius: 2 }}>
                    Las ventas representan importes contratados, no pagos recibidos.
                    Los anticipos y saldos se gestionarán desde Pagos.
                </Alert>
                {error && (
                    <Alert severity="error" sx={{ mb: 3 }}>
                        {error}
                    </Alert>
                )}

                {cargando ? (
                    <Box sx={{ py: 6, textAlign: 'center' }}>
                        <CircularProgress sx={{ color: COLORS.primary }} />
                        <Typography sx={{ mt: 2, color: COLORS.muted }}>
                            Cargando ventas...
                        </Typography>
                    </Box>
                ) : filtradas.length === 0 ? (
                    <Paper
                        elevation={0}
                        sx={{
                            py: 6,
                            px: 3,
                            textAlign: 'center',
                            border: `1px solid ${COLORS.border}`,
                            borderRadius: 3
                        }}
                    >
                        <ReceiptIcon
                            sx={{ fontSize: 42, color: '#879174', mb: 1 }}
                        />

                        <Typography
                            variant="h6"
                            sx={{
                                fontFamily: 'Georgia, serif',
                                color: COLORS.text
                            }}
                        >
                            No hay ventas para mostrar
                        </Typography>

                        <Typography
                            variant="body2"
                            sx={{ color: COLORS.muted, mt: 1 }}
                        >
                            Las ventas aparecerán al registrar reservaciones.
                            También puedes modificar los filtros.
                        </Typography>
                    </Paper>
                ) : (
                    <Box>
                        <TableContainer
                            sx={{
                                border: `1px solid ${COLORS.border}`,
                                borderRadius: 2
                            }}
                        >
                            <Table sx={{ minWidth: 850 }}>
                                <TableHead>
                                    <TableRow sx={{ bgcolor: '#F5F6F2' }}>
                                        {[
                                            'VENTA',
                                            'CLIENTE Y RESERVACIÓN',
                                            'FECHA',
                                            'IMPORTE',
                                            'ESTADO',
                                            'ACCIONES'
                                        ].map((titulo) => (
                                            <TableCell
                                                key={titulo}
                                                sx={{
                                                    color: COLORS.primary,
                                                    fontSize: 12,
                                                    fontWeight: 700,
                                                    py: 2,
                                                    borderBottom: `1px solid ${COLORS.border}`
                                                }}
                                            >
                                                {titulo}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>

                                <TableBody>
                                    {filtradas.map((venta) => (
                                        <TableRow
                                            key={venta.id_venta}
                                            hover
                                            sx={{
                                                '&:last-child td': {
                                                    borderBottom: 0
                                                }
                                            }}
                                        >
                                            <TableCell>
                                                <Typography
                                                    fontWeight={700}
                                                    sx={{ color: COLORS.text }}
                                                >
                                                    #{venta.id_venta}
                                                </Typography>

                                                <Typography
                                                    variant="caption"
                                                    sx={{ color: COLORS.muted }}
                                                >
                                                    {venta.conceptos?.length || 0} concepto(s)
                                                </Typography>
                                            </TableCell>

                                            <TableCell>
                                                <Typography
                                                    variant="body2"
                                                    fontWeight={600}
                                                    sx={{ color: COLORS.text }}
                                                >
                                                    {venta.nombre_cliente || 'Cliente no disponible'}
                                                </Typography>

                                                {venta.id_reservacion != null && (
                                                    <Typography
                                                        variant="caption"
                                                        sx={{ color: COLORS.muted }}
                                                    >
                                                        Reservación #{venta.id_reservacion}
                                                    </Typography>
                                                )}
                                            </TableCell>

                                            <TableCell>
                                                <Typography
                                                    variant="body2"
                                                    sx={{ color: COLORS.muted }}
                                                >
                                                    {fecha(venta.creada_en)}
                                                </Typography>
                                            </TableCell>

                                            <TableCell>
                                                <Typography
                                                    fontWeight={700}
                                                    sx={{ color: '#254C41' }}
                                                >
                                                    {moneda(venta.total_centavos)}
                                                </Typography>
                                            </TableCell>

                                            <TableCell>
                                                <EstadoChip estado={venta.estado} />
                                            </TableCell>

                                            <TableCell>
                                                <Button
                                                    variant="outlined"
                                                    size="small"
                                                    onClick={() => setDetalle(venta)}
                                                    sx={{
                                                        color: '#254C41',
                                                        borderColor: '#AAB8A1',
                                                        borderRadius: 2,
                                                        textTransform: 'none',
                                                        fontWeight: 600,
                                                        whiteSpace: 'nowrap',
                                                        '&:hover': {
                                                            borderColor: '#254C41',
                                                            bgcolor: '#F1F4EE'
                                                        }
                                                    }}
                                                >
                                                    Ver detalle
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                )}


            </Paper>

            <Dialog
                open={Boolean(detalle)}
                onClose={() => setDetalle(null)}
                fullWidth
                maxWidth="sm"
                slotProps={{
                    paper: {
                        sx: { borderRadius: 3 }
                    }
                }}
            >
                <DialogTitle
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}
                >
                    <Box>
                        <Typography
                            variant="overline"
                            sx={{
                                color: '#68745B',
                                letterSpacing: 2
                            }}
                        >
                            LUZ & MEMORIA
                        </Typography>

                        <Typography
                            variant="h5"
                            sx={{
                                fontFamily: 'Georgia, serif',
                                color: COLORS.primary
                            }}
                        >
                            Venta #{detalle?.id_venta}
                        </Typography>
                    </Box>

                    <Button
                        onClick={() => setDetalle(null)}
                        sx={{ minWidth: 40, color: COLORS.muted }}
                        aria-label="Cerrar detalle"
                    >
                        <CloseIcon />
                    </Button>
                </DialogTitle>

                <DialogContent dividers>
                    {detalle && (
                        <Stack spacing={2.5}>
                            <Box>
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                >
                                    Cliente
                                </Typography>
                                <Typography fontWeight={600}>
                                    {detalle.nombre_cliente}
                                </Typography>
                            </Box>

                            <Stack
                                direction="row"
                                justifyContent="space-between"
                                alignItems="center"
                            >
                                <Box>
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                    >
                                        Reservación
                                    </Typography>
                                    <Typography fontWeight={600}>
                                        {detalle.id_reservacion != null
                                            ? `#${detalle.id_reservacion}`
                                            : 'Sin reservación'}
                                    </Typography>
                                </Box>

                                <EstadoChip estado={detalle.estado} />
                            </Stack>

                            <Divider />

                            <Typography
                                variant="h6"
                                sx={{
                                    fontFamily: 'Georgia, serif',
                                    color: COLORS.text
                                }}
                            >
                                Conceptos contratados
                            </Typography>

                            {detalle.conceptos?.length ? (
                                detalle.conceptos.map((concepto) => (
                                    <Box key={concepto.id_detalle}>
                                        <Typography fontWeight={600}>
                                            {concepto.descripcion}
                                        </Typography>

                                        <Stack
                                            direction="row"
                                            justifyContent="space-between"
                                            spacing={2}
                                            sx={{ mt: 0.5 }}
                                        >
                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                            >
                                                {concepto.cantidad} ×{' '}
                                                {moneda(concepto.precio_unitario_centavos)}
                                            </Typography>

                                            <Typography fontWeight={600}>
                                                {moneda(concepto.subtotal_centavos)}
                                            </Typography>
                                        </Stack>
                                    </Box>
                                ))
                            ) : (
                                <Alert severity="warning">
                                    Esta venta no tiene conceptos registrados.
                                </Alert>
                            )}

                            <Divider />

                            <Stack
                                direction="row"
                                justifyContent="space-between"
                                alignItems="center"
                            >
                                <Typography fontWeight={700}>
                                    Total contratado
                                </Typography>

                                <Typography
                                    variant="h5"
                                    sx={{
                                        fontWeight: 700,
                                        color: COLORS.primary
                                    }}
                                >
                                    {moneda(detalle.total_centavos)}
                                </Typography>
                            </Stack>

                            {detalle.observaciones && (
                                <Box
                                    sx={{
                                        p: 2,
                                        bgcolor: COLORS.background,
                                        borderRadius: 2
                                    }}
                                >
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                    >
                                        Observaciones
                                    </Typography>

                                    <Typography variant="body2">
                                        {detalle.observaciones}
                                    </Typography>
                                </Box>
                            )}
                        </Stack>
                    )}
                </DialogContent>

                <DialogActions sx={{ p: 2.5 }}>
                    <Button
                        variant="contained"
                        onClick={() => setDetalle(null)}
                        sx={{
                            bgcolor: COLORS.primary,
                            borderRadius: 2,
                            textTransform: 'none',
                            '&:hover': {
                                bgcolor: COLORS.hover
                            }
                        }}
                    >
                        Cerrar
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
