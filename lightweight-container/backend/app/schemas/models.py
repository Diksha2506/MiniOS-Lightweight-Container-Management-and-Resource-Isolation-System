from pydantic import BaseModel, field_validator, Field
import re


class CreateContainerRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=63)
    command: str = Field(default="/bin/sh", max_length=255)
    memory_mb: int = Field(default=0, ge=0, le=32768)
    cpu_pct: int = Field(default=0, ge=0, le=100)

    @field_validator("name")
    @classmethod
    def name_must_be_safe(cls, v: str) -> str:
        if not re.match(r"^[a-zA-Z0-9_-]+$", v):
            raise ValueError("Name may only contain letters, digits, hyphens and underscores.")
        return v


class ContainerResponse(BaseModel):
    name: str
    pid: int
    state: str
    mem_limit: int
    cpu_limit: int


class StatsResponse(BaseModel):
    name: str
    memory_mb: int | None
    cpu_time_ms: int | None


class ApiResponse(BaseModel):
    ok: bool
    message: str
