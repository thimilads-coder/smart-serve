import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LinkedList } from '../src/dsa/LinkedList.js';

describe('LinkedList', () => {
  it('appends orders and finds them', () => {
    const list = new LinkedList();
    list.append({ id: 1 });
    list.append({ id: 2 });
    list.append({ id: 3 });

    assert.equal(list.size(), 3);
    assert.equal(list.findByOrderId(2).id, 2);
    assert.equal(list.findByOrderId(99), null);
    assert.deepEqual(
      list.toArray().map((order) => order.id),
      [1, 2, 3]
    );
  });

  it('deletes the first, middle, and last node', () => {
    const list = new LinkedList();
    list.append({ id: 1 });
    list.append({ id: 2 });
    list.append({ id: 3 });
    list.append({ id: 4 });

    assert.equal(list.deleteByOrderId(1).id, 1);
    assert.deepEqual(
      list.toArray().map((order) => order.id),
      [2, 3, 4]
    );

    assert.equal(list.deleteByOrderId(3).id, 3);
    assert.deepEqual(
      list.toArray().map((order) => order.id),
      [2, 4]
    );

    assert.equal(list.deleteByOrderId(4).id, 4);
    assert.deepEqual(
      list.toArray().map((order) => order.id),
      [2]
    );
    assert.equal(list.peekFirst().id, 2);
  });

  it('handles an empty list', () => {
    const list = new LinkedList();
    assert.equal(list.isEmpty(), true);
    assert.equal(list.peekFirst(), null);
    assert.equal(list.removeFirst(), null);
    assert.equal(list.deleteByOrderId(1), null);
    assert.equal(list.findByOrderId(1), null);

    list.append({ id: 5 });
    assert.equal(list.deleteByOrderId(5).id, 5);
    assert.equal(list.isEmpty(), true);
    assert.equal(list.size(), 0);
  });

  it('clear drops every node', () => {
    const list = new LinkedList();
    list.append({ id: 1 });
    list.append({ id: 2 });
    list.clear();
    assert.equal(list.isEmpty(), true);
    assert.deepEqual(list.toArray(), []);
  });
});
