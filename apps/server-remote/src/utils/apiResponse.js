export const sendSuccess = (res, data = {}, statusCode = 200, meta = null) => {
  const payload = {
    success: true,
    data
  };

  if (meta) {
    payload.meta = meta;
  }

  return res.status(statusCode).json(payload);
};

export const sendError = (
  res,
  message = "Request failed",
  statusCode = 500,
  details = null,
  code = "REQUEST_FAILED"
) =>
  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      details
    }
  });
