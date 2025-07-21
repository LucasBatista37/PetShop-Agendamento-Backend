const { body } = require("express-validator");

exports.validateInvite = [
  body("email").isEmail().withMessage("Email inválido"),
  body("department").optional().trim().escape(),
];

exports.validateAcceptInvite = [
  body("email").isEmail().withMessage("Email inválido"),
  body("token").notEmpty().withMessage("Token é obrigatório"),
  body("name")
    .isLength({ min: 2 })
    .withMessage("Nome deve ter pelo menos 2 caracteres")
    .trim()
    .escape(),
  body("password")
    .isStrongPassword({ minLength: 6 })
    .withMessage(
      "A senha deve ter no mínimo 6 caracteres, incluindo letras e números"
    ),
];
