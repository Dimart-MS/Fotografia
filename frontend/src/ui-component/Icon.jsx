// ==============================|| ICONOGRAFÍA VECTORIAL DEL ESTUDIO ||============================== //

const ICON_PATHS = {
  home: 'M3 10 12 3l9 7v10H3Z M9 20v-7h6v7',
  people:
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M17 4a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87',
  calendar: 'M4 5h16v16H4Z M16 3v4 M8 3v4 M4 11h16',
  camera: 'M3 7h4l2-3h6l2 3h4v13H3Z M16 13a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  arrow: 'M4 12h16 M14 6l6 6-6 6',
  plus: 'M12 5v14 M5 12h14',
  logout: 'M9 4H3v16h6 M10 12h11 M16 7l5 5-5 5',
  check: 'm5 12 4 4L19 6',
  search: 'M16 16l5 5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0'
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
