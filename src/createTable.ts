import pool from "./config/db";

// Enums
// CREATE TYPE transaction_type AS ENUM ('income', 'expense');

export const createUserTable = async (): Promise<boolean> => {
  const queryText = `
    CREATE TABLE IF NOT EXISTS users(
      user_id UUID NOT NULL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      hashed_password TEXT UNIQUE,
      balance NUMERIC DEFAULT 0.00,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  try {
    await pool.query(queryText);
    console.log('users table has been created.');
    return true;
  } catch (error) {
    console.log("An error occured creating the table 'users'.", error);
    return false;
  }
}

export const createCategoryTable = async (): Promise<boolean> => {
  const queryText = `
    CREATE TABLE IF NOT EXISTS categories(
      category_id UUID NOT NULL PRIMARY KEY,
      user_id UUID REFERENCES users (user_id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      type transaction_type,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  try {
    await pool.query(queryText);
    console.log('categories table has been created.');
    return true;
  } catch (error) {
    console.log("An error occured creating the table 'categories'.", error);
    return false;
  }
}

export const createTransactionTable = async (): Promise<boolean> => {
  const queryText = `
    CREATE TABLE IF NOT EXISTS transactions(
      transaction_id UUID NOT NULL PRIMARY KEY,
      user_id UUID REFERENCES users (user_id) ON DELETE CASCADE,
      type transaction_type,
      amount NUMERIC(12, 2) NOT NULL,
      category_id UUID REFERENCES categories (category_id) ON DELETE CASCADE,
      note TEXT,
      transaction_date TIMESTAMP DEFAULT NOW(),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  try {
    await pool.query(queryText);
    console.log('transactions table has been created.');
    return true;
  } catch (error) {
    console.log("An error occured creating the table 'transactions'.", error);
    return false;
  }
}
