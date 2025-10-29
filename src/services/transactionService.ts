import { PoolClient } from "pg";
import { v4 } from "uuid";
import { TransactionResponse } from "../types/transaction";

export const createTransactionService = async(
  client: PoolClient,
  user_id: string,
  type: string,
  amount: number,
  category_id: string,
  note?: string
): Promise<TransactionResponse> => {
  const id = v4();
  const result = await client.query(
    'INSERT INTO transactions(transaction_id, user_id, type, amount, category_id, note) VALUES($1, $2, $3, $4, $5, $6) RETURNING *',
    [id, user_id, type, amount, category_id, note]
  );
  console.log(result.rows[0]);
  return result.rows[0];
}

export const updateTransactionService = async(
  client: PoolClient,
  transaction_id: string | undefined,
  user_id: string | undefined,
  type: string,
  amount: number,
  category_id: string,
  note: string
): Promise<TransactionResponse> => {
  const result = await client.query(
      'UPDATE transactions SET type = $1, amount = $2, category_id = $3, note = $4 WHERE transaction_id = $5 AND user_id = $6 RETURNING *',
      [type, amount, category_id, note, transaction_id, user_id]
  );
  console.log(result.rows[0]);
  return result.rows[0];
};

export const deleteTransactionService = async(
  client: PoolClient,
  transaction_id: string | undefined,
  user_id: string | undefined
): Promise<TransactionResponse> => {
  const result = await client.query(
      'DELETE FROM transactions WHERE transaction_id = $1 AND user_id = $2 RETURNING *',
      [transaction_id, user_id]
  );
  console.log(result.rows[0]);
  return result.rows[0];
};