import express from "express";
import {
  getTransaction,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getSingleTransaction,
} from "../controllers/transactionController";

const router = express.Router();

router.get("/transactions", getTransaction);
router.post("/transaction", createTransaction);
router.route("/transaction/:id").get(getSingleTransaction).patch(updateTransaction).delete(deleteTransaction);

export default router;