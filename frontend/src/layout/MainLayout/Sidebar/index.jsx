import Logo from '../../../ui-component/Logo';
import Icon from '../../../ui-component/Icon';
import estudioMenu from '../../../menu-items/estudio';
import useStudio from '../../../hooks/useStudio';

// ==============================|| SIDEBAR NAVIGATION ||============================== //

export default function Sidebar() {
  const { page, navigateToPage, clients, handleLogout } = useStudio();

  return (
    <aside className="sidebar">
      <Logo iconSize={26} />

      <div className="workspace-label">{estudioMenu.title}</div>

      <nav aria-label="Navegación principal">
        {estudioMenu.children.map((item) => (
          <button
            key={item.id}
            type="button"
            className={page === item.id ? 'active' : ''}
            onClick={() => navigateToPage(item.id)}
          >
            <Icon name={item.icon} />
            {item.title}
            {item.showCountBadge && <span>{clients.length}</span>}
          </button>
        ))}
      </nav>

      <div className="side-note">
        <span className="eyebrow">OPERACIÓN</span>
        <p>
          Las fechas se bloquean en calendario únicamente al confirmar el
          anticipo mínimo del 50 %.
        </p>
      </div>

      <button type="button" className="logout" onClick={handleLogout}>
        <Icon name="logout" />
        Cerrar sesión
      </button>
    </aside>
  );
}
