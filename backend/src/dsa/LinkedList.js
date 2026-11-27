// Singly linked list. The queue stores pending orders here.
// Head is the front. Tail is the rear. There is no second copy.

function sameId(order, orderId) {
  if (order == null || orderId == null || orderId === '') return false;
  return Number(order.id) === Number(orderId);
}

class ListNode {
  constructor(data) {
    this.data = data;
    this.next = null;
  }
}

export class LinkedList {
  constructor() {
    this.head = null;
    this.tail = null;
    this.length = 0;
  }

  // Add at the rear. O(1) because the tail is stored.
  append(data) {
    const node = new ListNode(data);
    if (!this.head) {
      this.head = node;
      this.tail = node;
    } else {
      this.tail.next = node;
      this.tail = node;
    }
    this.length += 1;
    return data;
  }

  // Remove the front node. O(1).
  removeFirst() {
    if (!this.head) return null;
    const data = this.head.data;
    this.head = this.head.next;
    if (!this.head) this.tail = null;
    this.length -= 1;
    return data;
  }

  // Front order, still in the list. O(1).
  peekFirst() {
    return this.head ? this.head.data : null;
  }

  // O(1).
  isEmpty() {
    return this.length === 0;
  }

  // O(1).
  size() {
    return this.length;
  }

  // Drop every node. Used when the queue is rebuilt from MySQL. O(1).
  clear() {
    this.head = null;
    this.tail = null;
    this.length = 0;
  }

  // Walk until the order id matches. O(n).
  findByOrderId(orderId) {
    let current = this.head;
    while (current) {
      if (sameId(current.data, orderId)) return current.data;
      current = current.next;
    }
    return null;
  }

  // Unlink one order. Works for the first, middle, or last node. O(n).
  deleteByOrderId(orderId) {
    if (!this.head) return null;
    if (sameId(this.head.data, orderId)) return this.removeFirst();

    let previous = this.head;
    let current = this.head.next;
    while (current) {
      if (sameId(current.data, orderId)) {
        previous.next = current.next;
        if (current === this.tail) this.tail = previous;
        this.length -= 1;
        return current.data;
      }
      previous = current;
      current = current.next;
    }
    return null;
  }

  // Front to rear. O(n).
  toArray() {
    const values = [];
    let current = this.head;
    while (current) {
      values.push(current.data);
      current = current.next;
    }
    return values;
  }
}
