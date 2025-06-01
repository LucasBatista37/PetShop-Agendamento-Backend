const Appointment = require("../models/Appointment");

module.exports = async (req, res, next) => {
  try {
    const { id } = req.params;
    const appointment = await Appointment.findById(id); 
    if (!appointment) {
      return res.status(404).json({ message: "Agendamento não encontrado" });
    }
    req.appointment = appointment;
    next();
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: "ID de agendamento inválido" });
  }
};
