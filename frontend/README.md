                            Ledgerly

Smart bookkeeping for a clearer financial future.

Ledgerly is a full-stack personal finance and bookkeeping application that helps users manage their finances from one place.

It allows users to track transactions and expenses, manage accounts and budgets, create invoices, manage customers and vendors, view financial analytics, generate reports, and understand their financial health.

The project was built using React, FastAPI, PostgreSQL, SQLAlchemy, and Alembic, with JWT-based authentication and a production deployment setup.


Live Demo links below:

Frontend:
https://ledgerly-six-ruddy.vercel.app

Backend API:
https://ledgerly-1v9c.onrender.com

Ledgerly is currently deployed using:

Vercel – React frontend
Render – FastAPI backend
Neon – PostgreSQL database
GitHub – Source code and version control

 What is Ledgerly?

Managing finances often means using different tools for expenses, transactions, budgets, invoices, customers, and reports.

Ledgerly brings these things together into a single application.

With Ledgerly, a user can:

 Create and manage an account
 Record income and expenses
 Manage financial accounts
 Create and track budgets
 Organize transactions with categories
 Create invoices
 Manage customers and vendors
 View financial analytics
 Monitor financial health
 Generate reports
 Receive useful financial insights

The goal is to make financial management simple, organized, and easier to understand.

 Features of Ledgerly :

Authentication

Ledgerly includes a complete authentication system.

  User registration
  User login
  JWT authentication
  Access and refresh tokens
  Protected API endpoints
  Current-user authentication
  Password reset
  OTP verification
  Registration verification
  Secure password handling
  Automatic token handling on the frontend


 Dashboard

The dashboard gives users an overview of their financial activity.

It includes:

- Total income
- Total expenses
- Net cash flow
- Monthly income
- Monthly expenses
- Savings rate
- Account summaries
- Monthly spending trends
- Expense statistics
- Category summaries
- Budget information
- Financial health score
- Personalized financial insights

The dashboard is designed to give users a quick understanding of their current financial position.


Transactions

Users can manage their financial transactions from one place.

Features :

- Create transactions
- View transactions
- Update transactions
- Delete transactions
- Search transactions
- Filter transactions
- Transaction statistics
- Category spending statistics

Transactions can be filtered by:

- Transaction type
- Account
- Category
- Date range
- Search terms


 Expenses

Ledgerly provides a dedicated expense management system.

Users can:
- Add expenses
- View expenses
- Edit expenses
- Delete expenses
- Search expenses
- Filter expenses
- Assign categories
- Filter by amount
- View expense statistics
- Export expenses to CSV


 Accounts

Users can manage different types of financial accounts.

For example:

- Bank accounts
- Savings accounts
- Cash accounts
- Other financial accounts

Account functionality includes:

- Create accounts
- View accounts
- Update accounts
- Track balances
- Connect transactions to accounts
- Support account transfers

Categories

Categories help organize financial activity.

Users can:

- Create categories
- Manage categories
- Assign categories to transactions
- Analyze spending by category

Categories are used throughout the application for transactions, expenses, analytics, reports, and financial insights.



 Budgets

Ledgerly provides monthly budget management.

Users can:

- Create budgets
- Set monthly spending limits
- Track spending
- Compare spending with budgets
- Monitor budget status
- Receive budget warnings

This helps users understand when they are approaching or exceeding their planned spending.

 Invoices

Ledgerly also includes invoice management for bookkeeping workflows.

Users can:

- Create invoices
- Add invoice items
- Associate invoices with customers
- Calculate invoice totals
- Manage invoice status
- View invoice information


Customers

Customers can be managed directly from Ledgerly.

- Create customers
- View customers
- Update customers
- Delete customers
- Store customer information
- Associate customers with invoices


 Vendors

Ledgerly also provides vendor management.

- Create vendors
- View vendors
- Update vendors
- Delete vendors
- Store vendor information
- Track vendor-related financial data


 Analytics

The analytics section helps users understand their financial activity.

It includes:

- Expense analytics
- Category spending
- Monthly trends
- Financial statistics
- Spending analysis
- Visual financial information

Instead of only showing raw transactions, Ledgerly turns financial data into useful information.


 Financial Insights

Ledgerly includes a financial insights system that analyzes financial activity.

Depending on the user's data, it can identify situations such as:

- Negative cash flow
- Exceeded budgets
- Approaching budget limits
- Good savings behavior
- Negative savings
- High uncategorized expenses
- No recorded transactions
- Large individual expenses

These insights are intended to help users understand their financial behavior and make better decisions.


 Reports

The Reports section provides structured financial information.

It supports:

- Financial reports
- Expense reports
- Transaction reports
- Reporting summaries
- Export-oriented reporting


Automatic Expense Features

Ledgerly contains dedicated backend functionality for automatic expense processing.

The project includes an automatic expense service and API endpoints that provide a foundation for future financial automation and intelligent expense processing.

Frontend

The frontend is built as a React single-page application.

It includes:

- Responsive interface
- Protected routes
- Authentication handling
- Sidebar navigation
- Top navigation
- Dashboard
- Settings
- Notifications
- User guide
- Theme support
- PWA assets
- Axios API integration

The frontend communicates with the backend using REST APIs.


Progressive Web App (PWA)

Ledgerly is designed with Progressive Web App support, making the application feel more like a native application on supported devices.

PWA-related features include:

- Installable web application
- PWA manifest
- Application icons
- Standalone application display
- Responsive design for desktop and mobile devices
- App-like navigation experience
- PWA-ready frontend structure
- Optimized assets for installation and mobile usage

Users can access Ledgerly through a web browser and, on supported devices and browsers, install it as an application for easier access.

Technology Stack

Frontend

- React
- JavaScript
- Vite
- Axios
- React Router
- CSS
- PWA (Progressive Web Application)

Backend

- Python
- FastAPI
- SQLAlchemy
- Pydantic
- JWT
- Alembic
- Uvicorn
- Pytest

Database

- PostgreSQL
- SQLAlchemy ORM
- Alembic migrations
- Neon PostgreSQL

Deployment

- Vercel
- Render
- Neon
- GitHub

Development Tools

- VS Code
- Git
- GitHub
- npm
- Docker
- Pytest




Architecture of Ledgerly:

Ledgerly follows a simple frontend → API → database architecture.

                    ┌─────────────────┐
                    │      User       │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ React Frontend  │
                    │      Vite       │
                    └────────┬────────┘
                             │
                        REST API
                             │
                             ▼
                    ┌─────────────────┐
                    │ FastAPI Backend │
                    │                 │
                    │ API Endpoints   │
                    │ Services        │
                    │ Repositories   │
                    │ Schemas        │
                    │ Authentication  │
                    └────────┬────────┘
                             │
                        SQLAlchemy
                             │
                             ▼
                    ┌─────────────────┐
                    │   PostgreSQL    │
                    │      Neon       │
                    └─────────────────┘