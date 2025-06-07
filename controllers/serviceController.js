const Service = require("../models/Service");

exports.createService = async (req, res) => {
  try {
    const { name, description, price, duration, extra } = req.body;
    const service = await Service.create({
      name,
      description,
      price,
      duration,
      extra,
      user: req.userId,
    });
    res.status(201).json(service);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao criar serviço" });
  }
};

exports.getAllServices = async (req, res) => {
  try {
    const services = await Service.find({ user: req.userId });
    res.json(services);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao listar serviços" });
  }
};

exports.getServiceById = async (req, res) => {
  try {
    res.json(req.service);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao obter serviço" });
  }
};

exports.updateService = async (req, res) => {
  try {
    const { name, description, price, duration, extra } = req.body;
    Object.assign(req.service, { name, description, price, duration, extra });
    const updated = await req.service.save();
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao atualizar serviço" });
  }
};

exports.deleteService = async (req, res) => {
  try {
    await req.service.deleteOne();
    res.json({ message: "Serviço excluído com sucesso" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao excluir serviço" });
  }
};
