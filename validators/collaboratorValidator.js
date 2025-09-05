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
    .isStrongPassword({
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 0,
    })
    .withMessage(
      "A nova senha deve ter pelo menos 8 caracteres, incluindo letras maiúsculas, minúsculas e números"
    ),
];
