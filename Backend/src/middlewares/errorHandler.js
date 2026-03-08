function notFoundHandler(_req, _res, next) {
  const error = new Error("Route not found");
  error.statusCode = 404;
  next(error);
}

function errorHandler(error, _req, res, _next) {
  const statusCode = error.statusCode || 500;
  const message = statusCode === 500 ? "Internal Server Error" : error.message;
  res.status(statusCode).json({ message });
}

module.exports = {
  notFoundHandler,
  errorHandler
};
