// utils/errorHandler.js

/**
 * Handles and logs errors.
 * @param {Error} error - The error object.
 * @param {string} context - A string indicating where the error occurred.
 */
function handleError(error, context) {
  console.error(`Error in ${context}:`, error);
  // TODO: Implement more sophisticated error logging (e.g., to a logging service)
}

/**
 * Formats an error for sending as a response to the frontend.
 * @param {Error} error - The error object.
 * @returns {object} - A formatted error object for the frontend.
 */
function formatErrorForFrontend(error) {
  console.error("Formatting error for frontend:", error);
  // TODO: Implement more sophisticated error formatting (e.g., hiding sensitive details)
  return { error: error.message || "An unexpected error occurred" };
}

export { handleError, formatErrorForFrontend };