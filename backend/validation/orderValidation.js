function readInteger(value) {
  if (typeof value === 'number' && Number.isInteger(value)) return value;
  if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) return Number(value.trim());
  return null;
}

function readText(value) {
  if (typeof value !== 'string') return null;
  return value.trim();
}

function blankToNull(value) {
  if (value == null || value === '') return null;
  return value;
}

// Returns an error message, or null when the order is valid.
export function validateCreateOrder(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'Order details are required.';
  }

  const customerName = readText(body.customerName);
  if (!customerName) return 'Customer name is required.';
  if (customerName.length > 120) return 'Customer name must be 120 characters or fewer.';

  const notes = body.notes == null || body.notes === '' ? '' : readText(body.notes);
  if (notes == null) return 'Notes must be text.';
  if (notes.length > 500) return 'Notes must be 500 characters or fewer.';

  const estimated = readInteger(body.estimatedPreparationMinutes);
  if (estimated == null || estimated < 1 || estimated > 480) {
    return 'Estimated preparation time must be a whole number of minutes from 1 to 480.';
  }

  if (!Array.isArray(body.items) || body.items.length < 1) {
    return 'Add at least one food item.';
  }
  if (body.items.length > 20) return 'An order can have at most 20 items.';

  for (const item of body.items) {
    if (!item || typeof item !== 'object') return 'Each food item needs a name and quantity.';
    const itemName = readText(item.itemName);
    if (!itemName) return 'Each food item needs a name.';
    if (itemName.length > 120) return 'Item names must be 120 characters or fewer.';

    const quantity = readInteger(item.quantity);
    if (quantity == null || quantity < 1 || quantity > 99) {
      return 'Each quantity must be a whole number from 1 to 99.';
    }

    const itemNotes = item.notes == null || item.notes === '' ? '' : readText(item.notes);
    if (itemNotes == null) return 'Item notes must be text.';
    if (itemNotes.length > 255) return 'Item notes must be 255 characters or fewer.';
  }

  return null;
}

export function normalizeCreateOrder(body) {
  return {
    customerName: body.customerName.trim(),
    notes: blankToNull(typeof body.notes === 'string' ? body.notes.trim() : null),
    estimatedPreparationMinutes: readInteger(body.estimatedPreparationMinutes),
    items: body.items.map((item) => ({
      itemName: item.itemName.trim(),
      quantity: readInteger(item.quantity),
      notes: blankToNull(typeof item.notes === 'string' ? item.notes.trim() : null),
    })),
  };
}
