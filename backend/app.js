import cors from 'cors';
import express from 'express';
import { errorHandler } from './middleware/errorHandler.js';
import { createApiRouter } from './routes/api.js';

export function createApp({ orderService, checkDatabase }) {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use('/api', createApiRouter({ orderService, checkDatabase }));
  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Not found.' });
  });
  app.use(errorHandler);
  return app;
}
