import Icon from './Icon';
import { STUDIO_CONFIG } from '../config';

// ==============================|| LOGO DE MARCA (LUZ & MEMORIA) ||============================== //

export default function Logo({ iconSize = 28 }) {
  return (
    <div className="brand">
      <Icon name="camera" size={iconSize} />
      <span>
        {STUDIO_CONFIG.brandName}
        <small>{STUDIO_CONFIG.brandSubtitle}</small>
      </span>
    </div>
  );
}
