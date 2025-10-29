import pool from "../config/db";
import { v4 } from "uuid";
import { CreatedUserResponse } from "../types/user";

export const createUserService = async(
  name: string,
  email: string,
  password: string
): Promise<CreatedUserResponse> => {
  const id = v4();
  const result = await pool.query(
    'INSERT INTO users(user_id, name, email, hashed_password) VALUES($1, $2, $3, $4) RETURNING user_id, name, email, created_at',
    [id, name, email, password]
  );
  console.log(result.rows[0]);
  return result.rows[0];
}