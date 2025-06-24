const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const {
  register,
  verifyEmail,
  resendVerificationEmail,
  login,
  updateProfile,
  deleteProfile,
  getProfile,
  changePassword,
  forgotPassword,
  resetPassword,
} = require("../controllers/authController");

router.post("/register", register);
router.get("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerificationEmail);
router.post("/login", login);
router.put("/me", authMiddleware, updateProfile);
router.delete("/me", authMiddleware, deleteProfile);
router.get("/me", authMiddleware, getProfile);
router.put("/change-password", authMiddleware, changePassword);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

module.exports = router;
