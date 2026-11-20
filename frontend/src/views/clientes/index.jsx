
import { useState } from 'react';

import {
  Avatar,
  Box,
  Button,
  Chip,
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
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from '@mui/material';

import EmptyState from '../../ui-component/EmptyState';
import Icon from '../../ui-component/Icon';

import {
  getClientInitials,
  getLocalToday
} from '../../utils/formatters';

import useStudio from '../../hooks/useStudio';

// ==============================|| GESTIÓN DE CLIENTES ||============================== //

export default function ClientesView() {
  const {
    clients = [],
    search,
    setSearch,
    openClientModal,
    openBookingModal
  } = useStudio();

  // Alternar entre tarjetas y tabla
  const [viewMode, setViewMode] = useState('cards');

  // Búsqueda
  const normalizedQuery = (search || '').trim().toLowerCase();

  const filteredClients = clients.filter((client) => {
    const searchableText = [
      client.name,
      client.email,
      client.phone
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return searchableText.includes(normalizedQuery);
  });

  // Indicadores calculados a partir de los datos reales
  const totalClients = clients.length;

  const clientsWithEmail = clients.filter(
    (client) => Boolean(client.email?.trim())
  ).length;

  const clientsWithPhone = clients.filter(
    (client) => Boolean(client.phone?.trim())
  ).length;

  // Crear reservación para un cliente específico
  const handleCreateBooking = (client) => {
    openBookingModal(getLocalToday(), client.id);
  };

  const handleViewChange = (_event, newView) => {
    if (newView !== null) {
      setViewMode(newView);
    }
  };

  return (
    <Box sx={{ pb: 5 }}>
      {/* INDICADORES */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(3, minmax(0, 1fr))'
          },
          gap: 2,
          mb: 3
        }}
      >
        {[
          {
            title: 'Total de clientes',
            value: totalClients,
            icon: 'people'
          },
          {
            title: 'Con correo registrado',
            value: clientsWithEmail,
            icon: 'check'
          },
          {
            title: 'Con teléfono registrado',
            value: clientsWithPhone,
            icon: 'check'
          }
        ].map((stat) => (
          <Paper
            key={stat.title}
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              border: '1px solid #E2E5DD',
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
                  sx={{ color: '#72796D' }}
                >
                  {stat.title}
                </Typography>

                <Typography
                  variant="h3"
                  sx={{
                    fontWeight: 700,
                    color: '#354337',
                    mt: 1
                  }}
                >
                  {stat.value}
                </Typography>
              </Box>

              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2,
                  bgcolor: '#E9EDE4',
                  color: '#68745B',
                  display: 'grid',
                  placeItems: 'center'
                }}
              >
                <Icon name={stat.icon} size={22} />
              </Box>
            </Stack>
          </Paper>
        ))}
      </Box>

      {/* DIRECTORIO */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, md: 3 },
          borderRadius: 3,
          border: '1px solid #E2E5DD'
        }}
      >
        {/* BÚSQUEDA Y VISTAS */}
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
                color: '#343B32'
              }}
            >
              Clientes registrados
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 0.5 }}
            >
              {filteredClients.length} de {totalClients} clientes
            </Typography>
          </Box>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            alignItems={{ xs: 'stretch', sm: 'center' }}
          >
            <TextField
              size="small"
              placeholder="Buscar cliente..."
              label="Nombre, correo o teléfono"
              value={search || ''}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              sx={{
                minWidth: { sm: 280 },
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2
                }
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Icon name="search" size={18} />
                  </InputAdornment>
                )
              }}
            />

            <ToggleButtonGroup
              value={viewMode}
              exclusive
              size="small"
              onChange={handleViewChange}
              aria-label="Tipo de visualización"
              sx={{ alignSelf: 'flex-start' }}
            >
              <ToggleButton
                value="cards"
                aria-label="Vista de tarjetas"
              >
                Tarjetas
              </ToggleButton>

              <ToggleButton
                value="table"
                aria-label="Vista de tabla"
              >
                Tabla
              </ToggleButton>
            </ToggleButtonGroup>
          </Stack>
        </Stack>

        {/* SIN CLIENTES */}
        {totalClients === 0 ? (
          <EmptyState
            icon="people"
            iconSize={36}
            title="Sin clientes registrados"
            description="Todavía no hay clientes registrados. Utiliza el botón Nuevo cliente de la parte superior para comenzar."
          />
        ) : filteredClients.length === 0 ? (
          <Box sx={{ py: 3 }}>
            <EmptyState
              icon="search"
              title="No encontramos coincidencias"
              description="Intenta buscar con otro nombre, correo o teléfono."
            />

            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Button
                onClick={() => setSearch('')}
                sx={{ color: '#526047' }}
              >
                Limpiar búsqueda
              </Button>
            </Box>
          </Box>
        ) : viewMode === 'cards' ? (

          /* VISTA DE TARJETAS */
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, minmax(0, 1fr))',
                xl: 'repeat(3, minmax(0, 1fr))'
              },
              gap: 2.5
            }}
          >
            {filteredClients.map((client) => (
              <Paper
                key={client.id}
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: 3,
                  border: '1px solid #E2E5DD',
                  bgcolor: '#FFFFFF',
                  display: 'flex',
                  flexDirection: 'column',
                  minWidth: 0,
                  transition: '0.2s',
                  '&:hover': {
                    borderColor: '#AAB8A1',
                    boxShadow: '0 6px 20px rgba(0,0,0,0.05)'
                  }
                }}
              >
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={2}
                  sx={{ mb: 2 }}
                >
                  <Avatar
                    sx={{
                      bgcolor: '#E9EDE4',
                      color: '#526047',
                      width: 54,
                      height: 54,
                      fontWeight: 700
                    }}
                  >
                    {getClientInitials(
                      client.name || 'Cliente'
                    )}
                  </Avatar>

                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      variant="h6"
                      sx={{
                        fontFamily: 'Georgia, serif',
                        fontWeight: 600,
                        overflowWrap: 'anywhere'
                      }}
                    >
                      {client.name || 'Sin nombre'}
                    </Typography>

                    <Chip
                      label="Cliente registrado"
                      size="small"
                      sx={{
                        mt: 0.5,
                        bgcolor: '#E9EDE4',
                        color: '#526047'
                      }}
                    />
                  </Box>
                </Stack>

                <Box sx={{ mb: 2 }}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                  >
                    CORREO ELECTRÓNICO
                  </Typography>

                  <Typography
                    variant="body2"
                    sx={{ overflowWrap: 'anywhere' }}
                  >
                    {client.email || 'No registrado'}
                  </Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                  >
                    TELÉFONO
                  </Typography>

                  <Typography variant="body2">
                    {client.phone || 'No registrado'}
                  </Typography>
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                  >
                    DIRECCIÓN
                  </Typography>

                  <Typography
                    variant="body2"
                    sx={{ overflowWrap: 'anywhere' }}
                  >
                    {client.address || 'No registrada'}
                  </Typography>
                </Box>

                <Box sx={{ flexGrow: 1 }} />

                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() =>
                    handleCreateBooking(client)
                  }
                  sx={{
                    color: '#526047',
                    borderColor: '#AAB8A1',
                    textTransform: 'none',
                    py: 1.2,
                    '&:hover': {
                      borderColor: '#526047',
                      bgcolor: '#F1F4EE'
                    }
                  }}
                >
                  Reservar evento
                </Button>
              </Paper>
            ))}
          </Box>

        ) : (

          /* VISTA DE TABLA */
          <TableContainer
            sx={{
              border: '1px solid #E2E5DD',
              borderRadius: 2
            }}
          >
            <Table sx={{ minWidth: 750 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: '#F1F4EE' }}>
                  <TableCell>Cliente</TableCell>
                  <TableCell>Correo electrónico</TableCell>
                  <TableCell>Teléfono</TableCell>
                  <TableCell>Dirección</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {filteredClients.map((client) => (
                  <TableRow
                    key={client.id}
                    hover
                    sx={{
                      '&:last-child td': {
                        borderBottom: 0
                      }
                    }}
                  >
                    <TableCell>
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={1.5}
                      >
                        <Avatar
                          sx={{
                            bgcolor: '#E9EDE4',
                            color: '#526047',
                            width: 36,
                            height: 36,
                            fontSize: 13
                          }}
                        >
                          {getClientInitials(
                            client.name || 'Cliente'
                          )}
                        </Avatar>

                        <Typography
                          variant="body2"
                          fontWeight={600}
                        >
                          {client.name || 'Sin nombre'}
                        </Typography>
                      </Stack>
                    </TableCell>

                    <TableCell>
                      {client.email || 'No registrado'}
                    </TableCell>

                    <TableCell>
                      {client.phone || 'No registrado'}
                    </TableCell>

                    <TableCell>
                      {client.address || 'No registrada'}
                    </TableCell>

                    <TableCell align="right">
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() =>
                          handleCreateBooking(client)
                        }
                        sx={{
                          color: '#526047',
                          borderColor: '#AAB8A1',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        Reservar evento
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
}
