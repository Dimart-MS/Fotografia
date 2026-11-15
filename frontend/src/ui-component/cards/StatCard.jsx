import Icon from '../Icon';

// ==============================|| TARJETA DE INDICADOR (KPI STAT CARD) ||============================== //

export default function StatCard({ count, label, icon }) {
  const formattedCount = String(count).padStart(2, '0');

  return (
    <div className="stat">
      <span className="stat-icon">
        <Icon name={icon} />
      </span>
      <div>
        <strong>{formattedCount}</strong>
        <span>{label}</span>
      </div>
      <span className="stat-line" />
    </div>
  );
}
