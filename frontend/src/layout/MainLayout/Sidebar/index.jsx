import { useState } from 'react';
import Logo from '../../../ui-component/Logo';
import Icon from '../../../ui-component/Icon';
import LogoutConfirmDialog from '../../../ui-component/LogoutConfirmDialog';
import estudioMenu from '../../../menu-items/estudio';
import useStudio from '../../../hooks/useStudio';

export default function Sidebar() {
  const { page, navigateToPage, clients, handleLogout } = useStudio();
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  const availableItems = estudioMenu.children.filter((item) => item.enabled !== false);
  const sections = [...new Set(availableItems.map((item) => item.section))];

  return (
    <aside className="sidebar">
      <Logo iconSize={26} />
      <div className="workspace-label">{estudioMenu.title}</div>

      <nav aria-label="Navegación principal">
        {sections.map((section) => (
          <div key={section} className="sidebar-section">
            <div className="workspace-label">{section}</div>
            {availableItems.filter((item) => item.section === section).map((item) => (
              <button key={item.id} type="button" className={page === item.id ? 'active' : ''}
                aria-current={page === item.id ? 'page' : undefined}
                onClick={() => navigateToPage(item.id)}>
                <Icon name={item.icon} />
                {item.title}
                {item.showCountBadge && <span>{clients.length}</span>}
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div className="side-note">
        <span className="eyebrow">OPERACIÓN</span>
        <p>Las fechas se bloquean en calendario únicamente al confirmar el anticipo mínimo del 50 %.</p>
      </div>

      <button type="button" className="logout" onClick={() => setLogoutDialogOpen(true)}>
        <Icon name="logout" />
        Cerrar sesión
      </button>

      <LogoutConfirmDialog
        open={logoutDialogOpen}
        onClose={() => setLogoutDialogOpen(false)}
        onConfirm={handleLogout}
      />
    </aside>
  );
}
