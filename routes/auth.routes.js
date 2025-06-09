const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const {
  register,
  login,
  updateProfile,
  deleteProfile,
  getProfile,
} = require("../controllers/authController");

router.post("/register", register);
router.post("/login", login);
router.put("/me", authMiddleware, updateProfile);
router.delete("/me", authMiddleware, deleteProfile);
router.get("/me", authMiddleware, getProfile);

module.exports = router;
