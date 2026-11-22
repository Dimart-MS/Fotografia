
import { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Container,
    Paper,
    Stack,
    Typography
} from '@mui/material';

import { fetchFechasOcupadas } from '../../api/reservasService';

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const dateKey = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
};

export default function AvailabilityView({ onBack, onContinue }) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [currentMonth, setCurrentMonth] = useState(
        new Date(today.getFullYear(), today.getMonth(), 1)
    );
    const [selectedDate, setSelectedDate] = useState('');
    const [occupiedDates, setOccupiedDates] = useState([]);
    const [loadingAvailability, setLoadingAvailability] = useState(true);
    const [availabilityError, setAvailabilityError] = useState('');

    useEffect(() => {
        let active = true;

        const loadAvailability = async () => {
            setLoadingAvailability(true);
            setAvailabilityError('');
            setOccupiedDates([]);
            setSelectedDate('');

            try {
                const anio = currentMonth.getFullYear();
                const mes = currentMonth.getMonth() + 1;

                const response = await fetchFechasOcupadas(anio, mes);

                if (!active) return;

                if (!Array.isArray(response?.fechas_ocupadas)) {
                    throw new Error('La respuesta de disponibilidad no es válida.');
                }

                setOccupiedDates(response.fechas_ocupadas);
            } catch (error) {
                if (!active) return;

                console.error('Error al consultar disponibilidad:', error);
                setAvailabilityError(
                    'No pudimos consultar las fechas disponibles. Intenta nuevamente.'
                );
            } finally {
                if (active) {
                    setLoadingAvailability(false);
                }
            }
        };

        loadAvailability();

        return () => {
            active = false;
        };
    }, [currentMonth]);

    const calendarDays = useMemo(() => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        // Ajustamos para que la semana comience en lunes.
        const startingDay = (firstDay.getDay() + 6) % 7;

        const days = [];

        for (let i = 0; i < startingDay; i += 1) {
            days.push(null);
        }

        for (let day = 1; day <= lastDay.getDate(); day += 1) {
            days.push(new Date(year, month, day));
        }

        return days;
    }, [currentMonth]);

    const selectedDateLabel = selectedDate
        ? new Intl.DateTimeFormat('es-MX', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }).format(new Date(`${selectedDate}T12:00:00`))
        : '';

    const changeMonth = (amount) => {
        setCurrentMonth(
            (previous) =>
                new Date(
                    previous.getFullYear(),
                    previous.getMonth() + amount,
                    1
                )
        );

        setSelectedDate('');
    };

    const isPastDate = (date) => date < today;

    const isBeforeCurrentMonth = () => {
        return (
            currentMonth.getFullYear() === today.getFullYear() &&
            currentMonth.getMonth() === today.getMonth()
        );
    };

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#F8F6F0', py: 5 }}>
            <Container maxWidth="md">
                <Button
                    onClick={onBack}
                    sx={{ color: '#68745B', mb: 3 }}
                >
                    ← Volver al inicio
                </Button>

                <Box textAlign="center" mb={4}>
                    <Typography
                        variant="overline"
                        sx={{ color: '#7B856D', letterSpacing: 3 }}
                    >
                        PLANEEMOS TU EVENTO
                    </Typography>

                    <Typography
                        variant="h3"
                        sx={{
                            fontFamily: 'Georgia, serif',
                            color: '#343B32',
                            fontSize: { xs: 30, md: 42 },
                            my: 1
                        }}
                    >
                        Consulta nuestras fechas
                    </Typography>

                    <Typography sx={{ color: '#72766E' }}>
                        Selecciona el día en el que te gustaría realizar tu evento.
                    </Typography>
                </Box>

                <Paper
                    elevation={0}
                    sx={{
                        borderRadius: 4,
                        p: { xs: 2, md: 4 },
                        bgcolor: '#FFFFFF',
                        border: '1px solid #E9E6DC'
                    }}
                >
                    <Stack
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        mb={3}
                    >
                        <Button
                            onClick={() => changeMonth(-1)}
                            disabled={isBeforeCurrentMonth()}
                            sx={{ color: '#68745B', minWidth: 40 }}
                            aria-label="Mes anterior"
                        >
                            ←
                        </Button>

                        <Typography
                            variant="h5"
                            sx={{
                                fontFamily: 'Georgia, serif',
                                color: '#343B32',
                                textTransform: 'capitalize'
                            }}
                        >
                            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                        </Typography>

                        <Button
                            onClick={() => changeMonth(1)}
                            sx={{ color: '#68745B', minWidth: 40 }}
                            aria-label="Mes siguiente"
                        >
                            →
                        </Button>
                    </Stack>

                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                            gap: { xs: 0.5, sm: 1 }
                        }}
                    >
                        {WEEKDAYS.map((day) => (
                            <Box key={day} sx={{ textAlign: 'center', py: 1 }}>
                                <Typography
                                    variant="caption"
                                    sx={{ color: '#7B856D', fontWeight: 700 }}
                                >
                                    {day}
                                </Typography>
                            </Box>
                        ))}

                        {calendarDays.map((date, index) => {
                            if (!date) {
                                return <Box key={`empty-${index}`} />;
                            }

                            const key = dateKey(date);
                            const occupied = occupiedDates.includes(key);
                            const disabled =
                                isPastDate(date) ||
                                occupied ||
                                loadingAvailability ||
                                Boolean(availabilityError);

                            const selected = selectedDate === key;

                            return (
                                <Button
                                    key={key}
                                    disabled={disabled}
                                    title={
                                        occupied
                                            ? 'Fecha ocupada'
                                            : isPastDate(date)
                                                ? 'Fecha anterior'
                                                : 'Seleccionar fecha'
                                    }
                                    onClick={() => setSelectedDate(key)}
                                    sx={{
                                        minWidth: 0,
                                        aspectRatio: '1 / 1',
                                        borderRadius: 2,
                                        p: 0,
                                        fontSize: { xs: 13, sm: 16 },
                                        color: selected ? '#FFFFFF' : '#343B32',
                                        bgcolor: selected ? '#68745B' : 'transparent',
                                        border: selected
                                            ? '1px solid #68745B'
                                            : '1px solid transparent',
                                        '&:hover': {
                                            bgcolor: selected ? '#59634B' : '#EEF0E9'
                                        },
                                        '&.Mui-disabled': {
                                            color: occupied ? '#A33A3A' : '#D0D0CB',
                                            bgcolor: occupied ? '#FCE8E8' : 'transparent',
                                            border: occupied
                                                ? '1px solid #E6A5A5'
                                                : '1px solid transparent',
                                            opacity: 1
                                        }
                                    }}
                                >
                                    {date.getDate()}
                                </Button>
                            );
                        })}
                    </Box>

                    <Box sx={{ mt: 3 }}>
                        {loadingAvailability && (
                            <Alert severity="info">
                                Consultando disponibilidad de fechas...
                            </Alert>
                        )}

                        {availabilityError && (
                            <Alert severity="error">
                                {availabilityError}
                            </Alert>
                        )}

                        {!loadingAvailability && !availabilityError && (
                            <Stack spacing={1.5}>
                                <Stack direction="row" spacing={2} flexWrap="wrap">
                                    <Typography variant="body2" sx={{ color: '#68745B' }}>
                                        ● Disponible
                                    </Typography>

                                    <Typography variant="body2" sx={{ color: '#A33A3A' }}>
                                        ● Ocupado
                                    </Typography>
                                </Stack>

                                <Alert severity="success">
                                    Disponibilidad actualizada. Los días marcados en rojo
                                    ya están ocupados y no pueden seleccionarse.
                                </Alert>
                            </Stack>
                        )}
                    </Box>

                    {selectedDate && (
                        <Box
                            sx={{
                                mt: 3,
                                p: 2.5,
                                borderRadius: 3,
                                bgcolor: '#F2F3ED'
                            }}
                        >
                            <Typography
                                variant="overline"
                                sx={{ color: '#7B856D', letterSpacing: 2 }}
                            >
                                FECHA SELECCIONADA
                            </Typography>

                            <Button
                                variant="contained"
                                fullWidth
                                sx={{
                                    mt: 2,
                                    py: 1.3,
                                    bgcolor: '#68745B',
                                    '&:hover': { bgcolor: '#59634B' }
                                }}
                                disabled={
                                    loadingAvailability ||
                                    Boolean(availabilityError) ||
                                    occupiedDates.includes(selectedDate)
                                }
                                onClick={() => {
                                    if (
                                        !loadingAvailability &&
                                        !availabilityError &&
                                        !occupiedDates.includes(selectedDate)
                                    ) {
                                        onContinue(selectedDate);
                                    }
                                }}
                            >
                                Continuar con esta fecha
                            </Button>

                            <Typography
                                variant="h6"
                                sx={{
                                    textTransform: 'capitalize',
                                    fontFamily: 'Georgia, serif',
                                    color: '#343B32'
                                }}
                            >
                                {selectedDateLabel}
                            </Typography>

                            <Typography variant="body2" sx={{ color: '#72766E', mt: 1 }}>
                                Esta fecha todavía debe verificarse con el estudio.
                                Seleccionarla no significa que esté reservada.
                            </Typography>
                        </Box>
                    )}
                </Paper>

                <Box textAlign="center" mt={4}>
                    <Typography
                        variant="body2"
                        sx={{ color: '#72766E', lineHeight: 1.8 }}
                    >
                        ¿Tienes una fecha especial en mente?
                        <br />
                        En Luz & Memoria queremos ayudarte a conservar tus mejores recuerdos.
                    </Typography>
                </Box>
            </Container>
        </Box>
    );
}
