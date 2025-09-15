const express = require("express");
const router = express.Router();
const upload = require("../middlewares/upload");
const authMiddleware = require("../middlewares/authMiddleware");
const appointmentMiddleware = require("../middlewares/appointmentMiddleware");
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
  updateSortPreference
} = require("../controllers/appointmentController");

router.use(authMiddleware);

router.post(
  "/",
  appointmentValidationRules,
  validateAppointment,
  createAppointment
);
router.get("/", getAllAppointments);

router.put("/sort-preference", updateSortPreference);

router.get("/:id", appointmentMiddleware, getAppointmentById);
router.put(
  "/:id",
  appointmentMiddleware,
  appointmentValidationRules,
  validateAppointment,
  updateAppointment
);

router.delete("/:id", appointmentMiddleware, deleteAppointment);

router.post("/upload", upload.single("file"), uploadAppointments);
router.get("/upload/status/:jobId", getUploadStatus);

module.exports = router;
