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
            "password": TEST_PASSWORD,
        },
    )

    assert response.status_code == 200

    return response.json()["access_token"]


def get_headers():
    token = get_access_token()

    return {
        "Authorization": f"Bearer {token}"
    }


# =========================================================
# ACCOUNT HELPERS
# =========================================================

def get_account_id():
    headers = get_headers()

    response = client.get(
        "/api/v1/accounts/",
        headers=headers,
    )

    assert response.status_code == 200

    data = response.json()

    # Support either direct list or {"accounts": [...]}
    accounts = (
        data.get("accounts", [])
        if isinstance(data, dict)
        else data
    )

    if len(accounts) > 0:
        return accounts[0]["id"]

    # -----------------------------------------------------
    # Create test account if none exists
    # -----------------------------------------------------

    response = client.post(
        "/api/v1/accounts/",
        json={
            "name": "Pytest Test Account",
            "account_type": "asset",
            "balance": 10000,
        },
        headers=headers,
    )

    assert response.status_code == 200

    account = response.json()

    assert "id" in account

    return account["id"]


# =========================================================
# CATEGORY HELPERS
# =========================================================

def get_category_id():
    response = client.get(
        "/api/v1/categories/",
        headers=get_headers(),
    )

    assert response.status_code == 200

    data = response.json()

    categories = (
        data.get("categories", [])
        if isinstance(data, dict)
        else data
    )

    assert len(categories) > 0

    return categories[0]["id"]


# =========================================================
# CREATE TEST TRANSACTION
# =========================================================

def create_test_transaction():
    account_id = get_account_id()
    category_id = get_category_id()

    response = client.post(
        "/api/v1/transactions/",
        json={
            "description": "Pytest Transaction",
            "amount": 250.50,
            "transaction_type": "expense",
            "date": "2026-08-08",
            "account_id": account_id,
            "category_id": category_id,
            "destination_account_id": None,
        },
        headers=get_headers(),
    )

    assert response.status_code == 200

    data = response.json()

    assert data["message"] == (
        "Transaction created successfully"
    )

    assert "transaction" in data

    return data["transaction"]["id"]


# =========================================================
# CREATE TRANSACTION
# =========================================================

def test_create_transaction():
    transaction_id = create_test_transaction()

    assert isinstance(transaction_id, int)


# =========================================================
# GET TRANSACTIONS
# =========================================================

def test_get_transactions():
    create_test_transaction()

    response = client.get(
        "/api/v1/transactions/",
        headers=get_headers(),
    )

    assert response.status_code == 200

    data = response.json()

    assert "transactions" in data
    assert "pagination" in data

    assert isinstance(
        data["transactions"],
        list,
    )


# =========================================================
# SEARCH TRANSACTIONS
# =========================================================

def test_search_transactions():
    create_test_transaction()

    response = client.get(
        "/api/v1/transactions/",
        params={
            "search": "Pytest"
        },
        headers=get_headers(),
    )

    assert response.status_code == 200

    data = response.json()

    transactions = data["transactions"]

    assert isinstance(
        transactions,
        list,
    )

    assert any(
        "Pytest" in transaction["description"]
        for transaction in transactions
    )


# =========================================================
# FILTER BY TYPE
# =========================================================

def test_filter_transactions_by_type():
    create_test_transaction()

    response = client.get(
        "/api/v1/transactions/",
        params={
            "transaction_type": "expense"
        },
        headers=get_headers(),
    )

    assert response.status_code == 200

    data = response.json()

    transactions = data["transactions"]

    assert isinstance(
        transactions,
        list,
    )

    for transaction in transactions:
        assert transaction["transaction_type"] == "expense"


# =========================================================
# FILTER BY ACCOUNT
# =========================================================

def test_filter_transactions_by_account():
    account_id = get_account_id()

    create_test_transaction()

    response = client.get(
        "/api/v1/transactions/",
        params={
            "account_id": account_id
        },
        headers=get_headers(),
    )

    assert response.status_code == 200

    data = response.json()

    transactions = data["transactions"]

    assert isinstance(
        transactions,
        list,
    )

    for transaction in transactions:
        assert (
            transaction["account_id"] == account_id
            or
            transaction["destination_account_id"]
            == account_id
        )


# =========================================================
# FILTER BY CATEGORY
# =========================================================

def test_filter_transactions_by_category():
    category_id = get_category_id()

    create_test_transaction()

    response = client.get(
        "/api/v1/transactions/",
        params={
            "category_id": category_id
        },
        headers=get_headers(),
    )

    assert response.status_code == 200

    data = response.json()

    transactions = data["transactions"]

    assert isinstance(
        transactions,
        list,
    )

    for transaction in transactions:
        assert transaction["category_id"] == category_id


# =========================================================
# FILTER BY DATE
# =========================================================

def test_filter_transactions_by_date():
    create_test_transaction()

    response = client.get(
        "/api/v1/transactions/",
        params={
            "start_date": "2026-08-01",
            "end_date": "2026-08-31",
        },
        headers=get_headers(),
    )

    assert response.status_code == 200

    data = response.json()

    transactions = data["transactions"]

    assert isinstance(
        transactions,
        list,
    )


# =========================================================
# INVALID DATE RANGE
# =========================================================

def test_invalid_transaction_date_range():
    response = client.get(
        "/api/v1/transactions/",
        params={
            "start_date": "2026-08-31",
            "end_date": "2026-08-01",
        },
        headers=get_headers(),
    )

    assert response.status_code == 400

    assert response.json()["detail"] == (
        "start_date cannot be later than end_date."
    )


# =========================================================
# GET SINGLE TRANSACTION
# =========================================================

def test_get_single_transaction():
    transaction_id = create_test_transaction()

    response = client.get(
        f"/api/v1/transactions/{transaction_id}",
        headers=get_headers(),
    )

    assert response.status_code == 200

    data = response.json()

    assert "transaction" in data

    transaction = data["transaction"]

    assert transaction["id"] == transaction_id
    assert transaction["description"] == (
        "Pytest Transaction"
    )


# =========================================================
# GET NONEXISTENT TRANSACTION
# =========================================================

def test_get_nonexistent_transaction():
    response = client.get(
        "/api/v1/transactions/999999999",
        headers=get_headers(),
    )

    assert response.status_code == 404

    assert response.json()["detail"] == (
        "Transaction not found."
    )


# =========================================================
# UPDATE TRANSACTION
# =========================================================

def test_update_transaction():
    transaction_id = create_test_transaction()

    account_id = get_account_id()
    category_id = get_category_id()

    response = client.put(
        f"/api/v1/transactions/{transaction_id}",
        json={
            "description": "Updated Pytest Transaction",
            "amount": 500.00,
            "transaction_type": "expense",
            "date": "2026-08-09",
            "account_id": account_id,
            "category_id": category_id,
            "destination_account_id": None,
        },
        headers=get_headers(),
    )

    assert response.status_code == 200

    data = response.json()

    assert data["message"] == (
        "Transaction updated successfully"
    )

    assert data["transaction"]["description"] == (
        "Updated Pytest Transaction"
    )

    assert data["transaction"]["amount"] == 500.0


# =========================================================
# DELETE TRANSACTION
# =========================================================

def test_delete_transaction():
    transaction_id = create_test_transaction()

    response = client.delete(
        f"/api/v1/transactions/{transaction_id}",
        headers=get_headers(),
    )

    assert response.status_code == 200

    assert response.json()["message"] == (
        "Transaction deleted successfully"
    )


# =========================================================
# DELETE NONEXISTENT TRANSACTION
# =========================================================

def test_delete_nonexistent_transaction():
    response = client.delete(
        "/api/v1/transactions/999999999",
        headers=get_headers(),
    )

    assert response.status_code == 404

    assert response.json()["detail"] == (
        "Transaction not found."
    )


# =========================================================
# INVALID TRANSACTION TYPE
# =========================================================

def test_invalid_transaction_type():
    account_id = get_account_id()
    category_id = get_category_id()

    response = client.post(
        "/api/v1/transactions/",
        json={
            "description": "Invalid Type Test",
            "amount": 100,
            "transaction_type": "invalid",
            "date": "2026-08-08",
            "account_id": account_id,
            "category_id": category_id,
            "destination_account_id": None,
        },
        headers=get_headers(),
    )

    assert response.status_code == 400

    assert response.json()["detail"] == (
        "Transaction type must be "
        "income, expense, or transfer"
    )


# =========================================================
# INVALID AMOUNT
# =========================================================

def test_invalid_transaction_amount():
    account_id = get_account_id()
    category_id = get_category_id()

    response = client.post(
        "/api/v1/transactions/",
        json={
            "description": "Invalid Amount Test",
            "amount": 0,
            "transaction_type": "expense",
            "date": "2026-08-08",
            "account_id": account_id,
            "category_id": category_id,
            "destination_account_id": None,
        },
        headers=get_headers(),
    )

    assert response.status_code == 400

    assert response.json()["detail"] == (
        "Transaction amount must be greater than 0"
    )


# =========================================================
# INVALID CATEGORY
# =========================================================

def test_invalid_transaction_category():
    account_id = get_account_id()

    response = client.post(
        "/api/v1/transactions/",
        json={
            "description": "Invalid Category Test",
            "amount": 100,
            "transaction_type": "expense",
            "date": "2026-08-08",
            "account_id": account_id,
            "category_id": 999999999,
            "destination_account_id": None,
        },
        headers=get_headers(),
    )

    assert response.status_code == 400

    assert response.json()["detail"] == (
        "Invalid category."
    )


# =========================================================
# TRANSACTION STATISTICS
# =========================================================

def test_transaction_statistics():
    create_test_transaction()

    response = client.get(
        "/api/v1/transactions/statistics/summary",
        headers=get_headers(),
    )

    assert response.status_code == 200

    data = response.json()

    assert "total_transactions" in data
    assert "income" in data
    assert "expense" in data
    assert "transfer" in data
    assert "net_cash_flow" in data

    assert isinstance(
        data["total_transactions"],
        int,
    )


# =========================================================
# CATEGORY SPENDING STATISTICS
# =========================================================

def test_category_spending_statistics():
    create_test_transaction()

    response = client.get(
        "/api/v1/transactions/statistics/categories",
        headers=get_headers(),
    )

    assert response.status_code == 200

    data = response.json()

    assert "categories" in data

    assert isinstance(
        data["categories"],
        list,
    )
