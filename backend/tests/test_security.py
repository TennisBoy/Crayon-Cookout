"""Properties that must hold regardless of what the routes do."""
import pytest

from app.config import Settings
from app.core.errors import ServiceUnavailableError
from app.services.vision_service import VisionService


class TestRoutesAreProtected:
    """Every data route must reject an unauthenticated caller."""

    @pytest.mark.parametrize(
        ("method", "path"),
        [
            ("get", "/api/designs"),
            ("post", "/api/designs"),
            ("patch", "/api/designs/abc"),
            ("delete", "/api/designs/abc"),
            ("get", "/api/auth/me"),
            ("post", "/api/vision/verify-crayon"),
        ],
    )
    def test_requires_a_bearer_token(self, anon_client, method, path):
        res = getattr(anon_client, method)(path)
        assert res.status_code == 401, f"{method.upper()} {path} was not protected"
        assert res.json()["error"]["code"] == "unauthenticated"

    def test_malformed_authorization_header_is_rejected(self, anon_client):
        for header in ("", "Bearer", "Basic abc", "Bearer    "):
            res = anon_client.get(
                "/api/auth/me", headers={"Authorization": header}
            )
            assert res.status_code == 401


class TestConfigRefusesUnsafeValues:
    def test_wildcard_cors_origin_is_rejected(self):
        with pytest.raises(ValueError, match="exact origins"):
            Settings(cors_origins="*")

    def test_wildcard_inside_a_list_is_rejected(self):
        with pytest.raises(ValueError):
            Settings(cors_origins="https://app.example.com,*")

    def test_production_hides_interactive_docs(self):
        assert Settings(environment="production").is_production is True


class TestVisionFailsClosed:
    def test_unconfigured_raises_rather_than_answering_false(self):
        """A stub that returns `matched: False` would look like a working
        anti-cheat while verifying nothing."""
        service = VisionService()
        service.settings = Settings(anthropic_api_key="")
        with pytest.raises(ServiceUnavailableError):
            service.verify_crayon_photo(b"x", "image/png", "butterfly", "#A855F7")

    @pytest.mark.parametrize(
        ("text", "expected"),
        [
            ('{"matched": true}', True),
            ('{"matched": false}', False),
            ('```json\n{"matched": true}\n```', True),
            ("Sure! {\"matched\": true}", True),
            ("not json at all", False),
            ("", False),
            ('{"matched": "yes"}', True),
            ("{}", False),
        ],
    )
    def test_verdict_parsing(self, text, expected):
        assert VisionService._parse_matched(text) is expected

    def test_unparseable_output_fails_closed(self):
        assert VisionService._parse_matched("I cannot tell") is False
