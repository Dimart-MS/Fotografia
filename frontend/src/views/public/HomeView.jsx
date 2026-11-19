
import { Box, Button, Card, CardContent, Container, Stack, Typography } from '@mui/material';
import Icon from '../../ui-component/Icon';

const packages = [
    {
        id: 'foto',
        name: 'Fotografía',
        description: 'Capturamos los momentos más especiales de tu evento.',
        price: 3500
    },
    {
        id: 'video',
        name: 'Video',
        description: 'Conservamos tus recuerdos a través de una producción audiovisual.',
        price: 4500
    },
    {
        id: 'combinado',
        name: 'Fotografía y video',
        description: 'Una cobertura completa para recordar cada detalle.',
        price: 7000
    }
];

const formatPrice = (price) =>
    new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        maximumFractionDigits: 0
    }).format(price);

export default function HomeView({
    onLogin,
    onAvailability,
    onRegister
}) {
    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#F8F6F0', color: '#343B32' }}>
            {/* ENCABEZADO */}
            <Box
                component="header"
                sx={{
                    px: { xs: 2, md: 8 },
                    py: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 2,
                    bgcolor: '#F8F6F0'
                }}
            >
                <Box>
                    <Typography variant="h5" sx={{ fontFamily: 'Georgia, serif', fontWeight: 600 }}>
                        Luz & Memoria
                    </Typography>
                    <Typography variant="caption" sx={{ letterSpacing: 2 }}>
                        ESTUDIO FOTOGRÁFICO
                    </Typography>
                </Box>

                <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    flexWrap="wrap"
                    justifyContent="flex-end"
                >
                    <Button href="#inicio" color="inherit">
                        Inicio
                    </Button>

                    <Button href="#paquetes" color="inherit">
                        Paquetes
                    </Button>

                    <Button color="inherit" onClick={onAvailability}>
                        Disponibilidad
                    </Button>

                    <Button
                        variant="contained"
                        onClick={onLogin}
                        sx={{
                            bgcolor: '#68745B',
                            color: '#FFFFFF',
                            borderRadius: '8px',
                            px: 3,
                            py: 1,
                            textTransform: 'none',
                            fontWeight: 600,
                            '&:hover': {
                                bgcolor: '#526047'
                            }
                        }}
                    >
                        Iniciar sesión
                    </Button>
                </Stack>
            </Box>

            {/* PORTADA */}
            <Box
                id="inicio"
                sx={{
                    minHeight: { xs: 430, md: 540 },
                    px: 3,
                    display: 'flex',
                    alignItems: 'center',
                    backgroundImage:
                        "linear-gradient(90deg, rgba(20,25,20,.72), rgba(20,25,20,.12)), url('/wedding.jpg')",
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                }}
            >
                <Container maxWidth="lg">
                    <Box sx={{ maxWidth: 620, color: '#FFFFFF' }}>
                        <Typography sx={{ letterSpacing: 3, mb: 2 }}>
                            FOTOGRAFÍA Y VIDEO PROFESIONAL
                        </Typography>

                        <Typography
                            variant="h2"
                            sx={{
                                fontFamily: 'Georgia, serif',
                                fontSize: { xs: 38, md: 58 },
                                lineHeight: 1.15,
                                mb: 2
                            }}
                        >
                            Cada historia merece ser recordada.
                        </Typography>

                        <Typography sx={{ fontSize: 17, mb: 3, maxWidth: 500 }}>
                            Capturamos los momentos más importantes de tu vida para
                            convertirlos en recuerdos que duren para siempre.
                        </Typography>

                        <Button
                            href="#paquetes"
                            variant="contained"
                            size="large"
                            sx={{
                                bgcolor: '#879174',
                                '&:hover': { bgcolor: '#68745B' },
                                px: 3,
                                py: 1.4
                            }}
                        >
                            Conoce nuestros paquetes
                        </Button>
                    </Box>
                </Container>
            </Box>

            {/* PRESENTACIÓN */}
            <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
                <Typography
                    variant="overline"
                    sx={{ letterSpacing: 3, color: '#7B856D' }}
                >
                    NUESTRA ESENCIA
                </Typography>

                <Typography
                    variant="h3"
                    sx={{ fontFamily: 'Georgia, serif', my: 2, fontSize: { xs: 30, md: 40 } }}
                >
                    Momentos únicos, recuerdos para siempre.
                </Typography>

                <Typography sx={{ color: '#72766E', lineHeight: 1.9 }}>
                    En Luz & Memoria creemos que cada celebración tiene una historia
                    especial. Nuestro propósito es acompañarte y conservar esos instantes
                    que hacen inolvidable cada ocasión.
                </Typography>
            </Container>

            {/* PAQUETES */}
            <Box id="paquetes" sx={{ bgcolor: '#EEECE3', py: 8 }}>
                <Container maxWidth="lg">
                    <Box sx={{ textAlign: 'center', mb: 5 }}>
                        <Typography variant="overline" sx={{ letterSpacing: 3, color: '#7B856D' }}>
                            LO QUE OFRECEMOS
                        </Typography>

                        <Typography variant="h3" sx={{ fontFamily: 'Georgia, serif', mt: 1 }}>
                            Nuestros paquetes
                        </Typography>

                        <Typography sx={{ color: '#72766E', mt: 1 }}>
                            Encuentra la cobertura ideal para tu celebración.
                        </Typography>
                    </Box>

                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
                            gap: 3
                        }}
                    >
                        {packages.map((item) => (
                            <Card
                                key={item.id}
                                elevation={0}
                                sx={{
                                    borderRadius: 3,
                                    bgcolor: '#FFFFFF',
                                    textAlign: 'center',
                                    p: 2
                                }}
                            >
                                <CardContent>
                                    <Box
                                        sx={{
                                            width: 55,
                                            height: 55,
                                            borderRadius: '50%',
                                            bgcolor: '#E9EDE4',
                                            color: '#68745B',
                                            display: 'grid',
                                            placeItems: 'center',
                                            mx: 'auto',
                                            mb: 2
                                        }}
                                    >
                                        <Icon name="camera" />
                                    </Box>

                                    <Typography variant="h5" sx={{ fontFamily: 'Georgia, serif' }}>
                                        {item.name}
                                    </Typography>

                                    <Typography sx={{ color: '#777', my: 2, minHeight: 55 }}>
                                        {item.description}
                                    </Typography>

                                    <Typography variant="h4" sx={{ color: '#68745B', fontWeight: 600 }}>
                                        {formatPrice(item.price)}
                                    </Typography>

                                    <Typography variant="caption" color="text.secondary">
                                        Precio del paquete
                                    </Typography>
                                </CardContent>
                            </Card>
                        ))}
                    </Box>

                    <Typography
                        variant="caption"
                        display="block"
                        textAlign="center"
                        sx={{ mt: 3, color: '#777' }}
                    >
                        Los precios corresponden al catálogo actual del proyecto.
                    </Typography>
                </Container>
            </Box>

            {/* CONTACTO Y PIE */}
            <Box sx={{ py: 6, textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontFamily: 'Georgia, serif', mb: 2 }}>
                    Hagamos inolvidable tu historia.
                </Typography>

                <Typography sx={{ color: '#777', mb: 3 }}>
                    Estamos en León, Guanajuato.
                </Typography>

                <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={2}
                    justifyContent="center"
                    alignItems="center"
                >
                    <Button
                        variant="contained"
                        onClick={onLogin}
                        sx={{
                            bgcolor: '#68745B',
                            color: '#FFFFFF',
                            px: 4,
                            py: 1.2,
                            textTransform: 'none',
                            '&:hover': {
                                bgcolor: '#526047'
                            }
                        }}
                    >
                        Iniciar sesión
                    </Button>

                    <Button
                        variant="outlined"
                        onClick={onRegister}
                        sx={{
                            color: '#68745B',
                            borderColor: '#68745B',
                            px: 4,
                            py: 1.2,
                            textTransform: 'none',
                            '&:hover': {
                                borderColor: '#526047',
                                bgcolor: '#E9EDE4'
                            }
                        }}
                    >
                        Crear cuenta
                    </Button>
                </Stack>

                <Typography variant="caption" display="block" sx={{ mt: 5, color: '#888' }}>
                    © {new Date().getFullYear()} Luz & Memoria · Estudio fotográfico
                </Typography>
            </Box>
        </Box>
    );
}
