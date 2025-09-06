const Appointment = require("../models/Appointment");

module.exports = async (req, res, next) => {
  try {
    const { id } = req.params;
    const appointment = await Appointment.findById(id);

    if (!appointment) {
      return res.status(404).json({ message: "Agendamento não encontrado" });
    }

    if (appointment.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Acesso não autorizado" });
    }

    req.appointment = appointment;
    next();
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: "ID de agendamento inválido" });
  }
};
