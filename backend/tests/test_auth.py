from fastapi.testclient import TestClient

from app.main import app
from app.db.database import SessionLocal
from app.models.otp import OTPVerification


client = TestClient(app)


TEST_EMAIL = "pytest_user_001@example.com"
TEST_MOBILE = "9876543210"
TEST_PASSWORD = "TestPassword123!"


# =========================================================
# MOCK OTP EMAIL
# =========================================================

def fake_send_otp(
    email,
    mobile_number,
    otp,
    purpose="registration",
):
    """
    Prevent tests from sending real emails.

    The OTP is stored in the database, so the test
    can retrieve it directly.
    """
    print(
        f"TEST OTP: {otp} "
        f"for {email} "
        f"purpose={purpose}"
    )


# Patch the function used by the auth router
import app.api.v1.endpoints.auth as auth_module

auth_module.send_otp = fake_send_otp


# =========================================================
# REGISTER
# =========================================================

def test_register_user():

    response = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Test User",
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "company_name": "Test Company",
            "mobile_number": TEST_MOBILE,
            "role": "user",
        },
    )

    # -----------------------------------------------------
    # USER MAY ALREADY EXIST FROM A PREVIOUS TEST RUN
    # -----------------------------------------------------

    if response.status_code == 400:

        assert (
            response.json()["detail"]
            == "Email already registered."
        )

        return

    # -----------------------------------------------------
    # REGISTRATION REQUEST SUCCESS
    # -----------------------------------------------------

    assert response.status_code == 200

    data = response.json()

    assert data["message"] == "OTP sent successfully."
    assert data["email"] == TEST_EMAIL
    assert data["mobile_number"] == TEST_MOBILE
    assert data["expires_in_minutes"] == 5


# =========================================================
# VERIFY REGISTRATION OTP
# =========================================================

def test_verify_registration():

    db = SessionLocal()

    try:

        otp_record = (
            db.query(OTPVerification)
            .filter(
                OTPVerification.email == TEST_EMAIL,
                OTPVerification.mobile_number == TEST_MOBILE,
                OTPVerification.is_verified == False,
            )
            .order_by(
                OTPVerification.created_at.desc()
            )
            .first()
        )

        # -------------------------------------------------
        # IF USER ALREADY EXISTS, NOTHING TO VERIFY
        # -------------------------------------------------

        if not otp_record:

            print(
                "No pending OTP found. "
                "User may already be registered."
            )

            return

        otp = otp_record.otp

    finally:

        db.close()

    # -----------------------------------------------------
    # VERIFY OTP
    # -----------------------------------------------------

    response = client.post(
        "/api/v1/auth/verify-registration",
        json={
            "full_name": "Test User",
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "company_name": "Test Company",
            "mobile_number": TEST_MOBILE,
            "role": "user",
            "otp": otp,
        },
    )

    # -----------------------------------------------------
    # USER MAY ALREADY EXIST
    # -----------------------------------------------------

    if response.status_code == 400:

        detail = response.json()["detail"]

        assert detail in [
            "Email already registered.",
            "Mobile number already registered.",
        ]

        return

    # -----------------------------------------------------
    # SUCCESS
    # -----------------------------------------------------

    assert response.status_code == 200

    data = response.json()

    assert (
        data["message"]
        == "Account verified and created successfully."
    )

    assert "id" in data
    assert data["email"] == TEST_EMAIL
    assert data["full_name"] == "Test User"
    assert data["mobile_number"] == TEST_MOBILE
    assert data["company_name"] == "Test Company"
    assert data["role"] == "user"


# =========================================================
# LOGIN
# =========================================================

def test_login_user():

    response = client.post(
        "/api/v1/auth/login",
        data={
            "username": TEST_EMAIL,
            "password": TEST_PASSWORD,
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["message"] == "Login Successful"

    assert "access_token" in data
    assert "refresh_token" in data

    assert data["token_type"] == "bearer"

    assert data["user"]["email"] == TEST_EMAIL


# =========================================================
# CURRENT USER
# =========================================================

def test_get_current_user():

    login_response = client.post(
        "/api/v1/auth/login",
        data={
            "username": TEST_EMAIL,
            "password": TEST_PASSWORD,
        },
    )

    assert login_response.status_code == 200

    access_token = (
        login_response.json()["access_token"]
    )

    response = client.get(
        "/api/v1/auth/me",
        headers={
            "Authorization": f"Bearer {access_token}"
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["message"] == "Welcome!"

    assert (
        data["user"]["email"]
        == TEST_EMAIL
    )

    assert data["user"]["full_name"] == "Test User"


# =========================================================
# REFRESH ACCESS TOKEN
# =========================================================

def test_refresh_access_token():

    login_response = client.post(
        "/api/v1/auth/login",
        data={
            "username": TEST_EMAIL,
            "password": TEST_PASSWORD,
        },
    )

    assert login_response.status_code == 200

    refresh_token = (
        login_response.json()["refresh_token"]
    )

    response = client.post(
        "/api/v1/auth/refresh",
        params={
            "refresh_token": refresh_token,
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert "access_token" in data
    assert data["token_type"] == "bearer"


# =========================================================
# INVALID REFRESH TOKEN
# =========================================================

def test_invalid_refresh_token():

    response = client.post(
        "/api/v1/auth/refresh",
        params={
            "refresh_token": "invalid-refresh-token",
        },
    )

    assert response.status_code == 401

    assert (
        response.json()["detail"]
        == "Invalid refresh token"
    )


# =========================================================
# LOGOUT / REVOKE REFRESH TOKEN
# =========================================================

def test_logout_revokes_refresh_token():

    login_response = client.post(
        "/api/v1/auth/login",
        data={
            "username": TEST_EMAIL,
            "password": TEST_PASSWORD,
        },
    )

    assert login_response.status_code == 200

    refresh_token = (
        login_response.json()["refresh_token"]
    )

    # -----------------------------------------------------
    # LOGOUT
    # -----------------------------------------------------

    logout_response = client.post(
        "/api/v1/auth/logout",
        params={
            "refresh_token": refresh_token,
        },
    )

    assert logout_response.status_code == 200

    assert (
        logout_response.json()["message"]
        == "Logout successful"
    )

    # -----------------------------------------------------
    # REVOKED TOKEN MUST NO LONGER WORK
    # -----------------------------------------------------

    refresh_response = client.post(
        "/api/v1/auth/refresh",
        params={
            "refresh_token": refresh_token,
        },
    )

    assert refresh_response.status_code == 401

    assert (
        refresh_response.json()["detail"]
        == "Refresh token has been revoked"
    )


# =========================================================
# ACCESS TOKEN CANNOT BE USED AS REFRESH TOKEN
# =========================================================

def test_access_token_cannot_be_used_as_refresh_token():

    login_response = client.post(
        "/api/v1/auth/login",
        data={
            "username": TEST_EMAIL,
            "password": TEST_PASSWORD,
        },
    )

    assert login_response.status_code == 200

    access_token = (
        login_response.json()["access_token"]
    )

    response = client.post(
        "/api/v1/auth/refresh",
        params={
            "refresh_token": access_token,
        },
    )

    assert response.status_code == 401

    assert (
        response.json()["detail"]
        == "Invalid refresh token"
    )


# =========================================================
# ALREADY REVOKED TOKEN
# =========================================================

def test_logout_already_revoked_token():

    login_response = client.post(
        "/api/v1/auth/login",
        data={
            "username": TEST_EMAIL,
            "password": TEST_PASSWORD,
        },
    )

    assert login_response.status_code == 200

    refresh_token = (
        login_response.json()["refresh_token"]
    )

    # -----------------------------------------------------
    # FIRST LOGOUT
    # -----------------------------------------------------

    first_logout = client.post(
        "/api/v1/auth/logout",
        params={
            "refresh_token": refresh_token,
        },
    )

    assert first_logout.status_code == 200

    # -----------------------------------------------------
    # SECOND LOGOUT
    # -----------------------------------------------------

    second_logout = client.post(
        "/api/v1/auth/logout",
        params={
            "refresh_token": refresh_token,
        },
    )

    assert second_logout.status_code == 400

    assert (
        second_logout.json()["detail"]
        == "Refresh token already revoked"
    )
