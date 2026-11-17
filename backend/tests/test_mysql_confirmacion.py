"""Prueba manual de confirmaciones en MySQL de pruebas."""

import getpass
from datetime import date

from sqlalchemy import MetaData, Table, create_engine, insert, select
from sqlalchemy.engine import URL

from app.infrastructure.repositories import ReservaRepository
from tests.database_safety import validate_test_database_url


def main():
    password = getpass.getpass("Contraseña de MySQL: ")

    url = URL.create(
        "mysql+pymysql",
        username="root",
        password=password,
        host="127.0.0.1",
        port=3306,
        database="fotografia_reservas_test",
    )

    validate_test_database_url(
        url.render_as_string(hide_password=False)
    )

    engine = create_engine(url, pool_pre_ping=True)
    ids_creados = []

    try:
        metadata = MetaData()
        bookings = Table("bookings", metadata, autoload_with=engine)
        repository = ReservaRepository(engine, bookings)

        fecha_prueba = date(2027, 12, 31)

        with engine.begin() as conn:
            existe = conn.execute(
                select(bookings.c.id).where(
                    bookings.c.event_date == fecha_prueba
                )
            ).first()

            if existe:
                raise RuntimeError(
                    "La fecha de prueba ya tiene reservas."
                )

            for numero in (1, 2):
                result = conn.execute(
                    insert(bookings).values(
                        client_id=99999,
                        client_name=f"Prueba MySQL {numero}",
                        event_date=fecha_prueba,
                        event_type="Boda",
                        package="foto",
                        total_cents=350000,
                        paid_cents=0,
                        status="Pendiente de anticipo",
                    )
                )

                ids_creados.append(
                    result.inserted_primary_key[0]
                )

        estado_1, _ = repository.get_by_id_and_confirm(
            ids_creados[0], 175000, date.today()
        )
        print("Primera confirmación:", estado_1)

        estado_2, _ = repository.get_by_id_and_confirm(
            ids_creados[1], 175000, date.today()
        )
        print("Segunda confirmación:", estado_2)

        assert estado_1 == "CONFIRMED"
        assert estado_2 == "DATE_CONFLICT"

        print("PRUEBA EXITOSA")

    finally:
        try:
            if ids_creados:
                with engine.begin() as conn:
                    conn.execute(
                        bookings.delete().where(
                            bookings.c.id.in_(ids_creados)
                        )
                    )
                print("Reservas de prueba eliminadas.")
        finally:
            engine.dispose()


if __name__ == "__main__":
    main()