export function errorHandler(error, req, res, next) {
  console.error(error);
  if (error.name === "ZodError") {
    return res.status(400).json({
      message: "Validation failed",
      details: error.errors
    });
  }

  res.status(error.status || 500).json({
    message: error.message || "Something went wrong"
  });
}
