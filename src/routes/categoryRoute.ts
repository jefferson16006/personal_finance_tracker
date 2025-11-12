import express from "express";
import {
    createNewCategory,
    deleteCategory,
    getCategories,
    updateCategory
} from "../controllers/categoryController";
const router = express.Router();

router.post("/new/category", createNewCategory);
router.get("/", getCategories);
router.route("/category/:id").patch(updateCategory).delete(deleteCategory);

export default router;