import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import pool from "../config/db";
import dotenv from "dotenv";
import { LoginRequest, RegisterRequest } from "../types/user";
import { AppError } from "../middlewares/errorHandler";
import { createUserService } from "../services/userService";
import { generateJWT } from "../utils/jwt";
import { sendError, sendSuccess, sendSuccessNoData } from "../utils/responseFormat";
import defaultCategories from "../utils/categories";
import { createCategoryService } from "../services/categoryService";
dotenv.config();


const hash_pwd = async(password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  const hashed_password = await bcrypt.hash(password, salt);
  return hashed_password;
};

const decrypt_pwd = async(candidatePassword: string, password: string): Promise<boolean> => {
  const isMatch = await bcrypt.compare(candidatePassword, password);
  return isMatch;
};

export const register = async(
  req: Request<{}, {}, RegisterRequest>,
  res: Response
): Promise<void> => {
  const { name, email, password } = req.body;
  if (!name?.trim() || !email?.trim() || !password?.trim()) {
    throw new AppError("Please fill out each field.", 400, true);
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new AppError("Please provide a valid email address.", 400, true);
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const existingEmail = await client.query("SELECT email FROM users WHERE email = $1", [email.toLowerCase()]);
    console.log(existingEmail);
    if(existingEmail.rows.length > 0) {
      throw new AppError("This email is already in use.", 400, true);
    }

    const hashed_pwd = await hash_pwd(password);
    const user = await createUserService(
      client,
      name.trim(),
      email.toLowerCase().trim(),
      hashed_pwd
    );
    const userId = user.user_id;

    const categoryPromises = defaultCategories.map(category => {
      return createCategoryService(client, userId, category.name, category.type);
    });
    await Promise.all(categoryPromises);

    await client.query('COMMIT');

    const token = generateJWT({
      userId,
      name: user.name
    });
    sendSuccess(res, "User created successfully", { user }, token, 201);
  } catch (error) {
    await client.query('ROLLBACK');
    if (error instanceof AppError) {
      return sendError(res, error.message, error.statusCode);
    } else {
      console.error(error);
      return sendError(res, "A database or service error occurred during registration.", 500);
    }
  } finally {
    client.release();
  }
}

export const login = async(
    req: Request<{}, {}, LoginRequest>,
    res: Response
): Promise<void> => {
    const { email, password } = req.body;
    if(!email?.trim() || !password?.trim()) {
        throw new AppError("Please fill out each field.", 400, true);
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const existingEmail = await client.query("SELECT * FROM users WHERE email = $1", [email.toLowerCase()]);
      if(existingEmail.rows.length === 0) {
        throw new AppError("Invalid email or password", 404, true);
      }
      const isPasswordCorrect = await decrypt_pwd(password, existingEmail.rows[0].hashed_password);
      if(!isPasswordCorrect) {
        throw new AppError("Invalid email or password", 400, true);
      }

      await client.query('COMMIT');

      const token = generateJWT({
        userId: existingEmail.rows[0].user_id,
        name: existingEmail.rows[0].name
      });
      sendSuccessNoData(res, "User logged in successfully", token, 200);
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof AppError) {
        return sendError(res, error.message, error.statusCode);
      } else {
        console.error(error);
        return sendError(res, "A database or service error occurred during log in.", 500);
      }
    } finally {
      client.release();
    }
}

export const getBalance = async(req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      "SELECT balance FROM users WHERE user_id = $1",
      [req.user?.userId]
    );
    if(result.rows.length === 0) {
      throw new AppError("User does not exist.", 404, true);
    }
    console.log(result.rows[0]);

    await client.query('COMMIT');
    sendSuccess(res, "Balance fetched successfully.", result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    if (error instanceof AppError) {
      return sendError(res, error.message, error.statusCode);
    } else {
      console.error(error);
      return sendError(res, "A database error occurred while fetching balance.", 500);
    }
  } finally {
    client.release();
  }
}