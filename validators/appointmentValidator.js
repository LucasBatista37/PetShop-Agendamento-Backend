const { body, validationResult } = require("express-validator");

const appointmentValidationRules = [
  body("petName")
    .trim()
    .notEmpty()
    .withMessage("O nome do pet é obrigatório.")
    .isLength({ max: 100 })
    .withMessage("O nome do pet deve ter no máximo 100 caracteres."),

  body("species")
    .notEmpty()
    .withMessage("A espécie é obrigatória.")
    .isIn(["Cachorro", "Gato"])
    .withMessage("A espécie deve ser 'Cachorro' ou 'Gato'."),

  body("breed")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("A raça deve ter no máximo 100 caracteres."),

  body("notes")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("As observações devem ter no máximo 500 caracteres."),

  body("size")
    .notEmpty()
    .withMessage("O porte é obrigatório.")
    .isIn(["Pequeno", "Medio", "Grande"])
    .withMessage("O porte deve ser 'Pequeno', 'Medio' ou 'Grande'."),

  body("ownerName")
    .trim()
    .notEmpty()
    .withMessage("O nome do tutor é obrigatório.")
    .isLength({ max: 100 })
    .withMessage("O nome do tutor deve ter no máximo 100 caracteres."),

  body("ownerPhone")
    .notEmpty()
    .withMessage("O telefone do tutor é obrigatório.")
    .matches(/^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/)
    .withMessage(
      "O telefone deve estar no formato (11) 99999-1234 ou 11999991234."
    ),

  body("baseService")
    .notEmpty()
    .withMessage("O serviço base é obrigatório.")
    .isMongoId()
    .withMessage("O serviço base deve ser um ID válido."),

  body("extraServices")
    .optional()
    .isArray()
    .withMessage("Os serviços extras devem ser uma lista.")
    .custom((arr) => arr.every((item) => typeof item === "string"))
    .withMessage("Cada serviço extra deve ser um ID válido.")
    .custom((arr) => arr.every((item) => /^[0-9a-fA-F]{24}$/.test(item)))
    .withMessage("Cada serviço extra deve ser um ID Mongo válido."),

  body("date")
    .notEmpty()
    .withMessage("A data é obrigatória.")
    .isISO8601()
    .withMessage("A data deve ser uma data válida."),

  body("time")
    .notEmpty()
    .withMessage("O horário é obrigatório.")
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage("O horário deve estar no formato HH:mm (ex: 14:30)."),

  body("status")
    .optional()
    .isIn(["Pendente", "Confirmado", "Cancelado", "Finalizado"])
    .withMessage(
      "Status deve ser 'Pendente', 'Confirmado', 'Cancelado' ou 'Finalizado'."
    ),
];

const validateAppointment = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg });
  }
  next();
};

module.exports = {
  appointmentValidationRules,
  validateAppointment,
};
