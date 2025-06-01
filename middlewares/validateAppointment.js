const Joi = require("joi");

const appointmentSchema = Joi.object({
  petName: Joi.string().trim().required().messages({
    "string.empty": "O nome do pet é obrigatório.",
  }),
  species: Joi.string().valid("Cachorro", "Gato").required().messages({
    "any.only": "A espécie deve ser 'Cachorro' ou 'Gato'.",
    "string.empty": "A espécie é obrigatória.",
  }),
  breed: Joi.string().trim().allow(""),
  notes: Joi.string().trim().allow(""),
  size: Joi.string().valid("Pequeno", "Medio", "Grande").required().messages({
    "any.only": "O porte deve ser 'Pequeno', 'Medio' ou 'Grande'.",
    "string.empty": "O porte é obrigatório.",
  }),
  ownerName: Joi.string().trim().required().messages({
    "string.empty": "O nome do tutor é obrigatório.",
  }),
  ownerPhone: Joi.string()
  .pattern(/^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/)
  .required()
  .messages({
    "string.empty": "O telefone do tutor é obrigatório.",
    "string.pattern.base": "O telefone deve estar no formato (11) 99999-1234 ou 11999991234.",
  }),
  baseService: Joi.string().required().messages({
    "string.empty": "O serviço base é obrigatório.",
  }),
  extraServices: Joi.array().items(Joi.string()),
  date: Joi.date().required().messages({
    "date.base": "A data é obrigatória e deve ser válida.",
  }),
  time: Joi.string()
    .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .required()
    .messages({
      "string.empty": "O horário é obrigatório.",
      "string.pattern.base":
        "O horário deve estar no formato HH:mm (ex: 14:30).",
    }),
  status: Joi.string()
    .valid("Pendente", "Confirmado", "Cancelado", "Finalizado")
    .optional(),
});

module.exports = (req, res, next) => {
  const { error } = appointmentSchema.validate(req.body, { abortEarly: true });

  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  next();
};
