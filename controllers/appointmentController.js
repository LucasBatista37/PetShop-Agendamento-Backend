const Appointment = require("../models/Appointment");

// Create a new appointment
exports.createAppointment = async (req, res) => {
  try {
    const appoint = await Appointment.create(req.body);
    res.status(201).json(appoint);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao criar agendamento" });
  }
};

// Get all appointments
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

// Get one appointment by ID
exports.getAppointmentById = async (req, res) => {
  res.json(req.appointment);
};

// Update an appointment
exports.updateAppointment = async (req, res) => {
  try {
    Object.assign(req.appointment, req.body);
    const updated = await req.appointment.save();
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao atualizar agendamento" });
  }
};

// Delete an appointment
exports.deleteAppointment = async (req, res) => {
  try {
    await req.appointment.deleteOne();
    res.json({ message: "Agendamento excluído com sucesso" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao excluir agendamento" });
  }
};
