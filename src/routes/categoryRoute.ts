import express from "express";
import {
    createNewCategory,
    deleteCategory,
    updateCategory
} from "../controllers/categoryController";
const router = express.Router();

router.post("/new/category", createNewCategory);
router.route("/category/:id").patch(updateCategory).delete(deleteCategory);

export default router;