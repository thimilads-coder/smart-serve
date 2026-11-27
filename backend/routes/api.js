import { Router } from 'express';
import { HttpError } from '../errors/HttpError.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

export function createApiRouter({ orderService, checkDatabase }) {
  const router = Router();

  router.get('/health', asyncHandler(async (req, res) => {
    try {
      await checkDatabase();
    } catch {
      throw new HttpError(503, 'Database is unavailable.');
    }
    res.json({ status: 'ok' });
  }));

  router.get('/orders', asyncHandler(async (req, res) => {
    const orders = await orderService.listOrders(req.query.status);
    res.json({ orders });
  }));

  router.get('/orders/queue', asyncHandler(async (req, res) => {
    res.json(await orderService.getQueue());
  }));

  router.get('/orders/search', asyncHandler(async (req, res) => {
    res.json(await orderService.searchOrders(req.query.q));
  }));

  router.get('/orders/:id', asyncHandler(async (req, res) => {
    res.json({ order: await orderService.getOrder(req.params.id) });
  }));

  router.post('/orders', asyncHandler(async (req, res) => {
    const order = await orderService.createOrder(req.body);
    res.status(201).json({ order });
  }));

  router.post('/orders/start-next', asyncHandler(async (req, res) => {
    const order = await orderService.startNext();
    res.json({ order });
  }));

  router.patch('/orders/:id/complete', asyncHandler(async (req, res) => {
    const order = await orderService.completeOrder(req.params.id);
    res.json({ order });
  }));

  router.patch('/orders/:id/cancel', asyncHandler(async (req, res) => {
    const order = await orderService.cancelOrder(req.params.id);
    res.json({ order });
  }));

  router.get('/dashboard/summary', asyncHandler(async (req, res) => {
    res.json(await orderService.getDashboard());
  }));

  router.get('/analytics/preparation-times', asyncHandler(async (req, res) => {
    res.json(await orderService.getAccuracy());
  }));

  router.get('/analytics/delays', asyncHandler(async (req, res) => {
    res.json(await orderService.getDelays());
  }));

  return router;
}
