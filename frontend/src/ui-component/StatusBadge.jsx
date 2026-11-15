// ==============================|| INSIGNIA DE ESTADO DE RESERVA ||============================== //

export default function StatusBadge({ status }) {
  const modifierClass =
    status === 'Confirmada'
      ? 'confirmed'
      : status === 'Cancelada'
        ? 'cancelled'
        : 'pending';

  const displayLabel = status === 'Pendiente de anticipo' ? 'Por confirmar' : status;

  return <span className={`badge ${modifierClass}`}>{displayLabel}</span>;
}
