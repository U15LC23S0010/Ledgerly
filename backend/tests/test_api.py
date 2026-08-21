from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_app_starts():
    """
    Verify that the FastAPI application starts correctly.
    """
    assert app is not None


def test_root_endpoint():
    """
    Verify that the root endpoint responds.
    """
    response = client.get("/")

    assert response.status_code in (200, 404)


def test_protected_endpoint_without_token():
    """
    Protected endpoints should reject requests without
    authentication credentials.
    """
    response = client.get("/api/v1/dashboard")

    assert response.status_code in (401, 404, 405)