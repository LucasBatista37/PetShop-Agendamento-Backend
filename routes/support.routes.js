const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const { sendSupportMessage } = require("../controllers/supportController");
const {
  supportValidationRules,
  validateSupport,
} = require("../validators/supportValidator");

router.post(
  "/",
  authMiddleware, 
  supportValidationRules,
  validateSupport,
  sendSupportMessage
);

module.exports = router;
