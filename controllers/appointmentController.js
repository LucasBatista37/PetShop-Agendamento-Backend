const Appointment = require("../models/Appointment");
const Service = require("../models/Service");

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

exports.getAllAppointments = async (_req, res) => {
  try {
    const list = await Appointment.find()
      .populate("baseService")
      .populate("extraServices");
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao listar agendamentos" });
  }
};

exports.getAppointmentById = async (req, res) => {
  res.json(req.appointment);
};

exports.updateAppointment = async (req, res) => {
  try {
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
    await req.appointment.deleteOne();
    res.json({ message: "Agendamento excluído com sucesso" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao excluir agendamento" });
  }
};
