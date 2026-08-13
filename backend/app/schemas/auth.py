"""Auth request/response shapes.

Field names match what `frontend/src/lib/adapters/auth.js` already passes, so
the adapter only swaps its transport.
"""
from pydantic import BaseModel, ConfigDict, EmailStr, Field

# Long enough to matter, short enough not to annoy a parent setting up an
# account on a phone. Complexity rules are deliberately not enforced —
# length is the property that actually helps.
Password = Field(min_length=8, max_length=128)


class SignUpRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: EmailStr
    password: str = Password


class SignInRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class VerifyOtpRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: EmailStr
    code: str = Field(min_length=4, max_length=10, pattern=r"^\d+$")


class EmailOnlyRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    model_config = ConfigDict(extra="forbid")
    token: str = Field(min_length=1, max_length=512)
    new_password: str = Password


class UserOut(BaseModel):
    id: str
    email: str | None = None


class SessionOut(BaseModel):
    access_token: str
    refresh_token: str | None = None
    user: UserOut


class MessageOut(BaseModel):
    """Deliberately contentless.

    Used by the flows that must not reveal whether an account exists.
    """

    message: str
