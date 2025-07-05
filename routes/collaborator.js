const express = require("express");
const router = express.Router();
const auth = require("../middlewares/authMiddleware");
const controller = require("../controllers/collaboratorController");

router.post("/accept-invite", controller.acceptInvite);

router.use(auth);

router.post("/invite", controller.inviteCollaborator);
router.get("/", controller.getAllCollaborators);
router.delete("/:id", controller.deleteCollaborator);

module.exports = router;
                    