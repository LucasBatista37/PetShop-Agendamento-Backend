const { body, validationResult } = require('express-validator');

const supportValidationRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('O nome é obrigatório.')
    .isLength({ max: 100 }).withMessage('O nome deve ter no máximo 100 caracteres.'),

  body('email')
    .trim()
    .notEmpty().withMessage('O e-mail é obrigatório.')
    .isEmail().withMessage('O e-mail deve ser válido.'),

  body('subject')
    .trim()
    .notEmpty().withMessage('O assunto é obrigatório.')
    .isLength({ max: 200 }).withMessage('O assunto deve ter no máximo 200 caracteres.'),

  body('message')
    .trim()
    .notEmpty().withMessage('A mensagem é obrigatória.')
    .isLength({ max: 2000 }).withMessage('A mensagem deve ter no máximo 2000 caracteres.')
];

const validateSupport = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg });
  }
  next();
};

module.exports = {
  supportValidationRules,
  validateSupport
};
