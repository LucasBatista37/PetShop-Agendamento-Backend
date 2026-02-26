const Service = require("../models/Service");
const getOwnerId = require("../utils/getOwnerId");

exports.createService = async (req, res) => {
  try {
    const ownerId = getOwnerId(req.user);

    const { name, description, price, duration, extra } = req.body;

    const service = await Service.create({
      name,
      description,
      price,
      duration,
      extra,
      user: ownerId,
    });

    res.status(201).json(service);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao criar serviço" });
  }
};

exports.getAllServices = async (req, res) => {
  try {
    const ownerId = getOwnerId(req.user);

    const services = await Service.find({ user: ownerId }).sort({ order: 1 });

    res.json(services);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao listar serviços" });
  }
};

exports.getServiceById = async (req, res) => {
  try {
    const ownerId = getOwnerId(req.user);

    if (req.service.user.toString() !== ownerId.toString()) {
      return res.status(403).json({ message: "Acesso negado ao serviço" });
    }

    res.json(req.service);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao obter serviço" });
  }
};

exports.updateService = async (req, res) => {
  try {
    const { name, description, price, duration, extra } = req.body;

    Object.assign(req.service, {
      name,
      description,
      price,
      duration,
      extra,
    });

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

exports.reorderServices = async (req, res) => {
  try {
    const ownerId = getOwnerId(req.user);
    const { services } = req.body; 

    if (!Array.isArray(services)) {
      return res.status(400).json({ message: "Services must be an array" });
    }

    const updatePromises = services.map((item) =>
      Service.updateOne(
        { _id: item._id, user: ownerId },
        { $set: { order: item.order } }
      )
    );

    await Promise.all(updatePromises);

    res.json({ message: "Ordem atualizada com sucesso" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao reordenar serviços" });
  }
};
