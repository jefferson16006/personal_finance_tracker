import express from "express";
import cors from "cors";
import {AppError, asyncHandler, errorHandler, notFoundHandler } from "./middlewares/errorHandler";
import pool from "./config/db"
import dotenv from "dotenv";
import { createCategoryTable, createTransactionTable, createUserTable } from "./createTable";
import userRouter from "./routes/userRoute";
import transactionRouter from "./routes/transactionRoute";
import categoryRouter from "./routes/categoryRoute";
import { authMiddleware } from "./middlewares/auth.middlemare";
dotenv.config();

const app = express();

app.use(express.json());
app.use(cors());

// routes
app.use("/api/v1/auth", userRouter);
app.use("/api/v1/user", authMiddleware, transactionRouter);
app.use("/api/v1/categories", authMiddleware, categoryRouter)
app.get("/", async(req, res) => {
  const result = await pool.query("SELECT current_database()");
  console.log(result);
  res.send(`The name of the current database is '${result.rows[0].current_database}'`);
})

//middlewares
app.use(errorHandler);
app.use(notFoundHandler)

const PORT = process.env.PORT || 8000;

const start = async(): Promise<void> => {
  if(await createUserTable()) {
    await createCategoryTable();
    await createTransactionTable();
  }
  const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}...`);
  });

  gracefulShutdown(server);
}

const gracefulShutdown = (server: any): void => {
  const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n${signal} received, shutting down gracefully...`);
    
    server.close(() => {
      console.log('HTTP server closed');
      pool.end(() => {
        console.log('Database connections closed');
        process.exit(0);
      });
    });
    
    // Force close after 10 seconds
    setTimeout(() => {
      console.log('Forcing shutdown...');
      process.exit(1);
    }, 10000);
  };
  
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

app.use(errorHandler({
  includeStackTrace: process.env.NODE_ENV === 'development',
  customErrorMap: new Map([
    ['CUSTOM_ERROR', { statusCode: 422, message: 'Custom error occurred' }]
  ])
}));

start();

