const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const appointmentMiddleware = require("../middlewares/appointmentMiddleware");
const multer = require("multer");
const upload = multer({ dest: "uploads/" });

const {
  appointmentValidationRules,
  validateAppointment,
} = require("../validators/appointmentValidator");

const {
  createAppointment,
  getAllAppointments,
  getAppointmentById,
  updateAppointment,
  deleteAppointment,
  uploadAppointments,
  getUploadStatus,
} = require("../controllers/appointmentController");

router.use(authMiddleware);

router.post(
  "/",
  appointmentValidationRules,
  validateAppointment,
  createAppointment
);

router.get("/", getAllAppointments);

router.get("/:id", appointmentMiddleware, getAppointmentById);

router.put(
  "/:id",
  appointmentMiddleware,
  appointmentValidationRules,
  validateAppointment,
  updateAppointment
);

router.post("/upload", upload.single("file"), uploadAppointments);
router.get("/upload/status/:jobId", getUploadStatus);

router.delete("/:id", appointmentMiddleware, deleteAppointment);

module.exports = router;
