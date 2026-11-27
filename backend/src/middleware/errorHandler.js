export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    res.status(400).json({ error: 'Request body must be valid JSON.' });
    return;
  }

  if (err.code === 'ER_DUP_ENTRY') {
    res.status(409).json({ error: 'That order could not be saved. Please try again.' });
    return;
  }

  const status = Number(err.status) || 500;
  if (status >= 500) console.error(err);

  res.status(status).json({
    error: status >= 500 ? 'Something went wrong. Please try again.' : err.message,
  });
}
