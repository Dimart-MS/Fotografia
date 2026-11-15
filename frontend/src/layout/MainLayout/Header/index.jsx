import estudioMenu from '../../../menu-items/estudio';
import useStudio from '../../../hooks/useStudio';

// ==============================|| TOPBAR HEADER ||============================== //

export default function Header() {
  const { page } = useStudio();
  const currentItem =
    estudioMenu.children.find((item) => item.id === page) || estudioMenu.children[0];

  return (
    <header className="topbar">
      <span>
        Mi estudio <span className="slash">/</span>{' '}
        <strong>{currentItem.breadcrumb}</strong>
      </span>
      <div className="profile">
        <span className="profile-label">
          Fotógrafo
          <small>Espacio privado</small>
        </span>
        <span className="avatar">LM</span>
      </div>
    </header>
  );
}
