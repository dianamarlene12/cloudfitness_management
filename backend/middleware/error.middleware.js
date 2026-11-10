/**
 * Centralized Error Handling Middleware
 * Ensures safe, standardized JSON error responses without leaking server secrets or stack traces.
 */
function errorHandler(err, req, res, next) {
  // Safe console log for server diagnostics
  console.error(`[API Error] ${req.method} ${req.originalUrl}:`, err.message || err);

  // Handle MySQL duplicate key error (ER_DUP_ENTRY)
  if (err.code === 'ER_DUP_ENTRY') {
    let duplicateField = 'A record with this unique value';
    if (err.message.includes('email')) duplicateField = 'An account with this email address';
    else if (err.message.includes('rfid_tag')) duplicateField = 'A member with this RFID tag';
    else if (err.message.includes('invoice_number')) duplicateField = 'An invoice with this number';
    else if (err.message.includes('tier_code')) duplicateField = 'A membership tier with this code';

    return res.status(409).json({
      success: false,
      message: `${duplicateField} already exists.`
    });
  }

  // Handle Foreign Key constraint failures
  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({
      success: false,
      message: 'Invalid reference: The referenced member, trainer, or membership does not exist.'
    });
  }

  if (err.code === 'ER_ROW_IS_REFERENCED_2') {
    return res.status(409).json({
      success: false,
      message: 'Cannot delete or alter this record because related history or records depend on it.'
    });
  }

  // Default to 500 Internal Server Error
  const statusCode = err.status || err.statusCode || 500;
  const isDev = process.env.NODE_ENV === 'development';

  res.status(statusCode).json({
    success: false,
    message: statusCode === 500 && !isDev 
      ? 'An unexpected server error occurred. Please try again later.' 
      : err.message || 'Internal Server Error',
    ...(isDev && { stack: err.stack })
  });
}

// 404 Not Found Handler for unmatched API routes
function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`
  });
}

module.exports = {
  errorHandler,
  notFoundHandler
};
