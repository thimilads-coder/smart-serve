-- SmartServe tables. Timestamps are stored in UTC.
-- Create the database first, or run: npm run db:setup

CREATE TABLE IF NOT EXISTS orders (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_number VARCHAR(32) NOT NULL,
  customer_name VARCHAR(120) NOT NULL,
  status ENUM('PENDING', 'PREPARING', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
  estimated_preparation_minutes INT UNSIGNED NOT NULL,
  created_at DATETIME(3) NOT NULL,
  started_at DATETIME(3) NULL,
  completed_at DATETIME(3) NULL,
  notes VARCHAR(500) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_orders_order_number (order_number),
  KEY idx_orders_status_created (status, created_at, id),
  KEY idx_orders_customer_name (customer_name),
  CONSTRAINT chk_orders_estimate_positive CHECK (estimated_preparation_minutes > 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS order_items (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id INT UNSIGNED NOT NULL,
  item_name VARCHAR(120) NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  notes VARCHAR(255) NULL,
  PRIMARY KEY (id),
  KEY idx_order_items_order_id (order_id),
  CONSTRAINT fk_order_items_order
    FOREIGN KEY (order_id) REFERENCES orders (id)
    ON DELETE CASCADE,
  CONSTRAINT chk_order_items_quantity_positive CHECK (quantity > 0)
) ENGINE=InnoDB;
