const Service = require("../models/Service");
const getOwnerId = require("../utils/getOwnerId");

module.exports = async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ message: "Serviço não encontrado" });
    }

    const ownerId = getOwnerId(req.user);
    if (service.user.toString() !== ownerId.toString()) {
      return res.status(403).json({ message: "Acesso não autorizado" });
    }

    req.service = service;
    next();
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: "ID de serviço inválido" });
  }
};
