const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const serviceMiddleware = require("../middlewares/serviceMiddleware");
const {
  createService,
  getAllServices,
  getServiceById,
  updateService,
  deleteService,
} = require("../controllers/serviceController");

const {
  serviceValidationRules,
  validateService,
} = require("../validators/serviceValidator");

router.use(authMiddleware);

router.post("/", serviceValidationRules, validateService, createService);
router.get("/", getAllServices);
router.get("/:id", serviceMiddleware, getServiceById);
router.put(
  "/:id",
  serviceMiddleware,
  serviceValidationRules,
  validateService,
  updateService
);
router.delete("/:id", serviceMiddleware, deleteService);

module.exports = router;
