"""Request models. Responses stay as typed dicts so the ML schema can evolve."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

Season = Literal["spring", "summer", "autumn", "winter"]
TimeOfDay = Literal["day", "evening", "night"]
Gender = Literal["any", "men", "women"]


class FilterRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    families: list[str] = Field(default_factory=list)
    seasons: list[Season] = Field(default_factory=list)
    times: list[TimeOfDay] = Field(default_factory=list)
    notes: list[str] = Field(default_factory=list, max_length=20)
    budget_max: int | None = Field(default=None, ge=1, le=4)
    gender: Gender = "any"
    query: str | None = Field(default=None, max_length=80)
    strict: bool = False


class ProfileRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    loved_ids: list[str] = Field(default_factory=list, max_length=50)
    love_notes: list[str] = Field(default_factory=list, max_length=40)
    avoid_notes: list[str] = Field(default_factory=list, max_length=30)
    families: list[str] = Field(default_factory=list, max_length=10)
    seasons: list[Season] = Field(default_factory=list)
    times: list[TimeOfDay] = Field(default_factory=list)
    budget_tier: int | None = Field(default=None, ge=1, le=4)
    budget: int | None = Field(default=None, ge=1, le=4)
    gender: Gender = "any"
    limit: int = Field(default=12, ge=1, le=50)
    exclude_ids: list[str] = Field(default_factory=list, max_length=50)
    filters: FilterRequest = Field(default_factory=FilterRequest)

    @field_validator("loved_ids", "exclude_ids")
    @classmethod
    def _trim_ids(cls, values: list[str]) -> list[str]:
        return [value.strip() for value in values if value.strip()]

    @model_validator(mode="after")
    def _budget_alias(self) -> ProfileRequest:
        if self.budget_tier is None and self.budget is not None:
            self.budget_tier = self.budget
        return self
