import { PoolClient } from "pg";
import { v4 } from "uuid";
import { CreatedCategoryResponse } from "../types/user";

export const createCategoryService = async(
  client: PoolClient,
  user_id: string | undefined,
  name: string,
  type: string
): Promise<CreatedCategoryResponse> => {
  const id = v4();
  const result = await client.query(
    "INSERT INTO categories(category_id, user_id, name, type) VALUES ($1, $2, $3, $4) RETURNING *",
    [id, user_id, name, type]
  );
  return result.rows[0];
}

export const updateCategoryService = async(
  client: PoolClient,
  category_id: string | undefined,
  user_id: string | undefined,
  name: string,
  type: string
): Promise<CreatedCategoryResponse> => {
  const result = await client.query(
    "UPDATE categories SET name = $1, type = $2 WHERE category_id = $3 AND user_id = $4 RETURNING *",
    [name, type, category_id, user_id]
  );
  return result.rows[0];
}

export const deleteCategoryService = async(
  client: PoolClient,
  category_id: string | undefined,
  user_id: string | undefined
): Promise<CreatedCategoryResponse> => {
  const result = await client.query(
      'DELETE FROM categories WHERE category_id = $1 AND user_id = $2 RETURNING *',
      [category_id, user_id]
  );
  console.log(result.rows[0]);
  return result.rows[0];
};