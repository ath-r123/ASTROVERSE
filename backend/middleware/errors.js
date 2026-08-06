function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

function handleError(error, req, res, next) {
  console.error(error);
  const status = error.name === 'ValidationError' ? 400 : error.status || 500;
  res.status(status).json({ message: error.message || 'Something went wrong.' });
}

module.exports = { notFound, handleError };
