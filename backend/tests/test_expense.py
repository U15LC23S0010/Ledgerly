from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)

TEST_EMAIL = "pytest_user_001@example.com"
TEST_PASSWORD = "TestPassword123!"


def get_access_token():
    response = client.post(
        "/api/v1/auth/login",
        data={
            "username": TEST_EMAIL,
            "password": TEST_PASSWORD
        }
    )

    assert response.status_code == 200

    return response.json()["access_token"]


def get_headers():
    token = get_access_token()

    return {
        "Authorization": f"Bearer {token}"
    }


def get_category_id():
    response = client.get(
        "/api/v1/categories/",
        headers=get_headers()
    )

    assert response.status_code == 200

    categories = response.json()

    assert len(categories) > 0

    return categories[0]["id"]


def create_test_expense():
    category_id = get_category_id()

    response = client.post(
        "/api/v1/expenses/",
        json={
            "title": "Pytest Expense",
            "amount": 250.50,
            "category_id": category_id,
            "date": "2026-08-08"
        },
        headers=get_headers()
    )

    assert response.status_code == 200

    data = response.json()

    assert data["message"] == "Expense added successfully"
    assert "expense" in data

    return data["expense"]["id"]


def test_create_expense():
    expense_id = create_test_expense()

    assert isinstance(expense_id, int)


def test_get_expenses():
    response = client.get(
        "/api/v1/expenses/",
        headers=get_headers()
    )

    assert response.status_code == 200

    expenses = response.json()

    assert isinstance(expenses, list)


def test_search_expenses():
    create_test_expense()

    response = client.get(
        "/api/v1/expenses/search",
        params={
            "keyword": "Pytest"
        },
        headers=get_headers()
    )

    assert response.status_code == 200

    expenses = response.json()

    assert isinstance(expenses, list)

    assert any(
        "Pytest" in expense["title"]
        for expense in expenses
    )


def test_filter_expenses():
    create_test_expense()

    response = client.get(
        "/api/v1/expenses/filter",
        params={
            "min_amount": 200,
            "max_amount": 300
        },
        headers=get_headers()
    )

    assert response.status_code == 200

    expenses = response.json()

    assert isinstance(expenses, list)

    for expense in expenses:
        assert 200 <= expense["amount"] <= 300


def test_filter_invalid_amount_range():
    response = client.get(
        "/api/v1/expenses/filter",
        params={
            "min_amount": 500,
            "max_amount": 100
        },
        headers=get_headers()
    )

    assert response.status_code == 400

    assert response.json()["detail"] == (
        "min_amount cannot be greater than max_amount"
    )


def test_update_expense():
    expense_id = create_test_expense()

    category_id = get_category_id()

    response = client.put(
        f"/api/v1/expenses/{expense_id}",
        json={
            "title": "Updated Pytest Expense",
            "amount": 500.00,
            "category_id": category_id,
            "date": "2026-08-08"
        },
        headers=get_headers()
    )

    assert response.status_code == 200

    data = response.json()

    assert data["message"] == "Expense updated successfully"
    assert data["expense"]["title"] == "Updated Pytest Expense"
    assert data["expense"]["amount"] == 500.0


def test_delete_expense():
    expense_id = create_test_expense()

    response = client.delete(
        f"/api/v1/expenses/{expense_id}",
        headers=get_headers()
    )

    assert response.status_code == 200

    assert response.json()["message"] == (
        "Expense deleted successfully"
    )


def test_delete_nonexistent_expense():
    response = client.delete(
        "/api/v1/expenses/999999999",
        headers=get_headers()
    )

    assert response.status_code == 404

    assert response.json()["detail"] == "Expense not found"


def test_create_expense_invalid_category():
    response = client.post(
        "/api/v1/expenses/",
        json={
            "title": "Invalid Category Test",
            "amount": 100,
            "category_id": 999999999,
            "date": "2026-08-08"
        },
        headers=get_headers()
    )

    assert response.status_code == 404

    assert response.json()["detail"] == "Category not found"


def test_export_expenses_csv():
    response = client.get(
        "/api/v1/expenses/export/csv",
        headers=get_headers()
    )

    assert response.status_code == 200

    assert response.headers["content-type"].startswith(
        "text/csv"
    )

    assert "ID,Title,Amount,Category,Date" in response.text
