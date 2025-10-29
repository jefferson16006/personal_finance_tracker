# Personal Finance Tracker API

A backend REST API for managing personal finances.
This project allows users to track income, expenses, categories, and transactions.
Built with **Node.js**, **Express**, and **PostgreSQL**, with authentication handled via **JWT**.

---

## Features

* User Authentication (Register / Login)
* Protected Routes (Requires Bearer Token)
* Create / Update / Delete Transactions
* Categorize Transactions (Income & Expense Categories)
* Fetch Transactions by User
* Category Management (CRUD)
* PostgreSQL Database Connection Pooling

---

## Tech Stack

| Layer           | Technology         |
| --------------- | ------------------ |
| Runtime         | Node.js            |
| Framework       | Express.js         |
| Database        | PostgreSQL         |
| Auth            | JWT (Bearer Token) |
| UUID Generation | uuid (v4)          |

---

## Project Structure

```
src/
├── config/
│   └── db.ts
├── controllers/
├── middleware/
├── routes/
├── services/
└── types/
└── utils/
```

---

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repo-url>
cd personal_finance_tracker
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Create `.env` File

```
DB_USER=your-db-user
DB_HOST=localhost
DB_PASSWORD=your-db-password
DB_NAME=finance_tracker
DB_PORT=5432
JWT_ACCESS_TOKEN_SECRET=your-jwt-secret
```


### 4. Start the Server

```bash
npm run dev
```

Server runs at:

```
http://localhost:8000
```

---

## Authentication

All protected routes require a **Bearer Token** in the header:

```
Authorization: Bearer <your-jwt-token>
```

---

## Example Requests

### Create Category

```bash
curl -X POST http://localhost:8000/api/v1/categories/new/category \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Food"}'
```

### Create Transaction

```bash
curl -X POST http://localhost:8000/api/v1/user/transactions \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"type": "expense", "amount": 500, "category_id": "<id>", "note": "Lunch"}'
```

---

## Status

Core functionality implemented
Future: Reporting, Analytics, Recurring Payments

---

## License

MIT License
