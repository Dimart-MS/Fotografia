// ==============================|| MENU ITEMS - ESTUDIO ||============================== //

const estudioMenu = {
  id: 'mi-estudio',
  title: 'MENÚ PRINCIPAL',
  type: 'group',
  children: [
    {
      id: 'inicio',
      title: 'Vista general',
      breadcrumb: 'Vista general',
      eyebrow: 'RESUMEN OPERATIVO',
      heading: 'Panel del estudio',
      subtitle: 'Resumen de actividad, indicadores y próximos eventos programados.',
      icon: 'home'
    },
    {
      id: 'clientes',
      title: 'Clientes',
      breadcrumb: 'Clientes',
      eyebrow: 'CARTERA DE CLIENTES',
      heading: 'Directorio de clientes',
      subtitle: 'Consulta de datos de contacto, domicilios de entrega y asignación de eventos.',
      icon: 'people',
      showCountBadge: true
    },
    {
      id: 'reservas',
      title: 'Agenda y reservas',
      breadcrumb: 'Agenda y reservas',
      eyebrow: 'CONTROL DE FECHAS Y ANTICIPOS',
      heading: 'Agenda y reservas',
      subtitle: 'Disponibilidad mensual, solicitudes pendientes y confirmación de anticipos.',
      icon: 'calendar'
    },
    {
    id: 'paquetes',
    title: 'Paquetes',
    breadcrumb: 'Paquetes',
    eyebrow: 'CATÁLOGO DE SERVICIOS',
    heading: 'Paquetes fotográficos',
    subtitle: 'Administra los paquetes, precios y servicios que ofrece el estudio.',
    icon: 'package'
  }
  ]
};

export default estudioMenu;
