const mongoose = require("mongoose");
const Appointment = require("../models/Appointment");
const Service = require("../models/Service");
const getOwnerId = require("../utils/getOwnerId");
const { Queue } = require("bullmq");
const { redisConnection } = require("../utils/redis");
const { parseISO, isBefore } = require("date-fns");
const { uploadFileToGridFS } = require("../utils/gridfs");
const User = require("../models/User");
const { withTransaction } = require("../utils/withTransaction");

const appointmentQueue = new Queue("appointments", {
  connection: redisConnection,
});

const VALID_STATUSES = ["Pendente", "Confirmado", "Cancelado", "Finalizado"];

function validateAppointmentInput(body) {
  const {
    petName,
    ownerName,
    baseService,
    date,
    time,
    status = "Pendente",
  } = body;

  if (!petName || !ownerName || !baseService || !date || !time) {
    return "Campos obrigatórios ausentes.";
  }

  if (!VALID_STATUSES.includes(status)) {
    return "Status inválido.";
  }

  const appointmentDate = parseISO(`${date}T${time}`);
  if (isBefore(appointmentDate, new Date())) {
    return "Data e hora do agendamento devem ser futuras.";
  }

  return null;
}

exports.createAppointment = async (req, res) => {
  const validationError = validateAppointmentInput(req.body);
  if (validationError)
    return res.status(400).json({ message: validationError });

  try {
    const populated = await withTransaction(async (session) => {
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

      const base = await Service.findById(baseService).session(session);
      if (!base) throw new Error("Serviço base não encontrado.");

      const extras = await Service.find({
        _id: { $in: extraServices },
      }).session(session);
      const total =
        base.price + extras.reduce((acc, e) => acc + (e.price || 0), 0);

      const ownerId = getOwnerId(req.user);

      const appoint = await Appointment.create(
        [
          {
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
          },
        ],
        { session }
      );

      return await Appointment.findById(appoint[0]._id)
        .populate("baseService")
        .populate("extraServices")
        .session(session);
    });

    res.status(201).json(populated);
  } catch (err) {
    console.error("Erro ao criar agendamento:", err);
    res
      .status(500)
      .json({ message: err.message || "Erro ao criar agendamento" });
  }
};

exports.getAllAppointments = async (req, res) => {
  try {
    const ownerId = getOwnerId(req.user);

    const user = await User.findById(ownerId);
    const defaultSortOrder = user?.appointmentsSortOrder || "asc";

    const sortOrder = req.query.sortOrder === "desc" ? -1 : 1;
    const finalSortOrder = req.query.sortOrder
      ? sortOrder
      : defaultSortOrder === "desc"
      ? -1
      : 1;

    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);

    const search = req.query.search?.trim() || "";
    const filterStatus = req.query.filterStatus || "";
    const filterScope = req.query.filterScope || "";

    const match = { user: ownerId };
    if (search) {
      match.$or = [
        { petName: { $regex: search, $options: "i" } },
        { ownerName: { $regex: search, $options: "i" } },
      ];
    }
    if (filterStatus) match.status = filterStatus;

    const now = new Date();
    if (filterScope === "today") {
      match.date = { $gte: startOfDay(now), $lte: endOfDay(now) };
    } else if (filterScope === "next7days") {
      match.date = { $gte: startOfDay(now), $lte: endOfDay(addDays(now, 7)) };
    }

    const results = await Appointment.aggregate([
      { $match: match },
      { $sort: { date: finalSortOrder, time: finalSortOrder } },
      {
        $facet: {
          data: [
            { $skip: (page - 1) * limit },
            { $limit: limit },
            {
              $lookup: {
                from: "services",
                localField: "baseService",
                foreignField: "_id",
                as: "baseService",
              },
            },
            { $unwind: "$baseService" },
            {
              $lookup: {
                from: "services",
                localField: "extraServices",
                foreignField: "_id",
                as: "extraServices",
              },
            },
          ],
          totalCount: [{ $count: "count" }],
        },
      },
    ]);

    const appointments = results[0].data;
    const totalItems = results[0].totalCount[0]?.count || 0;
    const totalPages = Math.ceil(totalItems / limit);

    res.json({
      data: appointments,
      currentPage: page,
      totalPages,
      totalItems,
      sortOrder: defaultSortOrder,
    });
  } catch (err) {
    console.error("Erro ao listar agendamentos:", err);
    res.status(500).json({ message: "Erro ao listar agendamentos" });
  }
};

exports.updateAppointment = async (req, res) => {
  try {
    const updated = await withTransaction(async (session) => {
      const { id } = req.params;

      const appointment = await Appointment.findById(id).session(session);
      if (!appointment) {
        throw { status: 404, message: "Agendamento não encontrado" };
      }

      const ownerId = getOwnerId(req.user);
      if (appointment.user.toString() !== ownerId.toString()) {
        throw { status: 403, message: "Acesso negado ao agendamento." };
      }

      Object.assign(appointment, req.body);

      if (req.body.baseService || req.body.extraServices) {
        const base = await Service.findById(appointment.baseService).session(
          session
        );
        if (!base)
          throw { status: 400, message: "Serviço base não encontrado" };

        const extras = await Service.find({
          _id: { $in: appointment.extraServices },
        }).session(session);

        appointment.price =
          base.price + extras.reduce((acc, e) => acc + (e.price || 0), 0);
      }

      await appointment.save({ session });

      return await Appointment.findById(appointment._id)
        .populate("baseService")
        .populate("extraServices")
        .session(session);
    });

    res.json(updated);
  } catch (err) {
    console.error("Erro ao atualizar agendamento:", err);
    res
      .status(err.status || 500)
      .json({ message: err.message || "Erro ao atualizar agendamento" });
  }
};

exports.deleteAppointment = async (req, res) => {
  try {
    const deleted = await withTransaction(async (session) => {
      const { id } = req.params;

      const appointment = await Appointment.findById(id).session(session);
      if (!appointment) {
        throw { status: 404, message: "Agendamento não encontrado" };
      }

      const ownerId = getOwnerId(req.user);
      if (appointment.user.toString() !== ownerId.toString()) {
        throw { status: 403, message: "Acesso negado ao agendamento." };
      }

      await appointment.deleteOne({ session });

      return { message: "Agendamento excluído com sucesso" };
    });

    return res.json(deleted);
  } catch (err) {
    console.error("Erro ao excluir agendamento:", err);
    return res
      .status(err.status || 500)
      .json({ message: err.message || "Erro ao excluir agendamento" });
  }
};

exports.getAppointmentById = async (req, res) => {
  res.json(req.appointment);
};

exports.updateSortPreference = async (req, res) => {
  try {
    const ownerId = getOwnerId(req.user);
    const { sortOrder } = req.body;

    if (!["asc", "desc"].includes(sortOrder)) {
      return res.status(400).json({ message: "SortOrder inválido" });
    }

    const user = await User.findByIdAndUpdate(
      ownerId,
      { appointmentsSortOrder: sortOrder },
      { new: true }
    );

    res.json({
      message: "Preferência de ordenação atualizada",
      sortOrder: user.appointmentsSortOrder,
    });
  } catch (err) {
    console.error("Erro ao atualizar preferência:", err);
    res.status(500).json({ message: "Erro ao atualizar preferência" });
  }
};

exports.uploadAppointments = async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ message: "Nenhum arquivo enviado." });

    const fileId = await uploadFileToGridFS(req.file);
    const ownerId = req.user._id;

    const job = await appointmentQueue.add("importAppointments", {
      fileId,
      ownerId,
    });
    console.log(
      `🚀 Job ${job.id} criado para importar: ${req.file.originalname}`
    );

    res.status(202).json({
      message: "Arquivo recebido e em processamento.",
      jobId: job.id,
      file: { originalName: req.file.originalname, fileId },
    });
  } catch (err) {
    console.error("Erro ao enviar arquivo:", err);
    res.status(500).json({ message: err.message || "Erro ao enviar arquivo." });
  }
};

exports.getUploadStatus = async (req, res) => {
  try {
    const job = await appointmentQueue.getJob(req.params.jobId);
    if (!job) return res.status(404).json({ message: "Job não encontrado" });

    const state = await job.getState();
    const progress = await job.getProgress();
    const reason = job.failedReason || null;

    res.json({ jobId: job.id, state, progress, reason });
  } catch (err) {
    console.error("Erro ao consultar status do job:", err);
    res
      .status(500)
      .json({ message: err.message || "Erro ao consultar status." });
  }
};
