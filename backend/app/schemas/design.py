"""Design request/response shapes.

These mirror what the frontend's `lib/adapters/designs.js` already sends and
reads, so the adapter swap is a transport change, not a data-model change.
"""
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field

HexColor = Annotated[str, Field(pattern=r"^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$")]

# Kept in step with SHAPES in frontend/src/lib/premium.js.
ALLOWED_SHAPES = ("crayon", "star", "heart", "diamond", "hexagon", "flower")
Shape = Annotated[str, Field(pattern=r"^(crayon|star|heart|diamond|hexagon|flower)$")]


class DesignBase(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    colors: list[HexColor] = Field(min_length=1, max_length=64)
    heights: list[float] = Field(min_length=1, max_length=64)
    shape: Shape = "crayon"


class DesignCreate(DesignBase):
    model_config = ConfigDict(extra="forbid")


class DesignUpdate(BaseModel):
    """Every field optional — this backs a PATCH."""

    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1, max_length=120)
    colors: list[HexColor] | None = Field(default=None, min_length=1, max_length=64)
    heights: list[float] | None = Field(default=None, min_length=1, max_length=64)
    shape: Shape | None = None
    is_competition_entry: bool | None = None
    competition_email: str | None = Field(default=None, max_length=320)


class DesignOut(DesignBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_date: datetime
    is_competition_entry: bool = False
    competition_email: str | None = None
