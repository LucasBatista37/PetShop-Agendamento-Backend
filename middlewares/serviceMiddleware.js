const Service = require('../models/Service');

module.exports = async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) return res.status(404).json({ message: 'Serviço não encontrado' });
    req.service = service;
    next();
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: 'ID de serviço inválido' });
  }
};