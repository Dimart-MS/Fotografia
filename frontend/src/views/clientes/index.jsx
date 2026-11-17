
import { Button, TextField } from '@mui/material';
import EmptyState from '../../ui-component/EmptyState';
import { getClientInitials, getLocalToday } from '../../utils/formatters';
import useStudio from '../../hooks/useStudio';

// ==============================|| VISTA DE DIRECTORIO DE CLIENTES (HU 06) ||============================== //

export default function ClientesView() {
  const {
    clients,
    search,
    setSearch,
    openClientModal,
    openBookingModal
  } = useStudio();

  const normalizedQuery = search.trim().toLowerCase();

  const filteredClients = clients.filter((client) =>
    `${client.name || ''} ${client.email || ''} ${client.phone || ''}`
      .toLowerCase()
      .includes(normalizedQuery)
  );

  return (
    <section className="panel">
      <div className="section-heading">
        <h2>
          Directorio <span className="count">{clients.length}</span>
        </h2>

        <TextField
          label="Buscar por nombre, correo o teléfono"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 320 }}
          size="small"
        />
      </div>

      {clients.length > 0 ? (
        filteredClients.length > 0 ? (
          <div className="client-grid">
            {filteredClients.map((client) => (
              <article className="client-card" key={client.id}>
                <div className="client-avatar">
                  {getClientInitials(client.name || 'Cliente')}
                </div>

                <h3>{client.name || 'Sin nombre'}</h3>

                <p>
                  {client.email || 'Sin correo registrado'}
                  <br />
                  {client.phone || 'Sin teléfono registrado'}
                </p>

                {client.address && (
                  <p className="address">{client.address}</p>
                )}

                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() =>
                    openBookingModal(getLocalToday(), client.id)
                  }
                >
                  Reservar evento <span className="button-arrow">↗</span>
                </Button>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            icon="search"
            title="No encontramos coincidencias"
            description="Intenta buscar con otro nombre, correo o teléfono."
          />
        )
      ) : (
        <EmptyState
          icon="people"
          iconSize={36}
          title="Sin clientes registrados"
          description="Registra el primer cliente para poder asignarle cotizaciones y reservas."
          actionLabel="Registrar cliente"
          onAction={openClientModal}
        />
      )}
    </section>
  );
}
