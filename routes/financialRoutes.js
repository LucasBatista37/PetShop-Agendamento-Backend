const express = require("express");
const router = express.Router();
const financialController = require("../controllers/financialController");
const authMiddleware = require("../middlewares/authMiddleware");

router.use(authMiddleware);

router.post("/", financialController.createTransaction);
router.get("/", financialController.getTransactions);
router.get("/dashboard", financialController.getDashboardData);
router.put("/:id", financialController.updateTransaction);
router.delete("/:id", financialController.deleteTransaction);

module.exports = router;
