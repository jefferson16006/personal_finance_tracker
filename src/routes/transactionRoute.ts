import express from "express";
import {
    getTransaction,
    createTransaction,
    updateTransaction,
    deleteTransaction
} from "../controllers/transactionController";
const router = express.Router();

router.post("/transaction", createTransaction);
router.route("/transaction/:id").get(getTransaction).patch(updateTransaction).delete(deleteTransaction);

export default router;