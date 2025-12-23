import os
import sys
import copy

# Ensure src is on path
ROOT = os.path.dirname(os.path.dirname(__file__))
sys.path.insert(0, os.path.join(ROOT, "src"))

from fastapi.testclient import TestClient
from app import app, activities

client = TestClient(app)

# Keep a pristine copy of activities so tests are isolated
INITIAL = copy.deepcopy(activities)

import pytest


@pytest.fixture(autouse=True)
def reset_activities():
    # reset before each test
    activities.clear()
    activities.update(copy.deepcopy(INITIAL))
    yield
    # reset after test
    activities.clear()
    activities.update(copy.deepcopy(INITIAL))


def test_get_activities():
    r = client.get("/activities")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, dict)
    # spot-check a few known activities
    assert "Basketball Team" in data
    assert "Chess Club" in data


def test_signup_and_reflection():
    activity = "Basketball Team"
    email = "testuser@example.com"

    # signup
    r = client.post(f"/activities/{activity}/signup", params={"email": email})
    assert r.status_code == 200
    assert f"Signed up {email}" in r.json().get("message", "")

    # verify participant in activity
    r = client.get("/activities")
    data = r.json()
    assert email in data[activity]["participants"]


def test_signup_duplicate_fails():
    activity = "Chess Club"
    email = "michael@mergington.edu"  # already present in initial data

    r = client.post(f"/activities/{activity}/signup", params={"email": email})
    assert r.status_code == 400


def test_remove_participant_success():
    activity = "Chess Club"
    email = "michael@mergington.edu"

    # ensure present
    assert email in activities[activity]["participants"]

    # delete
    r = client.delete(f"/activities/{activity}/participants", params={"email": email})
    assert r.status_code == 200
    assert f"Removed {email}" in r.json().get("message", "")

    # verify removal
    assert email not in activities[activity]["participants"]


def test_remove_nonexistent_participant_fails():
    activity = "Basketball Team"
    email = "nonexistent@example.com"

    r = client.delete(f"/activities/{activity}/participants", params={"email": email})
    assert r.status_code == 404
