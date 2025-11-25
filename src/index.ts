import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pool from "./config/db";
import { createCategoryTable, createTransactionTable, createUserTable } from "./createTable";
import userRouter from "./routes/userRoute";
import transactionRouter from "./routes/transactionRoute";
import categoryRouter from "./routes/categoryRoute";
import { authMiddleware } from "./middlewares/auth.middlemare";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler";

dotenv.config();

const app = express();
app.use(express.json());

// CORS
const allowedOrigins = [
  "http://localhost:3000",
  "https://your-frontend-render-url.com",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      console.warn(`Blocked CORS request from origin: ${origin}`);
      return callback(new Error("CORS not allowed for this origin"), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Routes
app.use("/api/v1/auth", userRouter);
app.use("/api/v1/user", authMiddleware, transactionRouter);
app.use("/api/v1/categories", authMiddleware, categoryRouter);

app.get("/", async (req, res) => {
  const result = await pool.query("SELECT current_database()");
  res.send(`Current DB: '${result.rows[0].current_database}'`);
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler({ includeStackTrace: process.env.NODE_ENV === "development" }));

const PORT = process.env.PORT || 8000;

const start = async () => {
  await createUserTable();
  await createCategoryTable();
  await createTransactionTable();

  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`${signal} received. Shutting down gracefully...`);
    server.close(async () => {
      console.log("HTTP server closed");
      await pool.end();
      console.log("Database connections closed");
      process.exit(0);
    });

    setTimeout(() => {
      console.error("Forcing shutdown...");
      process.exit(1);
    }, 10000);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
};

start();
