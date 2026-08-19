def test_health_needs_no_dependencies(anon_client):
    """Docker's healthcheck hits this on a box with no keys — it must answer."""
    res = anon_client.get("/api/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


def test_ready_reports_capabilities_without_leaking_values(anon_client):
    res = anon_client.get("/api/health/ready")
    assert res.status_code == 200
    body = res.json()
    assert body["capabilities"] == {
        "database": False,
        "auth": False,
        "vision": False,
    }
    # Booleans only — never a URL or a key.
    assert "supabase_url" not in str(body).lower()
    assert "postgresql://" not in str(body).lower()


def test_docs_are_available_outside_production(anon_client):
    assert anon_client.get("/docs").status_code == 200
