const Appointment = require("../models/Appointment");
const Service = require("../models/Service");
const getOwnerId = require("../utils/getOwnerId");
const { Queue, Job } = require("bullmq");
const { redisConnection } = require("../utils/redis");
const path = require("path");

const appointmentQueue = new Queue("appointments", {
  connection: redisConnection,
});

exports.createAppointment = async (req, res) => {
  try {
    const {
      petName,
      species,
      breed,
      notes,
      size,
      ownerName,
      ownerPhone,
      baseService,
      extraServices = [],
      date,
      time,
      status = "Pendente",
    } = req.body;

    const base = await Service.findById(baseService);
    if (!base) {
      return res.status(400).json({ message: "Serviço base não encontrado" });
    }

    const extras = await Service.find({ _id: { $in: extraServices } });

    const total = extras.reduce((acc, e) => acc + e.price, base.price);

    const ownerId = getOwnerId(req.user);

    const appoint = await Appointment.create({
      petName,
      species,
      breed,
      notes,
      size,
      ownerName,
      ownerPhone,
      baseService,
      extraServices,
      date,
      time,
      status,
      price: total,
      user: ownerId,
    });

    const populated = await Appointment.findById(appoint._id)
      .populate("baseService")
      .populate("extraServices");

    res.status(201).json(populated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao criar agendamento" });
  }
};

exports.getAllAppointments = async (req, res) => {
  try {
    const ownerId = getOwnerId(req.user);

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [appointments, total] = await Promise.all([
      Appointment.find({ user: ownerId })
        .populate("baseService")
        .populate("extraServices")
        .skip(skip)
        .limit(limit),
      Appointment.countDocuments({ user: ownerId }),
    ]);

    res.json({
      data: appointments,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalItems: total,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao listar agendamentos" });
  }
};

exports.getAppointmentById = async (req, res) => {
  const ownerId = getOwnerId(req.user);
  if (req.appointment.user.toString() !== ownerId.toString()) {
    return res.status(403).json({ message: "Acesso negado ao agendamento." });
  }

  res.json(req.appointment);
};

exports.updateAppointment = async (req, res) => {
  try {
    const ownerId = getOwnerId(req.user);
    if (req.appointment.user.toString() !== ownerId.toString()) {
      return res.status(403).json({ message: "Acesso negado ao agendamento." });
    }

    Object.assign(req.appointment, req.body);

    if (req.body.baseService || req.body.extraServices) {
      const base = await Service.findById(req.appointment.baseService);
      const extras = await Service.find({
        _id: { $in: req.appointment.extraServices },
      });

      req.appointment.price =
        base.price + extras.reduce((acc, e) => acc + e.price, 0);
    }

    await req.appointment.save();

    const updated = await Appointment.findById(req.appointment._id)
      .populate("baseService")
      .populate("extraServices");

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao atualizar agendamento" });
  }
};

exports.deleteAppointment = async (req, res) => {
  try {
    const ownerId = getOwnerId(req.user);
    if (req.appointment.user.toString() !== ownerId.toString()) {
      return res.status(403).json({ message: "Acesso negado ao agendamento." });
    }

    await req.appointment.deleteOne();
    res.json({ message: "Agendamento excluído com sucesso" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao excluir agendamento" });
  }
};

exports.uploadAppointments = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Nenhum arquivo enviado." });
    }

    const ownerId = req.user.id || req.user._id;

    const job = await appointmentQueue.add("import", {
      filePath: path.resolve(req.file.path),
      ownerId,
    });

    res.status(202).json({
      message: "Arquivo recebido e em processamento.",
      jobId: job.id,
    });
  } catch (err) {
    console.error("Erro no upload:", err);
    res.status(500).json({ message: "Erro ao enviar arquivo." });
  }
};

exports.getUploadStatus = async (req, res) => {
  try {
    const jobId = req.params.jobId;
    const job = await Job.fromId(appointmentQueue, jobId);

    if (!job) {
      return res.status(404).json({ message: "Job não encontrado." });
    }

    const state = await job.getState(); 
    const progress = job.progress;
    const result = job.returnvalue;

    res.json({ state, progress, result });
  } catch (err) {
    console.error("Erro ao consultar status:", err);
    res.status(500).json({ message: "Erro ao consultar status." });
  }
};
