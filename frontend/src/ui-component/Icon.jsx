// ==============================|| ICONOGRAFÍA VECTORIAL DEL ESTUDIO ||============================== //

const ICON_PATHS = {
  // ICONOS EXISTENTES
  home: 'M3 10 12 3l9 7v10H3Z M9 20v-7h6v7',
  people:
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M17 4a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87',
  calendar: 'M4 5h16v16H4Z M16 3v4 M8 3v4 M4 11h16',
  camera: 'M3 7h4l2-3h6l2 3h4v13H3Z M16 13a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  arrow: 'M4 12h16 M14 6l6 6-6 6',
  plus: 'M12 5v14 M5 12h14',
  logout: 'M9 4H3v16h6 M10 12h11 M16 7l5 5-5 5',
  check: 'm5 12 4 4L19 6',
  search: 'M16 16l5 5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',

  // VISTA GENERAL
  'layout-dashboard':
    'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',

  // CLIENTES
  'users-round':
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M17 4a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87',

  // AGENDA Y RESERVAS
  'calendar-days':
    'M8 2v4 M16 2v4 M3 10h18 M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z M8 14h.01 M12 14h.01 M16 14h.01 M8 18h.01 M12 18h.01',

  // PAQUETES
  package:
    'M12 2 21 7v10l-9 5-9-5V7z M3 7l9 5 9-5 M12 12v10',

  // VENTAS
  'shopping-bag':
    'M5 8h14l1 13H4L5 8z M9 9V6a3 3 0 0 1 6 0v3',

  // PAGOS Y COMPROBANTES
  'receipt-text':
    'M4 3h16v18l-4-2-4 2-4-2-4 2V3z M8 8h8 M8 12h8 M8 16h5',

  // GALERÍAS
  images:
    'M4 3h13a2 2 0 0 1 2 2v13 M7 6h13a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z M8 17l4-4 3 3 2-2 4 4 M10 10h.01',

  // ENTREGAS
  'package-check':
    'M12 2 21 7v10l-9 5-9-5V7z M3 7l9 5 9-5 M12 12v10 M9 17l2 2 4-4'
};

export default function Icon({ name = 'camera', size = 20 }) {
  const pathData = ICON_PATHS[name] || ICON_PATHS.camera;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={pathData} />
    </svg>
  );
}
