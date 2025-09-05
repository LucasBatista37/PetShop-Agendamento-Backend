const express = require("express");
const router = express.Router();
const auth = require("../middlewares/authMiddleware");
const controller = require("../controllers/collaboratorController");
const {
  validateInvite,
  validateAcceptInvite,
} = require("../validators/collaboratorValidator");
const { validationResult } = require("express-validator");

const runValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }
  next();
};

router.post(
  "/accept-invite",
  validateAcceptInvite,
  runValidation,
  controller.acceptInvite
);

router.use(auth);

router.post(
  "/invite",
  validateInvite,
  runValidation,
  controller.inviteCollaborator
);
router.get("/", controller.getAllCollaborators);
router.delete("/:id", controller.deleteCollaborator);

module.exports = router;
