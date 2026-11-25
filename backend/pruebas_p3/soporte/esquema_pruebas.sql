-- Estructura LOCAL de pruebas. Usar importar_estructura.py. No ejecutar en Supabase.
-- Fuentes: archivos de fuentes/ y consultas de triggers/columna calculada del usuario.
-- No contiene registros ni credenciales.

CREATE TABLE public.clientes (
  id_cliente bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre character varying NOT NULL CHECK (length(btrim(nombre::text)) >= 3),
  telefono character varying NOT NULL CHECK (telefono::text ~ '^[0-9]{10}$'::text),
  correo character varying NOT NULL,
  domicilio character varying NOT NULL CHECK (length(btrim(domicilio::text)) >= 5),
  creado_en timestamp with time zone NOT NULL DEFAULT now(),
  actualizado_en timestamp with time zone NOT NULL DEFAULT now(),
  activo boolean NOT NULL DEFAULT true,
  CONSTRAINT clientes_pkey PRIMARY KEY (id_cliente)
);
CREATE TABLE public.usuarios (
  id_usuario bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_cliente bigint UNIQUE,
  correo character varying NOT NULL,
  contrasena_hash character varying,
  rol character varying NOT NULL CHECK (rol::text = ANY (ARRAY['Administrador'::character varying, 'Cliente'::character varying]::text[])),
  activo boolean NOT NULL DEFAULT true,
  registro_pendiente boolean NOT NULL DEFAULT false,
  creado_en timestamp with time zone NOT NULL DEFAULT now(),
  actualizado_en timestamp with time zone NOT NULL DEFAULT now(),
  debe_cambiar_contrasena boolean NOT NULL DEFAULT false,
  CONSTRAINT usuarios_pkey PRIMARY KEY (id_usuario),
  CONSTRAINT usuarios_id_cliente_fkey FOREIGN KEY (id_cliente) REFERENCES public.clientes(id_cliente)
);
CREATE TABLE public.servicios (
  id_servicio bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre character varying NOT NULL UNIQUE,
  descripcion text,
  precio_base_centavos bigint NOT NULL DEFAULT 0 CHECK (precio_base_centavos >= 0),
  activo boolean NOT NULL DEFAULT true,
  creado_en timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT servicios_pkey PRIMARY KEY (id_servicio)
);
CREATE TABLE public.paquetes (
  id_paquete bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  clave character varying NOT NULL UNIQUE,
  nombre character varying NOT NULL,
  descripcion text,
  precio_centavos bigint NOT NULL CHECK (precio_centavos > 0),
  activo boolean NOT NULL DEFAULT true,
  creado_en timestamp with time zone NOT NULL DEFAULT now(),
  actualizado_en timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT paquetes_pkey PRIMARY KEY (id_paquete)
);
CREATE TABLE public.paquete_servicios (
  id_paquete bigint NOT NULL,
  id_servicio bigint NOT NULL,
  cantidad integer NOT NULL DEFAULT 1 CHECK (cantidad > 0),
  CONSTRAINT paquete_servicios_pkey PRIMARY KEY (id_paquete, id_servicio),
  CONSTRAINT paquete_servicios_id_paquete_fkey FOREIGN KEY (id_paquete) REFERENCES public.paquetes(id_paquete),
  CONSTRAINT paquete_servicios_id_servicio_fkey FOREIGN KEY (id_servicio) REFERENCES public.servicios(id_servicio)
);
CREATE TABLE public.reservaciones (
  id_reservacion bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_cliente bigint NOT NULL,
  id_paquete bigint,
  fecha_evento date NOT NULL,
  tipo_evento character varying NOT NULL CHECK (tipo_evento::text = ANY (ARRAY['Boda'::character varying, 'XV años'::character varying, 'Bautizo'::character varying, 'Fiesta'::character varying, 'Otro'::character varying]::text[])),
  descripcion_evento text,
  domicilio_entrega character varying NOT NULL,
  telefono_contacto character varying NOT NULL CHECK (telefono_contacto::text ~ '^[0-9]{10}$'::text),
  total_centavos bigint NOT NULL CHECK (total_centavos > 0),
  porcentaje_anticipo_minimo numeric NOT NULL DEFAULT 50.00 CHECK (porcentaje_anticipo_minimo >= 0::numeric AND porcentaje_anticipo_minimo <= 100::numeric),
  estado character varying NOT NULL DEFAULT 'Pendiente de anticipo'::character varying CHECK (estado::text = ANY (ARRAY['Pendiente de anticipo'::character varying, 'Comprobante enviado'::character varying, 'Confirmada'::character varying, 'Realizada'::character varying, 'Entregada'::character varying, 'Cancelada'::character varying]::text[])),
  fecha_entrega_estimada date,
  observaciones text,
  creada_en timestamp with time zone NOT NULL DEFAULT now(),
  actualizada_en timestamp with time zone NOT NULL DEFAULT now(),
  fecha_limite_anticipo timestamp with time zone,
  decision_anticipo_pendiente boolean NOT NULL DEFAULT false,
  numero_prorrogas integer NOT NULL DEFAULT 0,
  CONSTRAINT reservaciones_pkey PRIMARY KEY (id_reservacion),
  CONSTRAINT reservaciones_id_cliente_fkey FOREIGN KEY (id_cliente) REFERENCES public.clientes(id_cliente),
  CONSTRAINT reservaciones_id_paquete_fkey FOREIGN KEY (id_paquete) REFERENCES public.paquetes(id_paquete)
);
CREATE TABLE public.bloqueos_agenda (
  id_bloqueo bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  fecha_inicio date NOT NULL,
  fecha_fin date NOT NULL,
  motivo character varying NOT NULL,
  id_usuario bigint NOT NULL,
  activo boolean NOT NULL DEFAULT true,
  creado_en timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT bloqueos_agenda_pkey PRIMARY KEY (id_bloqueo),
  CONSTRAINT bloqueos_agenda_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario)
);
CREATE TABLE public.historial_reservaciones (
  id_historial bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_reservacion bigint NOT NULL,
  id_usuario bigint,
  estado_anterior character varying,
  estado_nuevo character varying NOT NULL,
  comentario text,
  cambiado_en timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT historial_reservaciones_pkey PRIMARY KEY (id_historial),
  CONSTRAINT historial_reservaciones_id_reservacion_fkey FOREIGN KEY (id_reservacion) REFERENCES public.reservaciones(id_reservacion),
  CONSTRAINT historial_reservaciones_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario)
);
CREATE TABLE public.pagos (
  id_pago bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_reservacion bigint NOT NULL,
  monto_centavos bigint NOT NULL CHECK (monto_centavos > 0),
  metodo_pago character varying NOT NULL CHECK (metodo_pago::text = ANY (ARRAY['Transferencia'::character varying, 'Efectivo'::character varying, 'Deposito'::character varying, 'Tarjeta'::character varying, 'Otro'::character varying]::text[])),
  tipo_pago character varying NOT NULL CHECK (tipo_pago::text = ANY (ARRAY['Anticipo'::character varying, 'Abono'::character varying, 'Liquidacion'::character varying]::text[])),
  estado character varying NOT NULL DEFAULT 'Pendiente'::character varying CHECK (estado::text = ANY (ARRAY['Pendiente'::character varying, 'Aprobado'::character varying, 'Rechazado'::character varying, 'Anulado'::character varying]::text[])),
  referencia character varying,
  fecha_pago timestamp with time zone NOT NULL DEFAULT now(),
  fecha_validacion timestamp with time zone,
  validado_por bigint,
  observaciones text,
  creado_en timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT pagos_pkey PRIMARY KEY (id_pago),
  CONSTRAINT pagos_id_reservacion_fkey FOREIGN KEY (id_reservacion) REFERENCES public.reservaciones(id_reservacion),
  CONSTRAINT pagos_validado_por_fkey FOREIGN KEY (validado_por) REFERENCES public.usuarios(id_usuario)
);
CREATE TABLE public.comprobantes_pago (
  id_comprobante bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_pago bigint,
  id_usuario_remitente bigint NOT NULL,
  ruta_storage text NOT NULL,
  nombre_archivo character varying NOT NULL,
  tipo_mime character varying NOT NULL CHECK (tipo_mime::text = ANY (ARRAY['image/jpeg'::character varying, 'image/png'::character varying]::text[])),
  tamano_bytes bigint NOT NULL CHECK (tamano_bytes > 0 AND tamano_bytes <= 10485760),
  estado character varying NOT NULL DEFAULT 'Pendiente'::character varying CHECK (estado::text = ANY (ARRAY['Pendiente'::character varying, 'Aprobado'::character varying, 'Rechazado'::character varying]::text[])),
  motivo_rechazo text,
  revisado_por bigint,
  revisado_en timestamp with time zone,
  enviado_en timestamp with time zone NOT NULL DEFAULT now(),
  id_reservacion bigint NOT NULL,
  CONSTRAINT comprobantes_pago_pkey PRIMARY KEY (id_comprobante),
  CONSTRAINT comprobantes_pago_id_pago_fkey FOREIGN KEY (id_pago) REFERENCES public.pagos(id_pago),
  CONSTRAINT comprobantes_pago_id_usuario_remitente_fkey FOREIGN KEY (id_usuario_remitente) REFERENCES public.usuarios(id_usuario),
  CONSTRAINT comprobantes_pago_revisado_por_fkey FOREIGN KEY (revisado_por) REFERENCES public.usuarios(id_usuario),
  CONSTRAINT comprobantes_pago_id_reservacion_fkey FOREIGN KEY (id_reservacion) REFERENCES public.reservaciones(id_reservacion)
);
CREATE TABLE public.historial_validaciones_pago (
  id_validacion bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_comprobante bigint NOT NULL,
  id_usuario bigint NOT NULL,
  estado_anterior character varying,
  estado_nuevo character varying NOT NULL CHECK (estado_nuevo::text = ANY (ARRAY['Pendiente'::character varying, 'Aprobado'::character varying, 'Rechazado'::character varying]::text[])),
  motivo text,
  registrado_en timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT historial_validaciones_pago_pkey PRIMARY KEY (id_validacion),
  CONSTRAINT historial_validaciones_pago_id_comprobante_fkey FOREIGN KEY (id_comprobante) REFERENCES public.comprobantes_pago(id_comprobante),
  CONSTRAINT historial_validaciones_pago_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario)
);
CREATE TABLE public.ventas (
  id_venta bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_cliente bigint NOT NULL,
  id_reservacion bigint,
  id_usuario_vendedor bigint NOT NULL,
  total_centavos bigint NOT NULL DEFAULT 0 CHECK (total_centavos >= 0),
  estado character varying NOT NULL DEFAULT 'Pendiente'::character varying CHECK (estado::text = ANY (ARRAY['Pendiente'::character varying, 'Confirmada'::character varying, 'Cancelada'::character varying]::text[])),
  observaciones text,
  creada_en timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT ventas_pkey PRIMARY KEY (id_venta),
  CONSTRAINT ventas_id_cliente_fkey FOREIGN KEY (id_cliente) REFERENCES public.clientes(id_cliente),
  CONSTRAINT ventas_id_reservacion_fkey FOREIGN KEY (id_reservacion) REFERENCES public.reservaciones(id_reservacion),
  CONSTRAINT ventas_id_usuario_vendedor_fkey FOREIGN KEY (id_usuario_vendedor) REFERENCES public.usuarios(id_usuario)
);
CREATE TABLE public.detalle_ventas (
  id_detalle bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_venta bigint NOT NULL,
  id_servicio bigint,
  id_paquete bigint,
  descripcion character varying NOT NULL,
  cantidad integer NOT NULL DEFAULT 1 CHECK (cantidad > 0),
  precio_unitario_centavos bigint NOT NULL CHECK (precio_unitario_centavos >= 0),
  subtotal_centavos bigint GENERATED ALWAYS AS ((cantidad)::bigint * precio_unitario_centavos) STORED,
  CONSTRAINT detalle_ventas_pkey PRIMARY KEY (id_detalle),
  CONSTRAINT detalle_ventas_id_venta_fkey FOREIGN KEY (id_venta) REFERENCES public.ventas(id_venta),
  CONSTRAINT detalle_ventas_id_servicio_fkey FOREIGN KEY (id_servicio) REFERENCES public.servicios(id_servicio),
  CONSTRAINT detalle_ventas_id_paquete_fkey FOREIGN KEY (id_paquete) REFERENCES public.paquetes(id_paquete)
);
CREATE TABLE public.entregas (
  id_entrega bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_reservacion bigint NOT NULL UNIQUE,
  fecha_compromiso date NOT NULL,
  fecha_real date,
  domicilio character varying NOT NULL,
  estado character varying NOT NULL DEFAULT 'Pendiente'::character varying CHECK (estado::text = ANY (ARRAY['Pendiente'::character varying, 'En proceso'::character varying, 'Lista'::character varying, 'Entregada'::character varying]::text[])),
  observaciones text,
  actualizado_por bigint,
  creada_en timestamp with time zone NOT NULL DEFAULT now(),
  actualizada_en timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT entregas_pkey PRIMARY KEY (id_entrega),
  CONSTRAINT entregas_id_reservacion_fkey FOREIGN KEY (id_reservacion) REFERENCES public.reservaciones(id_reservacion),
  CONSTRAINT entregas_actualizado_por_fkey FOREIGN KEY (actualizado_por) REFERENCES public.usuarios(id_usuario)
);
CREATE TABLE public.historial_entregas (
  id_historial bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_entrega bigint NOT NULL,
  id_usuario bigint,
  estado_anterior character varying,
  estado_nuevo character varying NOT NULL,
  comentario text,
  registrado_en timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT historial_entregas_pkey PRIMARY KEY (id_historial),
  CONSTRAINT historial_entregas_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario),
  CONSTRAINT historial_entregas_id_entrega_fkey FOREIGN KEY (id_entrega) REFERENCES public.entregas(id_entrega)
);
CREATE TABLE public.galerias (
  id_galeria bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_reservacion bigint NOT NULL UNIQUE,
  titulo character varying NOT NULL,
  descripcion text,
  publicada boolean NOT NULL DEFAULT false,
  publicada_en timestamp with time zone,
  creada_en timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT galerias_pkey PRIMARY KEY (id_galeria),
  CONSTRAINT galerias_id_reservacion_fkey FOREIGN KEY (id_reservacion) REFERENCES public.reservaciones(id_reservacion)
);
CREATE TABLE public.fotografias (
  id_fotografia bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_galeria bigint NOT NULL,
  ruta_storage text NOT NULL UNIQUE,
  nombre_archivo character varying NOT NULL,
  tipo_mime character varying NOT NULL CHECK (tipo_mime::text = ANY (ARRAY['image/jpeg'::character varying, 'image/png'::character varying, 'image/webp'::character varying]::text[])),
  tamano_bytes bigint NOT NULL CHECK (tamano_bytes > 0),
  ancho_px integer CHECK (ancho_px > 0),
  alto_px integer CHECK (alto_px > 0),
  orden integer NOT NULL DEFAULT 0 CHECK (orden >= 0),
  subida_en timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT fotografias_pkey PRIMARY KEY (id_fotografia),
  CONSTRAINT fotografias_id_galeria_fkey FOREIGN KEY (id_galeria) REFERENCES public.galerias(id_galeria)
);
CREATE TABLE public.videos (
  id_video bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_galeria bigint NOT NULL,
  titulo character varying NOT NULL,
  url_externa text NOT NULL,
  proveedor character varying NOT NULL DEFAULT 'Otro'::character varying CHECK (proveedor::text = ANY (ARRAY['YouTube'::character varying, 'Vimeo'::character varying, 'Otro'::character varying, 'Supabase'::character varying]::text[])),
  orden integer NOT NULL DEFAULT 0 CHECK (orden >= 0),
  agregado_en timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT videos_pkey PRIMARY KEY (id_video),
  CONSTRAINT videos_id_galeria_fkey FOREIGN KEY (id_galeria) REFERENCES public.galerias(id_galeria)
);
CREATE TABLE public.configuracion_negocio (
  clave character varying NOT NULL,
  valor jsonb NOT NULL,
  descripcion text,
  actualizado_por bigint,
  actualizado_en timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT configuracion_negocio_pkey PRIMARY KEY (clave),
  CONSTRAINT configuracion_negocio_actualizado_por_fkey FOREIGN KEY (actualizado_por) REFERENCES public.usuarios(id_usuario)
);
CREATE TABLE public.auditoria (
  id_auditoria bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_usuario bigint,
  accion character varying NOT NULL,
  entidad character varying NOT NULL,
  id_registro bigint,
  detalles jsonb,
  registrada_en timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT auditoria_pkey PRIMARY KEY (id_auditoria),
  CONSTRAINT auditoria_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario)
);
CREATE TABLE public.notificaciones (
  id_notificacion bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_usuario bigint NOT NULL,
  titulo character varying NOT NULL,
  mensaje text NOT NULL,
  tipo character varying NOT NULL DEFAULT 'Informativa'::character varying,
  leida boolean NOT NULL DEFAULT false,
  creada_en timestamp with time zone NOT NULL DEFAULT now(),
  leida_en timestamp with time zone,
  CONSTRAINT notificaciones_pkey PRIMARY KEY (id_notificacion),
  CONSTRAINT notificaciones_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario)
);
CREATE TABLE public.dispositivos_usuario (
  id_dispositivo bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_usuario bigint NOT NULL,
  identificador character varying NOT NULL,
  plataforma character varying NOT NULL CHECK (plataforma::text = ANY (ARRAY['Android'::character varying, 'Web'::character varying]::text[])),
  token_notificacion text,
  activo boolean NOT NULL DEFAULT true,
  registrado_en timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT dispositivos_usuario_pkey PRIMARY KEY (id_dispositivo),
  CONSTRAINT dispositivos_usuario_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario)
);
CREATE TABLE public.historial_prorrogas_anticipo (
  id_prorroga bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_reservacion bigint NOT NULL,
  id_usuario_administrador bigint NOT NULL,
  fecha_limite_anterior timestamp with time zone NOT NULL,
  fecha_limite_nueva timestamp with time zone NOT NULL,
  motivo text NOT NULL CHECK (length(TRIM(BOTH FROM motivo)) > 0),
  registrada_en timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT historial_prorrogas_anticipo_pkey PRIMARY KEY (id_prorroga),
  CONSTRAINT historial_prorrogas_anticipo_id_reservacion_fkey FOREIGN KEY (id_reservacion) REFERENCES public.reservaciones(id_reservacion),
  CONSTRAINT historial_prorrogas_anticipo_id_usuario_administrador_fkey FOREIGN KEY (id_usuario_administrador) REFERENCES public.usuarios(id_usuario)
);
-- Indices adicionales; las PK y UNIQUE anteriores no se duplican.
CREATE INDEX ix_auditoria_entidad ON public.auditoria USING btree (entidad, id_registro, registrada_en);
CREATE INDEX ix_bloqueos_fechas ON public.bloqueos_agenda USING btree (fecha_inicio, fecha_fin) WHERE activo;
CREATE UNIQUE INDEX uq_clientes_correo ON public.clientes USING btree (lower((correo)::text));
CREATE INDEX idx_comprobantes_reservacion_estado ON public.comprobantes_pago USING btree (id_reservacion, estado);
CREATE INDEX ix_comprobantes_pago_estado ON public.comprobantes_pago USING btree (estado, enviado_en);
CREATE INDEX ix_comprobantes_pago_pago ON public.comprobantes_pago USING btree (id_pago);
CREATE INDEX ix_detalle_ventas_venta ON public.detalle_ventas USING btree (id_venta);
CREATE UNIQUE INDEX dispositivos_usuario_id_usuario_identificador_key ON public.dispositivos_usuario USING btree (id_usuario, identificador);
CREATE INDEX ix_entregas_pendientes ON public.entregas USING btree (fecha_compromiso) WHERE ((estado)::text <> 'Entregada'::text);
CREATE INDEX ix_fotografias_galeria ON public.fotografias USING btree (id_galeria, orden);
CREATE INDEX ix_historial_reservaciones_reserva ON public.historial_reservaciones USING btree (id_reservacion, cambiado_en);
CREATE INDEX ix_notificaciones_usuario ON public.notificaciones USING btree (id_usuario, leida, creada_en);
CREATE INDEX ix_pagos_reserva_estado ON public.pagos USING btree (id_reservacion, estado);
CREATE INDEX ix_reservaciones_cliente ON public.reservaciones USING btree (id_cliente);
CREATE INDEX ix_reservaciones_estado ON public.reservaciones USING btree (estado);
CREATE INDEX ix_reservaciones_fecha ON public.reservaciones USING btree (fecha_evento);
CREATE UNIQUE INDEX uq_reservacion_fecha_ocupada ON public.reservaciones USING btree (fecha_evento) WHERE ((estado)::text = ANY ((ARRAY['Confirmada'::character varying, 'Realizada'::character varying, 'Entregada'::character varying])::text[]));
CREATE UNIQUE INDEX uq_usuarios_correo ON public.usuarios USING btree (lower((correo)::text));
CREATE INDEX ix_ventas_reserva ON public.ventas USING btree (id_reservacion);
CREATE INDEX ix_videos_galeria ON public.videos USING btree (id_galeria, orden);

-- Actualizacion automatica de fechas, segun funciones del proyecto original.
CREATE FUNCTION public.actualizar_fecha_modificacion()
RETURNS trigger LANGUAGE plpgsql AS $funcion$
BEGIN
    NEW.actualizado_en = now();
    RETURN NEW;
END;
$funcion$;

CREATE FUNCTION public.actualizar_fecha_modificacion_femenina()
RETURNS trigger LANGUAGE plpgsql AS $funcion$
BEGIN
    NEW.actualizada_en = now();
    RETURN NEW;
END;
$funcion$;

CREATE TRIGGER trg_clientes_actualizacion
BEFORE UPDATE ON public.clientes
FOR EACH ROW EXECUTE FUNCTION public.actualizar_fecha_modificacion();

CREATE TRIGGER trg_usuarios_actualizacion
BEFORE UPDATE ON public.usuarios
FOR EACH ROW EXECUTE FUNCTION public.actualizar_fecha_modificacion();

CREATE TRIGGER trg_paquetes_actualizacion
BEFORE UPDATE ON public.paquetes
FOR EACH ROW EXECUTE FUNCTION public.actualizar_fecha_modificacion();

CREATE TRIGGER trg_entregas_actualizacion
BEFORE UPDATE ON public.entregas
FOR EACH ROW EXECUTE FUNCTION public.actualizar_fecha_modificacion_femenina();

CREATE TRIGGER trg_reservaciones_actualizacion
BEFORE UPDATE ON public.reservaciones
FOR EACH ROW EXECUTE FUNCTION public.actualizar_fecha_modificacion_femenina();
