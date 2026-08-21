from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_register_user():
    response = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Test User",
            "email": "pytest_user_001@example.com",
            "password": "TestPassword123!",
            "company_name": "Test Company",
            "mobile_number": "9876543210",
        }
    )

    assert response.status_code in [200, 400]

    if response.status_code == 200:
        data = response.json()
        assert data["message"] == "User Registered Successfully"
        assert "id" in data


def test_login_user():
    response = client.post(
        "/api/v1/auth/login",
        data={
            "username": "pytest_user_001@example.com",
            "password": "TestPassword123!"
        }
    )

    assert response.status_code == 200

    data = response.json()

    assert data["message"] == "Login Successful"
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


def test_get_current_user():
    login_response = client.post(
        "/api/v1/auth/login",
        data={
            "username": "pytest_user_001@example.com",
            "password": "TestPassword123!"
        }
    )

    assert login_response.status_code == 200

    access_token = login_response.json()["access_token"]

    response = client.get(
        "/api/v1/auth/me",
        headers={
            "Authorization": f"Bearer {access_token}"
        }
    )

    assert response.status_code == 200

    data = response.json()

    assert data["message"] == "Welcome!"
    assert data["user"]["email"] == "pytest_user_001@example.com"