import { Request, Response } from "express";
import { GetTransactionQuery, TransactionRequest } from "../types/transaction";
import { AppError } from "../middlewares/errorHandler";
import pool from "../config/db";
import { createTransactionService, deleteTransactionService, updateTransactionService } from "../services/transactionService";
import { sendError, sendSuccess } from "../utils/responseFormat";

// Create transaction - POST
export const createTransaction = async(
  req: Request<{}, {}, TransactionRequest>,
  res: Response
): Promise<void> => {
  const { type, amount, category_id, note } = req.body;

  if(!type || !amount || !category_id) {
    throw new AppError("Some fields are missing.", 400, true);
  }

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const categoryCheck = await client.query("SELECT * FROM categories WHERE category_id = $1", [category_id]);
    if(categoryCheck.rows.length === 0) {
      throw new AppError("Category does not exist.", 400, true);
    }

    if(categoryCheck.rows[0].user_id !== req.user?.userId) {
      throw new AppError("Category is not owned by user.", 403, true);
    }

    const transaction = await createTransactionService(
      client,
      req.user?.userId!,
      type,
      amount,
      category_id,
      note,
    );

    if(transaction.type === 'income') {
      await client.query(
        "UPDATE users SET balance = balance + $1 WHERE user_id = $2",
        [amount, transaction.user_id]
      );
    } else if (transaction.type === 'expense') {
      const balanceCheck = await client.query(
        "SELECT balance FROM users WHERE user_id = $1",
        [transaction.user_id]
      );
      
      if (balanceCheck.rows[0].balance >= amount) {
        await client.query(
          "UPDATE users SET balance = balance - $1 WHERE user_id = $2",
          [amount, transaction.user_id]
        );
      } else {
        throw new AppError("Insufficient balance for this expense.", 400, true);
      }
    }

    await client.query('COMMIT');

    const transactionData = {
      user_id: transaction.user_id,
      type: transaction.type,
      amount: transaction.amount,
      category: categoryCheck.rows[0].name,
      note: transaction.note,
      date: transaction.transaction_date,
    }
    sendSuccess(res, "Transaction succeded.", transactionData);
  } catch (error) {
    await client.query('ROLLBACK');
    if (error instanceof AppError) {
      sendError(res, error.message, error.statusCode);
    } else {
      console.error(error); 
      throw new AppError("A database or service error occurred during creating transactions.", 500, false);
    }
  } finally {
    client.release();
  }
}

// Retrieve transaction - GET
export const getTransaction = async(
  req: Request<{ id: string }, {}, {}, GetTransactionQuery>,
  res: Response
): Promise<void> => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { type, category_id } = req.query;

    const userExists = await client.query("SELECT user_id FROM users WHERE user_id = $1", [id]);
    if (userExists.rows.length === 0) {
      throw new AppError("User not found", 404, true);
    }

    // Dynamic query
    let query = "SELECT * FROM transactions WHERE user_id = $1";
    const queryParams: any[] = [id];
    let paramCount = 1;

    if (type) {
      paramCount++;
      query += ` AND type = $${paramCount}`;
      queryParams.push(type);
    }

    if (category_id) {
      paramCount++;
      query += ` AND category_id = $${paramCount}`;
      queryParams.push(category_id);
    }

    const transaction = await client.query(query, queryParams);
    
    await client.query('COMMIT');
    sendSuccess(res, "Transactions retrieved successfully.", transaction.rows);
    
  } catch (error) {
    await client.query('ROLLBACK');
    if (error instanceof AppError) {
      sendError(res, error.message, error.statusCode);
    } else {
      console.error(error); 
      throw new AppError("A database error occurred while fetching transactions.", 500, false);
    }
  } finally {
    client.release();
  }
}

// Update transaction - PATCH
export const updateTransaction = async (
  req: Request,
  res: Response
): Promise<void> => {
  const {
    body: { type, amount, category_id, note },
    params: { id },
  } = req;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    //Retrieve existing transaction
    const transactionResult = await client.query(
      "SELECT * FROM transactions WHERE transaction_id = $1 AND user_id = $2",
      [id, req.user?.userId]
    );

    if (transactionResult.rows.length === 0) {
      throw new AppError("Transaction does not exist.", 404, true);
    }
    const oldTransaction = transactionResult.rows[0];

    //Calculate new field values if they are provided
    const newType = type || oldTransaction.type;
    const newAmount = amount || oldTransaction.amount;
    const newCategory = category_id || oldTransaction.category_id;
    const newNote = note || oldTransaction.note;

    //Validate new category if changed
    if (category_id) {
      const categoryCheck = await client.query(
        "SELECT * FROM categories WHERE category_id = $1",
        [category_id]
      );
      if (categoryCheck.rows.length === 0) {
        throw new AppError("Category does not exist.", 400, true);
      }
      if (categoryCheck.rows[0].user_id !== req.user?.userId) {
        throw new AppError("Category is not owned by user.", 403, true);
      }
    }

    //Refund old transaction effect on balance
    if (oldTransaction.type === "income") {
      await client.query(
        "UPDATE users SET balance = balance - $1 WHERE user_id = $2",
        [oldTransaction.amount, req.user?.userId]
      );
    } else if (oldTransaction.type === "expense") {
      await client.query(
        "UPDATE users SET balance = balance + $1 WHERE user_id = $2",
        [oldTransaction.amount, req.user?.userId]
      );
    }

    //Apply new transaction effect
    const userBalanceResult = await client.query(
      "SELECT balance FROM users WHERE user_id = $1",
      [req.user?.userId]
    );
    const currentBalance = userBalanceResult.rows[0].balance;

    if (newType === "income") {
      await client.query(
        "UPDATE users SET balance = balance + $1 WHERE user_id = $2",
        [newAmount, req.user?.userId]
      );
    } else {
      if (currentBalance < newAmount) {
        throw new AppError("Insufficient balance to update this expense.", 400, true);
      }
      await client.query(
        "UPDATE users SET balance = balance - $1 WHERE user_id = $2",
        [newAmount, req.user?.userId]
      );
    }

    const updatedTransactionResult = await updateTransactionService(
      client, id, req.user?.userId, newType, newAmount, newCategory, newNote
    );

    await client.query('COMMIT');
    sendSuccess(res, "Transaction updated successfully.", updatedTransactionResult);
    
  } catch (error) {
    await client.query('ROLLBACK');
    if (error instanceof AppError) {
      return sendError(res, error.message, error.statusCode);
    }
    console.error(error);
    throw new AppError("A database error occurred while updating the transaction.", 500, false);
  } finally {
    client.release();
  }
};

// Delete transaction - DELETE
export const deleteTransaction = async(
  req: Request,
  res: Response
): Promise<void> => {
  const { params: { id } } = req;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const transaction = await client.query(
      "SELECT * FROM transactions WHERE transaction_id = $1",
      [id]
    );

    if (transaction.rows.length === 0) {
      throw new AppError("Transaction does not exist.", 404, true);
    }
    const oldTransaction = transaction.rows[0];

    if(oldTransaction.user_id !== req.user?.userId) {
      throw new AppError("Transaction is not owned by user.", 403, true);
    }

    if (oldTransaction.type === "income") {
      await client.query(
        "UPDATE users SET balance = balance - $1 WHERE user_id = $2",
        [oldTransaction.amount, req.user?.userId]
      );
    } else if (oldTransaction.type === "expense") {
      await client.query(
        "UPDATE users SET balance = balance + $1 WHERE user_id = $2",
        [oldTransaction.amount, req.user?.userId]
      );
    }

    const deletedTransaction = await deleteTransactionService(
      client,
      id,
      req.user?.userId
    );

    await client.query('COMMIT');
    sendSuccess(res, "Transaction deleted successfully.", deletedTransaction);
  } catch (error) {
    await client.query('ROLLBACK');
    if (error instanceof AppError) {
      return sendError(res, error.message, error.statusCode);
    }
    console.error(error);
    throw new AppError("A database error occurred while deleting the transaction.", 500, false);
  } finally {
    client.release();
  }
}