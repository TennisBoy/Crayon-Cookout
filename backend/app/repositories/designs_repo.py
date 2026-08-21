"""Persistence for crayon designs.

The only module that knows designs live in a Postgres table. Services talk to
this; routes never do.

SQL is composed with `psycopg.sql`, never f-strings: `sort` and the patch keys
come from the request, so identifiers are whitelisted AND quoted rather than
interpolated. Values are always bound parameters.
"""
from typing import Any

from psycopg import Error as PgError
from psycopg import sql

from app.core.errors import NotFoundError, UpstreamError
from app.repositories.db import cursor, uuid_or_missing

TABLE = sql.Identifier("crayon_designs")

# Explicit column list: SELECT * would leak any column added later.
# id and user_id are cast to text because psycopg returns uuid.UUID objects and
# the response schemas declare `str`.
COLUMNS = sql.SQL(
    "id::text AS id, user_id::text AS user_id, name, colors, heights, shape, "
    "is_competition_entry, competition_email, created_date"
)

SORTABLE = {"created_date", "name"}
UPDATABLE = {
    "name",
    "colors",
    "heights",
    "shape",
    "is_competition_entry",
    "competition_email",
}


class DesignsRepository:
    def list_for_user(
        self, user_id: str, *, sort: str = "-created_date", limit: int = 50
    ) -> list[dict[str, Any]]:
        descending = sort.startswith("-")
        field = sort[1:] if descending else sort
        if field not in SORTABLE:
            field, descending = "created_date", True

        query = sql.SQL(
            "SELECT {cols} FROM {table} WHERE user_id = %(user_id)s "
            "ORDER BY {field} {direction} LIMIT %(limit)s"
        ).format(
            cols=COLUMNS,
            table=TABLE,
            field=sql.Identifier(field),
            direction=sql.SQL("DESC" if descending else "ASC"),
        )
        try:
            with cursor() as cur:
                cur.execute(
                    query,
                    {"user_id": uuid_or_missing(user_id, "design"), "limit": limit},
                )
                return cur.fetchall()
        except PgError as exc:
            raise UpstreamError(detail=f"list designs failed: {exc}") from exc

    def get(self, design_id: str, user_id: str) -> dict[str, Any]:
        query = sql.SQL(
            "SELECT {cols} FROM {table} "
            "WHERE id = %(id)s AND user_id = %(user_id)s LIMIT 1"
        ).format(cols=COLUMNS, table=TABLE)
        params = {
            "id": uuid_or_missing(design_id, "design"),
            "user_id": uuid_or_missing(user_id, "design"),
        }
        try:
            with cursor() as cur:
                cur.execute(query, params)
                row = cur.fetchone()
        except PgError as exc:
            raise UpstreamError(detail=f"get design failed: {exc}") from exc
        if not row:
            raise NotFoundError("That design does not exist.")
        return row

    def create(self, user_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        fields = [k for k in payload if k in UPDATABLE]
        params: dict[str, Any] = {k: payload[k] for k in fields}
        params["user_id"] = uuid_or_missing(user_id, "design")

        query = sql.SQL(
            "INSERT INTO {table} ({cols}) VALUES ({vals}) RETURNING {out}"
        ).format(
            table=TABLE,
            cols=sql.SQL(", ").join(
                [sql.Identifier("user_id")] + [sql.Identifier(f) for f in fields]
            ),
            vals=sql.SQL(", ").join(
                [sql.Placeholder("user_id")] + [sql.Placeholder(f) for f in fields]
            ),
            out=COLUMNS,
        )
        try:
            with cursor() as cur:
                cur.execute(query, params)
                row = cur.fetchone()
        except PgError as exc:
            raise UpstreamError(detail=f"create design failed: {exc}") from exc
        if not row:
            raise UpstreamError(detail="insert returned no row")
        return row

    def update(
        self, design_id: str, user_id: str, patch: dict[str, Any]
    ) -> dict[str, Any]:
        # Scoping the update by user_id means another user's id in the path
        # simply matches nothing, rather than mutating their row.
        fields = [k for k in patch if k in UPDATABLE]
        if not fields:
            return self.get(design_id, user_id)

        params: dict[str, Any] = {k: patch[k] for k in fields}
        params["id"] = uuid_or_missing(design_id, "design")
        params["user_id"] = uuid_or_missing(user_id, "design")

        query = sql.SQL(
            "UPDATE {table} SET {assignments} "
            "WHERE id = %(id)s AND user_id = %(user_id)s RETURNING {out}"
        ).format(
            table=TABLE,
            assignments=sql.SQL(", ").join(
                sql.SQL("{} = {}").format(sql.Identifier(f), sql.Placeholder(f))
                for f in fields
            ),
            out=COLUMNS,
        )
        try:
            with cursor() as cur:
                cur.execute(query, params)
                row = cur.fetchone()
        except PgError as exc:
            raise UpstreamError(detail=f"update design failed: {exc}") from exc
        if not row:
            raise NotFoundError("That design does not exist.")
        return row

    def delete(self, design_id: str, user_id: str) -> None:
        query = sql.SQL(
            "DELETE FROM {table} "
            "WHERE id = %(id)s AND user_id = %(user_id)s RETURNING id"
        ).format(table=TABLE)
        params = {
            "id": uuid_or_missing(design_id, "design"),
            "user_id": uuid_or_missing(user_id, "design"),
        }
        try:
            with cursor() as cur:
                cur.execute(query, params)
                row = cur.fetchone()
        except PgError as exc:
            raise UpstreamError(detail=f"delete design failed: {exc}") from exc
        if not row:
            raise NotFoundError("That design does not exist.")
