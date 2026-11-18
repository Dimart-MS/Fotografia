"""
Modelos de dominio y definición de tablas SQLAlchemy.
Soporta MySQL (Laragon), PostgreSQL y SQLite.
"""
from sqlalchemy import Column, Computed, Date, Index, Integer, MetaData, String, Table

# Catálogo oficial de paquetes fotográficos (importes expresados en centavos MXN)
PACKAGES: dict[str, dict[str, str | int]] = {
    "foto": {
        "name": "Fotografía",
        "price_cents": 350000,
    },
    "video": {
        "name": "Video",
        "price_cents": 450000,
    },
    "combinado": {
        "name": "Fotografía y video",
        "price_cents": 700000,
    },
}


def build_clients_table(metadata: MetaData) -> Table:
    """Construye la definición de la tabla `clients`."""
    return Table(
        "clients",
        metadata,
        Column("id", Integer, primary_key=True, autoincrement=True),
        Column("name", String(100), nullable=False),
        Column("phone", String(10), nullable=False),
        Column("email", String(160), nullable=False, unique=True),
        Column("address", String(250), nullable=False),
    )


def build_bookings_table(metadata: MetaData, dialect_name: str = "sqlite") -> Table:
    """
    Construye la definición de la tabla `bookings`.
    En SQLite y PostgreSQL añade índice único parcial; en MySQL la unicidad de fecha
    confirmada se garantiza mediante bloqueo transaccional en el repositorio.
    """
    bookings_table = Table(
        "bookings",
        metadata,
        Column("id", Integer, primary_key=True, autoincrement=True),
        Column("client_id", Integer, nullable=False),
        Column("client_name", String(100), nullable=False),
        Column("event_date", Date, nullable=False, index=True),
        Column("event_type", String(30), nullable=False),
        Column("package", String(20), nullable=False),
        Column("total_cents", Integer, nullable=False),
        Column("paid_cents", Integer, nullable=False, default=0),
        Column("status", String(30), nullable=False, default="Pendiente de anticipo"),
        *(
            [Column(
                "confirmed_event_date",
                Date,
                Computed("CASE WHEN status = 'Confirmada' THEN event_date ELSE NULL END", persisted=True,),
                nullable=True,
            )]
            if dialect_name == "mysql"
            else []
        ),
    )
    if dialect_name == "mysql":
        Index(
            "uq_confirmed_event_date",
            bookings_table.c.confirmed_event_date,
            unique=True,
        )

    if dialect_name != "mysql":
        confirmed_condition = bookings_table.c.status == "Confirmada"
        Index(
            "one_confirmed_booking_per_day",
            bookings_table.c.event_date,
            unique=True,
            sqlite_where=confirmed_condition,
            postgresql_where=confirmed_condition,
        )

    return bookings_table


def build_users_table(metadata: MetaData) -> Table:
    """
    Define la tabla de usuarios para autenticación y roles.

    Cada cuenta puede tener el rol Administrador o Cliente.
    Las contraseñas se almacenan mediante hash.
    """
    return Table(
        "users",
        metadata,
        Column("id", Integer, primary_key=True, autoincrement=True),
        Column("client_id", Integer, nullable=True),
        Column("email", String(160), nullable=False, unique=True),
        Column("password_hash", String(255), nullable=False),
        Column("role", String(20), nullable=False, default="Cliente"),
        Column("is_active", Integer, nullable=False, default=1),
    )
