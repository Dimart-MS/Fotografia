
import { Button } from '@mui/material';
import Icon from './Icon';

// ==============================|| ESTADO VACÍO REUTILIZABLE ||============================== //

export default function EmptyState({
  icon = 'calendar',
  iconSize = 32,
  title,
  description,
  actionLabel,
  onAction
}) {
  return (
    <div className="empty" role="status">
      <Icon name={icon} size={iconSize} />

      {title && <h3>{title}</h3>}

      {description && <p>{description}</p>}

      {actionLabel && onAction && (
        <Button onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
