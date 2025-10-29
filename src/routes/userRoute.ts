import express from "express";
const router = express.Router();
import { getBalance, login, register } from "../controllers/userController";
import { authMiddleware } from "../middlewares/auth.middlemare";

router.post("/register", register);
router.post("/login", login);
router.get("/balance", authMiddleware, getBalance);

export default router;