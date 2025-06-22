const { body, validationResult } = require('express-validator');

const serviceValidationRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('O nome é obrigatório')
    .isLength({ max: 100 }).withMessage('O nome deve ter no máximo 100 caracteres'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('A descrição deve ter no máximo 500 caracteres'),

  body('price')
    .notEmpty().withMessage('O preço é obrigatório')
    .isNumeric().withMessage('O preço deve ser um número'),

  body('duration')
    .notEmpty().withMessage('A duração é obrigatória')
    .isInt({ min: 1 }).withMessage('A duração deve ser um número inteiro positivo'),

  body('extra')
    .optional()
    .isBoolean().withMessage('O campo extra deve ser booleano')
];

const validateService = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

module.exports = {
  serviceValidationRules,
  validateService
};
