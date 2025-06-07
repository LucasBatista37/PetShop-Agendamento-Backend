const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const { getStats } = require("../controllers/dashboardController");

router.get("/stats", authMiddleware, getStats);

module.exports = router;
