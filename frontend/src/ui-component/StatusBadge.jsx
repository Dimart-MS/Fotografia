
// ==============================|| INSIGNIA DE ESTADO DE RESERVA ||============================== //

export default function StatusBadge({ status }) {
  const statusConfig = {
    Confirmada: {
      modifierClass: 'confirmed',
      displayLabel: 'Confirmada'
    },
    Cancelada: {
      modifierClass: 'cancelled',
      displayLabel: 'Cancelada'
    },
    'Pendiente de anticipo': {
      modifierClass: 'pending',
      displayLabel: 'Por confirmar'
    }
  };

  const config = statusConfig[status] || {
    modifierClass: 'unknown',
    displayLabel: status || 'Sin estado'
  };

  return (
    <span className={`badge ${config.modifierClass}`}>
      {config.displayLabel}
    </span>
  );
}
