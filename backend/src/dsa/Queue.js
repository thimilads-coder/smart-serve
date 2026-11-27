// FIFO queue of pending orders.
// The linked list keeps enqueue and dequeue at O(1). Array.shift is not used.

import { LinkedList } from './LinkedList.js';

export class Queue {
  constructor() {
    this.list = new LinkedList();
  }

  // Insert at the rear. O(1).
  enqueue(order) {
    this.list.append(order);
    return order;
  }

  // Remove from the front. O(1).
  dequeue() {
    return this.list.removeFirst();
  }

  // Front order, not removed. O(1).
  peek() {
    return this.list.peekFirst();
  }

  // O(1).
  isEmpty() {
    return this.list.isEmpty();
  }

  // O(1).
  size() {
    return this.list.size();
  }

  // FIFO order, front first. O(n).
  toArray() {
    return this.list.toArray();
  }

  // Clear before a rebuild from the database. O(1).
  clear() {
    this.list.clear();
  }

  // Cancel path. Linked-list deletion, not an array filter. O(n).
  removeByOrderId(orderId) {
    return this.list.deleteByOrderId(orderId);
  }
}
