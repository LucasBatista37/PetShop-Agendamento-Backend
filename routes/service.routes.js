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

router.post("/", authMiddleware, createService);
router.get("/", authMiddleware, getAllServices);
router.get("/:id", authMiddleware, serviceMiddleware, getServiceById);
router.put("/:id", authMiddleware, serviceMiddleware, updateService);
router.delete("/:id", authMiddleware, serviceMiddleware, deleteService);

module.exports = router;
