const { body } = require("express-validator");

exports.validateRegister = [
  body("name")
    .isLength({ min: 2 })
    .withMessage("Nome deve ter pelo menos 2 caracteres")
    .trim()
    .escape(),
  body("email").isEmail().withMessage("Email inválido"),
  body("phone")
    .notEmpty()
    .withMessage("Telefone é obrigatório")
    .trim()
    .escape(),
  body("password")
    .isStrongPassword({ minLength: 6 })
    .withMessage(
      "A senha deve ter pelo menos 6 caracteres, incluindo letras e números"
    ),
];

exports.validateChangePassword = [
  body("currentPassword").notEmpty().withMessage("Senha atual é obrigatória"),
  body("newPassword")
    .isStrongPassword({ minLength: 6 })
    .withMessage(
      "A nova senha deve ter pelo menos 6 caracteres, incluindo letras e números"
    ),
];

exports.validateForgotPassword = [
  body("email").isEmail().withMessage("Email inválido"),
];

exports.validateResetPassword = [
  body("email").isEmail().withMessage("Email inválido"),
  body("token").notEmpty().withMessage("Token é obrigatório"),
  body("newPassword")
    .isStrongPassword({ minLength: 6 })
    .withMessage(
      "A nova senha deve ter pelo menos 6 caracteres, incluindo letras e números"
    ),
];
