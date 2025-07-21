const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const rateLimit = require("express-rate-limit");
const {
  validateRegister,
  validateChangePassword,
  validateForgotPassword,
  validateResetPassword,
} = require("../validators/authValidator");

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
  refreshToken,
  logout,
} = require("../controllers/authController");

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Muitas tentativas de login. Tente novamente mais tarde.",
});

router.post("/register", validateRegister, register);
router.get("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerificationEmail);
router.post("/login", loginLimiter, login);
router.post("/refresh", refreshToken);
router.post("/logout", logout);
router.put("/me", authMiddleware, updateProfile);
router.delete("/me", authMiddleware, deleteProfile);
router.get("/me", authMiddleware, getProfile);
router.put(
  "/change-password",
  authMiddleware,
  validateChangePassword,
  changePassword
);
router.post("/forgot-password", validateForgotPassword, forgotPassword);
router.post("/reset-password", validateResetPassword, resetPassword);

module.exports = router;
