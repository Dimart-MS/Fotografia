import { useState } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import {
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
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

  // Cliente seleccionado para mostrar su perfil
  const [selectedClient, setSelectedClient] = useState(null);

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

  // Indicadores
  const totalClients = clients.length;

  const clientsWithEmail = clients.filter(
    (client) => Boolean(client.email?.trim())
  ).length;

  const clientsWithPhone = clients.filter(
    (client) => Boolean(client.phone?.trim())
  ).length;

  // Crear reservación
  const handleCreateBooking = (client) => {
    openBookingModal(getLocalToday(), client.id);
  };

  // Cambiar tipo de visualización
  const handleViewChange = (_event, newView) => {
    if (newView !== null) {
      setViewMode(newView);
    }
  };

  // Cerrar perfil
  const closeDetails = () => {
    setSelectedClient(null);
  };

  // Crear reservación desde el perfil
  const handleBooking = (clientId) => {
    closeDetails();
    openBookingModal(getLocalToday(), clientId);
  };

  const primaryButtonSx = {
    bgcolor: '#68745B',
    color: '#FFFFFF',
    borderRadius: 2.5,
    minHeight: 42,
    px: 2.5,
    fontWeight: 600,
    textTransform: 'none',
    boxShadow: 'none',
    whiteSpace: 'nowrap',
    '&:hover': {
      bgcolor: '#526047',
      boxShadow: '0 4px 12px rgba(82, 96, 71, 0.18)'
    }
  };

  const secondaryButtonSx = {
    color: '#526047',
    borderColor: '#B7C4AD',
    borderRadius: 2.5,
    minHeight: 42,
    px: 2.5,
    fontWeight: 600,
    textTransform: 'none',
    whiteSpace: 'nowrap',
    '&:hover': {
      borderColor: '#68745B',
      bgcolor: '#F1F4EE'
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
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                width: { xs: '100%', sm: 300 },
                height: 44,
                px: 1.5,
                gap: 1.5,
                border: '1px solid #DDE5D7',
                borderRadius: '12px',
                bgcolor: '#FFFFFF',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s',
                '&:hover': {
                  borderColor: '#9AAA8D'
                },
                '&:focus-within': {
                  borderColor: '#68745B'
                }
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  color: '#68745B',
                  flexShrink: 0
                }}
              >
                <Icon name="search" size={18} />
              </Box>

              <Box
                component="input"
                type="search"
                aria-label="Buscar clientes"
                placeholder="Buscar cliente..."
                value={search || ''}
                onChange={(event) => setSearch(event.target.value)}
                sx={{
                  flex: 1,
                  minWidth: 0,
                  width: '100%',
                  border: 'none',
                  outline: 'none',
                  bgcolor: 'transparent',
                  color: '#343B32',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  '&::placeholder': {
                    color: '#92998E',
                    opacity: 1
                  }
                }}
              />

              {search && (
                <IconButton
                  size="small"
                  aria-label="Limpiar búsqueda"
                  onClick={() => setSearch('')}
                  sx={{
                    color: '#68745B',
                    p: 0.3
                  }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              )}
            </Box>

            <Button
              variant="contained"
              onClick={openClientModal}
              sx={{
                bgcolor: '#68745B',
                '&:hover': {
                  bgcolor: '#59634B'
                }
              }}
            >
              Registrar cliente
            </Button>

            <ToggleButtonGroup
              value={viewMode}
              exclusive
              size="small"
              onChange={handleViewChange}
              aria-label="Tipo de visualización"
              sx={{
                alignSelf: { xs: 'stretch', sm: 'center' },
                bgcolor: '#F1F4EE',
                borderRadius: 2.5,
                p: 0.4,
                gap: 0.5,
                '& .MuiToggleButtonGroup-grouped': {
                  border: 0,
                  borderRadius: '8px !important',
                  px: 2,
                  py: 0.9,
                  color: '#68745B',
                  textTransform: 'none',
                  fontWeight: 600,
                  '&.Mui-selected': {
                    bgcolor: '#FFFFFF',
                    color: '#354337',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                    '&:hover': {
                      bgcolor: '#FFFFFF'
                    }
                  }
                }
              }}
            >
              <ToggleButton value="cards" aria-label="Vista de tarjetas">
                Tarjetas
              </ToggleButton>

              <ToggleButton value="table" aria-label="Vista de tabla">
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
            description="Todavía no hay clientes registrados. Utiliza el botón Registrar cliente para comenzar."
            actionLabel="Registrar cliente"
            onAction={openClientModal}
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
                    {getClientInitials(client.name || 'Cliente')}
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

                <Stack spacing={1.5}>
                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={() => setSelectedClient(client)}
                    sx={secondaryButtonSx}
                  >
                    Ver perfil
                  </Button>

                  <Button
                    variant="contained"
                    fullWidth
                    onClick={() => handleCreateBooking(client)}
                    sx={{
                      bgcolor: '#68745B',
                      '&:hover': {
                        bgcolor: '#59634B'
                      }
                    }}
                  >
                    Reservar evento
                  </Button>
                </Stack>
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
                          {getClientInitials(client.name || 'Cliente')}
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
                      <Stack
                        direction="row"
                        spacing={1}
                        justifyContent="flex-end"
                      >
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => setSelectedClient(client)}
                          sx={{
                            color: '#526047',
                            borderColor: '#AAB8A1'
                          }}
                        >
                          Ver perfil
                        </Button>

                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => handleCreateBooking(client)}
                          sx={{
                            bgcolor: '#68745B',
                            '&:hover': {
                              bgcolor: '#59634B'
                            },
                            whiteSpace: 'nowrap'
                          }}
                        >
                          Reservar
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* VENTANA DE INFORMACIÓN DEL CLIENTE */}
      <Dialog
        open={Boolean(selectedClient)}
        onClose={closeDetails}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: 4,
            bgcolor: '#FFFFFF'
          }
        }}
      >
        {selectedClient && (
          <>
            <DialogTitle
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontFamily: 'Georgia, serif',
                color: '#343B32'
              }}
            >
              Perfil del cliente

              <IconButton
                onClick={closeDetails}
                aria-label="Cerrar perfil"
                sx={{
                  color: '#526047',
                  bgcolor: '#F1F4EE',
                  border: '1px solid #E2E5DD',
                  '&:hover': {
                    bgcolor: '#E2E9DB'
                  }
                }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </DialogTitle>

            <DialogContent dividers>
              <Stack spacing={3} sx={{ py: 2 }}>
                {/* ENCABEZADO DEL PERFIL */}
                <Stack
                  direction="row"
                  spacing={2}
                  alignItems="center"
                >
                  <Box
                    sx={{
                      width: 65,
                      height: 65,
                      borderRadius: '50%',
                      bgcolor: '#EEF0E9',
                      color: '#68745B',
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: 22,
                      fontWeight: 600
                    }}
                  >
                    {getClientInitials(selectedClient.name || 'Cliente')}
                  </Box>

                  <Box>
                    <Typography
                      variant="h5"
                      sx={{
                        fontFamily: 'Georgia, serif',
                        color: '#343B32'
                      }}
                    >
                      {selectedClient.name || 'Sin nombre'}
                    </Typography>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                    >
                      Cliente registrado en Luz & Memoria
                    </Typography>
                  </Box>
                </Stack>

                <Divider />

                {/* DATOS PERSONALES */}
                <Box>
                  <Typography
                    variant="overline"
                    sx={{
                      color: '#7B856D',
                      letterSpacing: 2
                    }}
                  >
                    INFORMACIÓN PERSONAL
                  </Typography>

                  <Stack spacing={2.5} sx={{ mt: 2 }}>
                    <ClientDetail
                      icon="hash"
                      label="Identificador"
                      value={selectedClient.id}
                    />

                    <ClientDetail
                      icon="user"
                      label="Nombre completo"
                      value={selectedClient.name}
                    />

                    <ClientDetail
                      icon="mail"
                      label="Correo electrónico"
                      value={selectedClient.email}
                    />

                    <ClientDetail
                      icon="phone"
                      label="Teléfono"
                      value={selectedClient.phone}
                    />

                    <ClientDetail
                      icon="map-pin"
                      label="Dirección"
                      value={selectedClient.address}
                    />
                  </Stack>
                </Box>

                <Divider />

                <AlertMessage />

                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => handleBooking(selectedClient.id)}
                  sx={{
                    bgcolor: '#68745B',
                    '&:hover': {
                      bgcolor: '#59634B'
                    }
                  }}
                >
                  Crear reservación para este cliente
                </Button>
              </Stack>
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  );
}

// ==============================|| COMPONENTES AUXILIARES ||============================== //

function ClientDetail({ icon, label, value }) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="center">
      <Box sx={{ color: '#68745B' }}>
        <Icon name={icon} />
      </Box>

      <Box>
        <Typography
          variant="caption"
          color="text.secondary"
        >
          {label}
        </Typography>

        <Typography
          variant="body2"
          sx={{
            color: '#343B32',
            fontWeight: 500
          }}
        >
          {value || 'No disponible'}
        </Typography>
      </Box>
    </Stack>
  );
}

function AlertMessage() {
  return (
    <Box
      sx={{
        bgcolor: '#F8F6F0',
        borderRadius: 2,
        p: 2
      }}
    >
      <Typography variant="body2" color="text.secondary">
        Esta información corresponde a los datos registrados en el directorio
        del estudio.
      </Typography>
    </Box>
  );
}
