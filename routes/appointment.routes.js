const express = require("express");
const router = express.Router();
const path = require("path");

const authMiddleware = require("../middlewares/authMiddleware");
const appointmentMiddleware = require("../middlewares/appointmentMiddleware");
const upload = require("../middlewares/upload");

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
  getUploadStatus,
} = require("../controllers/appointmentController");

const { queue } = require("../queues/appointmentQueue");
const { uploadFileToGridFS } = require("../utils/gridfs");

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

router.delete("/:id", appointmentMiddleware, deleteAppointment);

router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Arquivo não enviado" });
    }

    const fileId = await uploadFileToGridFS(req.file);
    console.log("📂 Arquivo enviado para GridFS:", {
      originalname: req.file.originalname,
      fileId,
    });

    const job = await queue.add("importAppointments", {
      fileId: fileId.toString(),
      ownerId: req.user._id,
    });

    console.log(
      `🚀 Job ${job.id} criado para importar: ${req.file.originalname}`
    );
    res.json({ jobId: job.id });
  } catch (err) {
    console.error("Erro no upload de agendamentos:", err);
    res.status(500).json({ message: err.message });
  }
});

router.get("/upload/status/:jobId", async (req, res) => {
  try {
    const job = await queue.getJob(req.params.jobId);
    if (!job) return res.status(404).json({ message: "Job não encontrado" });

    const state = await job.getState();
    const progress = job.progress();
    const reason = job.failedReason || null;

    res.json({ state, progress, reason });
  } catch (err) {
    console.error("Erro ao consultar status do job:", err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
