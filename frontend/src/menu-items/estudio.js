
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
      breadcrumb: 'Agenda y reservas',
      eyebrow: 'CONTROL DE FECHAS Y ANTICIPOS',
      heading: 'Agenda y reservas',
      subtitle: 'Disponibilidad mensual, solicitudes pendientes y confirmación de anticipos.',
      icon: 'calendar',
      section: 'OPERACIONES'
    },
    {
      id: 'paquetes',
      title: 'Paquetes',
      breadcrumb: 'Paquetes',
      eyebrow: 'CATÁLOGO DE SERVICIOS',
      heading: 'Paquetes fotográficos',
      subtitle: 'Administra los paquetes, precios y servicios que ofrece el estudio.',
      icon: 'package',
      section: 'CATÁLOGO'
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
      icon: 'check',
      section: 'FINANZAS'
    },
    {
      id: 'pagos',
      title: 'Pagos y comprobantes',
      breadcrumb: 'Pagos y comprobantes',
      eyebrow: 'CONTROL FINANCIERO',
      heading: 'Pagos y comprobantes',
      subtitle: 'Consulta pagos, revisa comprobantes y valida anticipos.',
      icon: 'check',
      section: 'FINANZAS'
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
      enabled: true
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
      enabled: true
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
