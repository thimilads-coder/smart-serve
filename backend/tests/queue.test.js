import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Queue } from '../src/dsa/Queue.js';

describe('Queue', () => {
  it('enqueues at the rear and dequeues the oldest order', () => {
    const queue = new Queue();
    queue.enqueue({ id: 1, customerName: 'Ada' });
    queue.enqueue({ id: 2, customerName: 'Grace' });
    queue.enqueue({ id: 3, customerName: 'Lin' });

    assert.deepEqual(
      queue.toArray().map((order) => order.id),
      [1, 2, 3]
    );
    assert.equal(queue.dequeue().id, 1);
    assert.equal(queue.dequeue().id, 2);
    assert.deepEqual(queue.toArray().map((order) => order.id), [3]);
  });

  it('peek does not remove the front order', () => {
    const queue = new Queue();
    queue.enqueue({ id: 7 });
    assert.equal(queue.peek().id, 7);
    assert.equal(queue.size(), 1);
    assert.equal(queue.peek().id, 7);
  });

  it('reports empty behavior', () => {
    const queue = new Queue();
    assert.equal(queue.isEmpty(), true);
    assert.equal(queue.size(), 0);
    assert.equal(queue.peek(), null);
    assert.equal(queue.dequeue(), null);
    assert.equal(queue.removeByOrderId(1), null);
  });

  it('tracks size as orders are added and removed', () => {
    const queue = new Queue();
    queue.enqueue({ id: 1 });
    queue.enqueue({ id: 2 });
    assert.equal(queue.size(), 2);
    queue.dequeue();
    assert.equal(queue.size(), 1);
    queue.clear();
    assert.equal(queue.isEmpty(), true);
  });

  it('removes a middle order with linked-list deletion', () => {
    const queue = new Queue();
    queue.enqueue({ id: 1 });
    queue.enqueue({ id: 2 });
    queue.enqueue({ id: 3 });

    assert.equal(queue.removeByOrderId(2).id, 2);
    assert.deepEqual(
      queue.toArray().map((order) => order.id),
      [1, 3]
    );
    assert.equal(queue.size(), 2);
  });

  it('keeps FIFO order across many orders', () => {
    const queue = new Queue();
    for (let id = 1; id <= 1000; id += 1) queue.enqueue({ id });
    for (let id = 1; id <= 1000; id += 1) {
      assert.equal(queue.dequeue().id, id);
    }
    assert.equal(queue.isEmpty(), true);
  });
});
