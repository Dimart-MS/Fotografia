
import { useState } from 'react';
import {
  Box,
  Button,
  Container,
  Paper,
  Stack,
  Typography
} from '@mui/material';
import Icon from '../../ui-component/Icon';

const sections = [
  { id: 'reservas', label: 'Mis reservaciones', icon: 'calendar' },
  { id: 'pagos', label: 'Mis pagos', icon: 'wallet' },
  { id: 'galeria', label: 'Mi galería', icon: 'image' },
  { id: 'perfil', label: 'Mis datos', icon: 'user' }
];

const sectionContent = {
  reservas: {
    title: 'Mis reservaciones',
    description: 'Aquí podrás consultar las fechas y los detalles de tus eventos.',
    emptyTitle: 'Todavía no tienes reservaciones',
    emptyDescription: 'Cuando realices una solicitud, podrás consultar aquí su fecha y estado.'
  },
  pagos: {
    title: 'Mis pagos',
    description: 'Consulta tus anticipos, comprobantes y saldos pendientes.',
    emptyTitle: 'No hay pagos registrados',
    emptyDescription: 'Aquí aparecerá el historial de pagos de tus eventos.'
  },
  galeria: {
    title: 'Mi galería',
    description: 'Tus fotografías y videos estarán disponibles en este espacio.',
    emptyTitle: 'Tu galería estará aquí',
    emptyDescription: 'Cuando el estudio entregue el material de tu evento, podrás visualizarlo y descargarlo.'
  },
  perfil: {
    title: 'Mis datos',
    description: 'Consulta y administra tu información personal.',
    emptyTitle: 'Información de tu cuenta',
    emptyDescription: 'Tus datos de cliente aparecerán aquí cuando inicies sesión.'
  }
};

export default function CustomerPortalView({ onLogout }) {
  const [activeSection, setActiveSection] = useState('reservas');
  const currentSection = sectionContent[activeSection];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F8F6F0' }}>
      <Box
        component="header"
        sx={{
          bgcolor: '#FFFFFF',
          borderBottom: '1px solid #E9E6DC',
          px: { xs: 2, md: 6 },
          py: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2
        }}
      >
        <Box>
          <Typography
            variant="h5"
            sx={{ fontFamily: 'Georgia, serif', color: '#343B32' }}
          >
            Luz & Memoria
          </Typography>
          <Typography
            variant="caption"
            sx={{ letterSpacing: 2, color: '#7B856D' }}
          >
            ESPACIO DEL CLIENTE
          </Typography>
        </Box>

        <Button
          onClick={onLogout}
          startIcon={<Icon name="logout" />}
          sx={{ color: '#68745B' }}
        >
          Salir
        </Button>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
        <Box sx={{ mb: 4 }}>
          <Typography
            variant="overline"
            sx={{ color: '#7B856D', letterSpacing: 3 }}
          >
            TU ESPACIO PERSONAL
          </Typography>

          <Typography
            variant="h3"
            sx={{
              fontFamily: 'Georgia, serif',
              color: '#343B32',
              fontSize: { xs: 30, md: 40 },
              mt: 1
            }}
          >
            Bienvenido a tu cuenta
          </Typography>

          <Typography sx={{ color: '#72766E', mt: 1 }}>
            Consulta la información de tus eventos y conserva tus recuerdos en un solo lugar.
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
            gap: 1.5,
            mb: 4
          }}
        >
          {sections.map((section) => {
            const active = activeSection === section.id;

            return (
              <Button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                variant={active ? 'contained' : 'outlined'}
                sx={{
                  minHeight: 90,
                  borderRadius: 3,
                  flexDirection: 'column',
                  gap: 1,
                  borderColor: '#D9DDCF',
                  bgcolor: active ? '#68745B' : '#FFFFFF',
                  color: active ? '#FFFFFF' : '#59634B',
                  '&:hover': {
                    bgcolor: active ? '#59634B' : '#EEF0E9',
                    borderColor: '#68745B'
                  }
                }}
              >
                <Icon name={section.icon} />
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                  {section.label}
                </Typography>
              </Button>
            );
          })}
        </Box>

        <Paper
          elevation={0}
          sx={{
            border: '1px solid #E9E6DC',
            borderRadius: 4,
            p: { xs: 3, md: 5 },
            bgcolor: '#FFFFFF',
            minHeight: 310
          }}
        >
          <Typography
            variant="h5"
            sx={{ fontFamily: 'Georgia, serif', color: '#343B32' }}
          >
            {currentSection.title}
          </Typography>

          <Typography sx={{ color: '#72766E', mt: 1 }}>
            {currentSection.description}
          </Typography>

          <Box
            sx={{
              minHeight: 205,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              py: 3
            }}
          >
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                bgcolor: '#EEF0E9',
                color: '#68745B',
                display: 'grid',
                placeItems: 'center',
                mb: 2
              }}
            >
              <Icon
                name={sections.find((item) => item.id === activeSection).icon}
              />
            </Box>

            <Typography
              variant="h6"
              sx={{ fontFamily: 'Georgia, serif', color: '#343B32' }}
            >
              {currentSection.emptyTitle}
            </Typography>

            <Typography
              variant="body2"
              sx={{ color: '#72766E', mt: 1, maxWidth: 430 }}
            >
              {currentSection.emptyDescription}
            </Typography>
          </Box>
        </Paper>

        <Box textAlign="center" mt={4}>
          <Typography variant="caption" sx={{ color: '#888' }}>
            Luz & Memoria · Cada historia merece ser recordada.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
