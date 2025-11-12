import { Request, Response } from "express";
import { AppError } from "../middlewares/errorHandler";
import pool from "../config/db";
import { sendError, sendSuccess } from "../utils/responseFormat";
import { createCategoryService, deleteCategoryService, updateCategoryService } from "../services/categoryService";

interface GetCategoriesQuery {
  type?: "income" | "expense";
}

export const createNewCategory = async(
  req: Request,
  res: Response
): Promise<void> => {
  const { name, type } = req.body;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const userCategory = await client.query(
      "SELECT * FROM categories WHERE name = $1 AND user_id = $2",
      [name, req.user?.userId]
    );
    if(userCategory.rows.length > 0) {
      throw new AppError("Category with that name already exists.", 400, true);
    }

    const newCategory = await createCategoryService(client, req.user?.userId, name, type);

    await client.query('COMMIT');
    sendSuccess(res, "Category created successfully", newCategory);
  } catch (error) {
    await client.query('ROLLBACK');
    if (error instanceof AppError) {
      return sendError(res, error.message, error.statusCode);
    } else {
      console.error(error);
      return sendError(res, "A database or service error occurred during creation of categories.", 500);
    }
  } finally {
    client.release();
  }
}

export const updateCategory = async(
  req: Request,
  res: Response
): Promise<void> => {
  const {
    body: { name, type },
    params: { id }
  } = req;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const categoryResult = await client.query(
      "SELECT * FROM categories WHERE category_id = $1",
      [id]
    );

    if (categoryResult.rows.length === 0) {
      throw new AppError("Category does not exist.", 404, true);
    }
    const oldCategory = categoryResult.rows[0];
    const newName = name || oldCategory.name;
    const newType = type || oldCategory.type;

    if(oldCategory.user_id !== req.user?.userId) {
      throw new AppError("Category is not owned by user.", 403, true);
    }

    const updatedCategory = await updateCategoryService(client, id, req.user?.userId, newName, newType);

    await client.query('COMMIT');
    sendSuccess(res, "Category updated successfully.", updatedCategory);
  } catch (error) {
    await client.query('ROLLBACK');
    if (error instanceof AppError) {
      return sendError(res, error.message, error.statusCode);
    } else {
      console.error(error);
      return sendError(res, "A database or service error occurred during updating of categories.", 500);
    }
  } finally {
    client.release();
  }
}

export const deleteCategory = async(
  req: Request,
  res: Response
): Promise<void> => {
  const { params: { id } } = req;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const category = await client.query(
      "SELECT * FROM categories WHERE category_id = $1",
      [id]
    );
    if (category.rows.length === 0) {
      throw new AppError("Category does not exist.", 404, true);
    }
    const oldCategory = category.rows[0];

    if(oldCategory.user_id !== req.user?.userId) {
      throw new AppError("Category is not owned by user.", 403, true);
    }

    const transactionWithCategory = await client.query(
      "SELECT * FROM transactions WHERE category_id = $1",
      [id]
    );
    if(transactionWithCategory.rows.length > 0) {
      throw new AppError("Cannot delete category because it is still in use by a transaction", 400, true);
    }

    const deletedCategory = await deleteCategoryService(client, id, req.user?.userId);

    await client.query('COMMIT');
    sendSuccess(res, "Category deleted successfully.", deletedCategory);
  } catch (error) {
    await client.query('ROLLBACK');
    if (error instanceof AppError) {
      sendError(res, error.message, error.statusCode);
    } else {
      console.error(error); 
      throw new AppError("A database or service error occurred during deleting of categories.", 500, false);
    }
  } finally {
    client.release();
  }
}

// Get all categories for authenticated user
export const getCategories = async (
  req: Request<{}, {}, {}, GetCategoriesQuery>,
  res: Response
): Promise<void> => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    
    const userId = req.user?.userId;
    
    // if (!userId) {
    //   throw new AppError("User not authenticated", 401, true);
    // }

    const { type } = req.query;

    // Dynamic query to filter by type if provided
    let query = "SELECT category_id, name, type, created_at FROM categories WHERE user_id = $1";
    const queryParams: any[] = [userId];

    if (type) {
      query += " AND type = $2";
      queryParams.push(type);
    }

    query += " ORDER BY name ASC";

    const result = await client.query(query, queryParams);

    await client.query("COMMIT");
    sendSuccess(res, "Categories retrieved successfully.", result.rows);
  } catch (error) {
    await client.query("ROLLBACK");
    if (error instanceof AppError) {
      sendError(res, error.message, error.statusCode);
    } else {
      console.error(error);
      throw new AppError(
        "A database error occurred while fetching categories.",
        500,
        false
      );
    }
  } finally {
    client.release();
  }
};