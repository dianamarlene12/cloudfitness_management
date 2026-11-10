const { validationResult } = require('express-validator');

/**
 * Validation Middleware
 * Checks for express-validator errors and returns a 422 Unprocessable Entity response with details.
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed. Please correct the highlighted errors.',
      errors: errors.array().map(err => ({
        field: err.path || err.param,
        message: err.msg
      }))
    });
  }
  next();
}

module.exports = {
  validate
};
