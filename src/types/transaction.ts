export interface TransactionRequest{
  type: string;
  amount: number;
  category_id: string;
  note?: string;
}

export interface TransactionResponse {
  transaction_id: string;
  user_id: string;
  type: string;
  amount: number;
  category_id: string;
  note?: string;
  transaction_date?: Date;
  created_at: Date;
}

export interface GetTransactionQuery {
  type?: string;
  category_id?: string;
}

