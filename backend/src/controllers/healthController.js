export function getHealth(_req, res) {
  res.status(200).json({
    status: "ok",
    message: "Goalverse API is healthy",
  });
}
