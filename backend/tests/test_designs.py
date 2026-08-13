"""Design CRUD, validation, and per-user scoping."""
from tests.conftest import OTHER_USER_ID

VALID = {
    "name": "Sunset",
    "colors": ["#EF4444", "#3B82F6"],
    "heights": [0.5, 0.5],
    "shape": "crayon",
}


def test_create_then_list_round_trip(client):
    created = client.post("/api/designs", json=VALID)
    assert created.status_code == 201
    body = created.json()
    assert body["name"] == "Sunset"
    assert body["id"] and body["created_date"]

    listed = client.get("/api/designs")
    assert listed.status_code == 200
    assert [d["name"] for d in listed.json()] == ["Sunset"]


def test_list_is_newest_first(client):
    client.post("/api/designs", json={**VALID, "name": "first"})
    client.post("/api/designs", json={**VALID, "name": "second"})
    names = [d["name"] for d in client.get("/api/designs").json()]
    assert names == ["second", "first"]


def test_colors_and_heights_must_pair_up(client):
    res = client.post(
        "/api/designs", json={**VALID, "colors": ["#EF4444"], "heights": [0.5, 0.5]}
    )
    assert res.status_code == 422
    assert "matching height" in res.json()["error"]["message"]


def test_rejects_non_hex_colour(client):
    res = client.post("/api/designs", json={**VALID, "colors": ["red"], "heights": [1]})
    assert res.status_code == 422
    assert res.json()["error"]["code"] == "validation_error"


def test_rejects_unknown_shape(client):
    res = client.post("/api/designs", json={**VALID, "shape": "trapezoid"})
    assert res.status_code == 422


def test_rejects_zero_height(client):
    res = client.post(
        "/api/designs", json={**VALID, "colors": ["#EF4444"], "heights": [0]}
    )
    assert res.status_code == 422


def test_rejects_unknown_field(client):
    res = client.post("/api/designs", json={**VALID, "user_id": "someone-else"})
    assert res.status_code == 422


def test_update_merges_and_keeps_other_fields(client):
    design_id = client.post("/api/designs", json=VALID).json()["id"]
    res = client.patch(
        f"/api/designs/{design_id}",
        json={"is_competition_entry": True, "competition_email": "a@b.com"},
    )
    assert res.status_code == 200
    assert res.json()["is_competition_entry"] is True
    assert res.json()["name"] == "Sunset"


def test_competition_entry_requires_an_email(client):
    design_id = client.post("/api/designs", json=VALID).json()["id"]
    res = client.patch(f"/api/designs/{design_id}", json={"is_competition_entry": True})
    assert res.status_code == 422
    assert "contact email" in res.json()["error"]["message"]


def test_empty_patch_is_rejected(client):
    design_id = client.post("/api/designs", json=VALID).json()["id"]
    assert client.patch(f"/api/designs/{design_id}", json={}).status_code == 422


def test_delete_removes_it(client):
    design_id = client.post("/api/designs", json=VALID).json()["id"]
    assert client.delete(f"/api/designs/{design_id}").status_code == 204
    assert client.get("/api/designs").json() == []


def test_unknown_id_is_404(client):
    assert client.patch("/api/designs/nope", json={"name": "x"}).status_code == 404
    assert client.delete("/api/designs/nope").status_code == 404


def test_cannot_touch_another_users_design(client, repo):
    """The decisive isolation test: another user's row is invisible, not just
    unreadable."""
    repo.rows.append(
        {
            "id": "theirs",
            "user_id": OTHER_USER_ID,
            "name": "Not yours",
            "colors": ["#000000"],
            "heights": [1.0],
            "shape": "crayon",
            "created_date": "2026-01-01T00:00:00Z",
            "is_competition_entry": False,
            "competition_email": None,
        }
    )
    assert client.get("/api/designs").json() == []
    assert client.patch("/api/designs/theirs", json={"name": "hacked"}).status_code == 404
    assert client.delete("/api/designs/theirs").status_code == 404
    assert repo.rows[0]["name"] == "Not yours"


def test_list_limit_is_capped(client):
    assert client.get("/api/designs?limit=5000").status_code == 422
