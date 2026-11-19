
const estudioMenu = {
  id: 'mi-estudio',
  title: 'ADMINISTRACIÓN DEL ESTUDIO',
  type: 'group',
  children: [
    {
      id: 'inicio',
      title: 'Vista general',
      breadcrumb: 'Vista general',
      eyebrow: 'RESUMEN OPERATIVO',
      heading: 'Panel del estudio',
      subtitle: 'Indicadores, actividad y próximos eventos.',
      icon: 'home',
      section: 'PRINCIPAL'
    },
    {
      id: 'clientes',
      title: 'Clientes',
      breadcrumb: 'Clientes',
      eyebrow: 'GESTIÓN DE CLIENTES',
      heading: 'Directorio de clientes',
      subtitle: 'Información de clientes y eventos asociados.',
      icon: 'people',
      section: 'OPERACIONES',
      showCountBadge: true
    },
    {
      id: 'reservas',
      title: 'Agenda y reservas',
      breadcrumb: 'Reservaciones',
      eyebrow: 'GESTIÓN DE RESERVACIONES',
      heading: 'Agenda y reservaciones',
      subtitle: 'Disponibilidad, solicitudes y anticipos.',
      icon: 'calendar',
      section: 'OPERACIONES'
    },
    {
      id: 'paquetes',
      title: 'Paquetes',
      breadcrumb: 'Paquetes',
      eyebrow: 'CATÁLOGO',
      heading: 'Paquetes fotográficos',
      subtitle: 'Consulta y administración de paquetes.',
      icon: 'camera',
      section: 'CATÁLOGO',
      enabled: false
    },
    {
      id: 'servicios',
      title: 'Servicios',
      breadcrumb: 'Servicios',
      eyebrow: 'CATÁLOGO',
      heading: 'Servicios disponibles',
      subtitle: 'Servicios y coberturas del estudio.',
      icon: 'camera',
      section: 'CATÁLOGO',
      enabled: false
    },
    {
      id: 'ventas',
      title: 'Ventas',
      breadcrumb: 'Ventas',
      eyebrow: 'CONTROL FINANCIERO',
      heading: 'Gestión de ventas',
      subtitle: 'Operaciones comerciales y sus detalles.',
      icon: 'home',
      section: 'FINANZAS',
      enabled: false
    },
    {
      id: 'pagos',
      title: 'Pagos',
      breadcrumb: 'Pagos',
      eyebrow: 'CONTROL FINANCIERO',
      heading: 'Control de pagos',
      subtitle: 'Pagos, comprobantes y validaciones.',
      icon: 'check',
      section: 'FINANZAS',
      enabled: false
    },
    {
      id: 'galerias',
      title: 'Galerías',
      breadcrumb: 'Galerías',
      eyebrow: 'CONTENIDO FOTOGRÁFICO',
      heading: 'Galerías multimedia',
      subtitle: 'Fotografías y videos asociados a eventos.',
      icon: 'camera',
      section: 'CONTENIDO',
      enabled: false
    },
    {
      id: 'entregas',
      title: 'Entregas',
      breadcrumb: 'Entregas',
      eyebrow: 'SEGUIMIENTO',
      heading: 'Entregas de eventos',
      subtitle: 'Estado y seguimiento de las entregas.',
      icon: 'check',
      section: 'CONTENIDO',
      enabled: false
    },
    {
      id: 'notificaciones',
      title: 'Notificaciones',
      breadcrumb: 'Notificaciones',
      eyebrow: 'COMUNICACIÓN',
      heading: 'Centro de notificaciones',
      subtitle: 'Avisos y comunicaciones del sistema.',
      icon: 'calendar',
      section: 'ADMINISTRACIÓN',
      enabled: false
    },
    {
      id: 'configuracion',
      title: 'Configuración',
      breadcrumb: 'Configuración',
      eyebrow: 'ADMINISTRACIÓN',
      heading: 'Configuración del estudio',
      subtitle: 'Información y parámetros del negocio.',
      icon: 'home',
      section: 'ADMINISTRACIÓN',
      enabled: false
    }
  ]
};

export default estudioMenu;
