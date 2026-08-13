"""Design CRUD.

Backs the frontend's `lib/adapters/designs.js`. Every route is scoped to the
authenticated caller — there is no way to address another user's design.
"""
from fastapi import APIRouter, Query, status

from app.api.deps import CurrentUser, DesignsDep
from app.schemas.design import DesignCreate, DesignOut, DesignUpdate

router = APIRouter(prefix="/designs", tags=["designs"])


@router.get("", response_model=list[DesignOut])
def list_designs(
    user: CurrentUser,
    service: DesignsDep,
    sort: str = Query("-created_date", max_length=32),
    limit: int = Query(50, ge=1, le=100),
) -> list[dict]:
    return service.list(user.id, sort=sort, limit=limit)


@router.post("", response_model=DesignOut, status_code=status.HTTP_201_CREATED)
def create_design(
    payload: DesignCreate, user: CurrentUser, service: DesignsDep
) -> dict:
    return service.create(user.id, payload)


@router.patch("/{design_id}", response_model=DesignOut)
def update_design(
    design_id: str, payload: DesignUpdate, user: CurrentUser, service: DesignsDep
) -> dict:
    return service.update(design_id, user.id, payload)


@router.delete("/{design_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_design(design_id: str, user: CurrentUser, service: DesignsDep) -> None:
    service.delete(design_id, user.id)
