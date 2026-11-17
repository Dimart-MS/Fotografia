-- Migración 001
-- Proyecto: Luz & Memoria
-- Motor: MySQL 8.0
--
-- Objetivo:
-- Impedir que existan dos reservas confirmadas
-- para una misma fecha.
--
-- IMPORTANTE:
-- Antes de ejecutar esta migración:
-- 1. Realizar un respaldo de fotografia_reservas.
-- 2. Verificar que no existan fechas confirmadas duplicadas.
-- 3. Detener temporalmente las operaciones de reservas.
-- 4. Obtener autorización para modificar la base original.

ALTER TABLE fotografia_reservas.bookings

ADD COLUMN confirmed_event_date DATE
GENERATED ALWAYS AS (
    CASE
        WHEN status = 'Confirmada'
        THEN event_date
        ELSE NULL
    END
) STORED,

ADD UNIQUE INDEX uq_confirmed_event_date (
    confirmed_event_date
);