import { createApp } from './app.js';
import { checkDatabase } from './config/db.js';
import { env } from './config/env.js';
import { Queue } from './dsa/Queue.js';
import { OrderRepository } from './repositories/orderRepository.js';
import { createOrderService } from './services/orderService.js';

const orderService = createOrderService({
  repository: new OrderRepository(),
  queue: new Queue(),
});

const app = createApp({ orderService, checkDatabase });

try {
  await checkDatabase();
  const pending = await orderService.rebuildQueue();
  app.listen(env.port, () => {
    console.log(`SmartServe API on http://localhost:${env.port}`);
    console.log(`Pending queue rebuilt: ${pending.length} order(s).`);
  });
} catch (error) {
  if (error.code === 'ER_NO_SUCH_TABLE') {
    console.error('Tables are missing. From the backend folder, run: npm run db:setup');
  } else {
    console.error('Could not start SmartServe. Check MySQL and backend/.env.');
  }
  console.error(error.message);
  process.exit(1);
}
