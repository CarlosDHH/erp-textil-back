// ============================================================
//  ERP SEWING WORKSHOP — Database Schema
//  Import at: https://dbdiagram.io
//  Engine: MySQL 8.0+ / MariaDB 10.6+
//  Version: 1.0
// ============================================================


// ─────────────────────────────────────────────
//  MODULE: ACCESS CONTROL
// ─────────────────────────────────────────────

Table roles {
  id            char(36)     [pk, note: 'UUID v4']
  name          varchar(60)  [not null, note: 'e.g. admin, warehouse_clerk, purchasing, production']
  description   text         [note: 'Description of role responsibilities']
  is_active     boolean      [not null, default: true]
  created_at    timestamp    [not null, default: `now()`]
}

Table users {
  id             char(36)     [pk, note: 'UUID v4']
  full_name      varchar(120) [not null]
  email          varchar(180) [not null, unique, note: 'Used as login credential']
  password_hash  varchar(255) [not null, note: 'bcrypt']
  role_id        char(36)     [not null, ref: > roles.id]
  is_active      boolean      [not null, default: true]
  created_at     timestamp    [not null, default: `now()`]
}

Table modules {
  id           char(36)     [pk, note: 'UUID v4']
  slug         varchar(80)  [not null, unique, note: 'e.g. warehouse, purchase_orders, dispatch']
  name         varchar(120) [not null]
  description  text
  icon         varchar(80)  [note: 'Icon class for the frontend']
  path         varchar(200) [note: 'e.g. /warehouse/lots']
  parent_id    char(36)     [ref: > modules.id, note: 'NULL if root module']
  sort_order   int          [not null, default: 0]
  is_active    boolean      [not null, default: true]
}

Table role_permissions {
  id          char(36)  [pk, note: 'UUID v4']
  role_id     char(36)  [not null, ref: > roles.id]
  module_id   char(36)  [not null, ref: > modules.id]
  can_view    boolean   [not null, default: false]
  can_create  boolean   [not null, default: false]
  can_edit    boolean   [not null, default: false]
  can_delete  boolean   [not null, default: false]
  assigned_at timestamp [not null, default: `now()`]

  indexes {
    (role_id, module_id) [unique, name: 'uq_role_module']
  }
}

Table user_permission_overrides {
  id            char(36)     [pk, note: 'UUID v4']
  user_id       char(36)     [not null, ref: > users.id]
  module_id     char(36)     [not null, ref: > modules.id]
  can_view      boolean      [not null, default: false]
  can_create    boolean      [not null, default: false]
  can_edit      boolean      [not null, default: false]
  can_delete    boolean      [not null, default: false]
  override_type varchar(10)  [not null, note: 'grant | revoke']
  reason        text         [note: 'Justification for the special permission']
  granted_by    char(36)     [not null, ref: > users.id]
  granted_at    timestamp    [not null, default: `now()`]
  expires_at    timestamp    [note: 'NULL = no expiry']
}


// ─────────────────────────────────────────────
//  MODULE: CATALOG
// ─────────────────────────────────────────────

Table suppliers {
  id            char(36)     [pk, note: 'UUID v4']
  name          varchar(180) [not null]
  tax_id        varchar(13)  [note: 'RFC / VAT number']
  phone         varchar(20)
  email         varchar(180)
  contact_name  varchar(120) [note: 'Name of the contact person']
  is_active     boolean      [not null, default: true]
  created_at    timestamp    [not null, default: `now()`]
}

Table materials {
  id                char(36)       [pk, note: 'UUID v4']
  sku               varchar(40)    [not null, unique, note: 'e.g. FAB-001, THR-CONE-BL']
  name              varchar(180)   [not null]
  material_type     varchar(20)    [not null, note: 'fabric | thread | zipper | button | interfacing | ink | stationery | accessory | other']
  unit_of_measure   varchar(30)    [not null, note: 'meter | piece | cone | kg | roll']
  min_stock         decimal(10,2)  [not null, default: 0]
  current_stock     decimal(10,2)  [not null, default: 0, note: 'Synced via trigger from inventory_movements']
  avg_days_duration int            [note: 'Average number of days the material lasts. e.g. thread cone = 4 days']
  is_active         boolean        [not null, default: true]
  created_at        timestamp      [not null, default: `now()`]
}


// ─────────────────────────────────────────────
//  MODULE: PURCHASE ORDERS
// ─────────────────────────────────────────────

Table purchase_orders {
  id                    char(36)       [pk, note: 'UUID v4']
  order_number          varchar(20)    [not null, unique, note: 'e.g. PO-2025-0001']
  supplier_id           char(36)       [not null, ref: > suppliers.id]
  created_by            char(36)       [not null, ref: > users.id]
  approved_by           char(36)       [ref: > users.id, note: 'NULL until approved']
  status                varchar(20)    [not null, default: 'draft', note: 'draft | sent | confirmed | partial | completed | cancelled']
  issued_at             date           [not null]
  estimated_delivery_at date
  actual_delivery_at    date
  total_amount          decimal(12,2)
  notes                 text
  created_at            timestamp      [not null, default: `now()`]
}

Table purchase_order_items {
  id                char(36)       [pk, note: 'UUID v4']
  purchase_order_id char(36)       [not null, ref: > purchase_orders.id]
  material_id       char(36)       [not null, ref: > materials.id]
  quantity_ordered  decimal(10,2)  [not null]
  quantity_received decimal(10,2)  [not null, default: 0]
  unit_price        decimal(10,2)
  extra_notes       text
  status            varchar(15)    [not null, default: 'pending', note: 'pending | partial | complete']
}


// ─────────────────────────────────────────────
//  MODULE: WAREHOUSE
// ─────────────────────────────────────────────

Table inventory_lots {
  id                  char(36)       [pk, note: 'UUID v4']
  material_id         char(36)       [not null, ref: > materials.id]
  supplier_id         char(36)       [not null, ref: > suppliers.id]
  purchase_order_id   char(36)       [ref: > purchase_orders.id, note: 'NULL if received without a formal order']
  lot_number          varchar(60)    [not null, unique]
  season              varchar(60)    [note: 'e.g. Spring-Summer 2025']
  tone_range          varchar(60)    [note: 'e.g. Tone 1-25, Tone 26-40']
  color               varchar(60)
  initial_quantity    decimal(10,2)  [not null]
  current_quantity    decimal(10,2)  [not null]
  warehouse_location  varchar(80)    [note: 'e.g. Shelf A-3']
  received_at         date           [not null]
  remarks             text
  created_at          timestamp      [not null, default: `now()`]
}

Table dispatch_orders {
  id            char(36)    [pk, note: 'UUID v4']
  order_number  varchar(20) [not null, unique, note: 'e.g. DO-2025-0042']
  requested_by  char(36)    [not null, ref: > users.id]
  approved_by   char(36)    [ref: > users.id, note: 'NULL until approved']
  fulfilled_by  char(36)    [ref: > users.id, note: 'Warehouse clerk who delivers']
  status        varchar(15) [not null, default: 'pending', note: 'pending | approved | delivered | rejected']
  requested_at  date        [not null]
  request_time  time        [not null]
  delivered_at  date
  reason        text
  created_at    timestamp   [not null, default: `now()`]
}

Table dispatch_order_items {
  id                 char(36)       [pk, note: 'UUID v4']
  dispatch_order_id  char(36)       [not null, ref: > dispatch_orders.id]
  inventory_lot_id   char(36)       [not null, ref: > inventory_lots.id]
  quantity_requested decimal(10,2)  [not null]
  quantity_delivered decimal(10,2)  [note: 'May differ from requested if stock is insufficient']
  notes              text
}

Table inventory_movements {
  id                char(36)       [pk, note: 'UUID v4']
  inventory_lot_id  char(36)       [not null, ref: > inventory_lots.id]
  user_id           char(36)       [not null, ref: > users.id]
  source_id         char(36)       [note: 'ID of originating purchase_order or dispatch_order']
  movement_type     varchar(10)    [not null, note: 'in | out | adjustment | loss']
  quantity          decimal(10,2)  [not null, note: 'Always positive. movement_type determines whether it adds or subtracts.']
  reason            text
  occurred_at       timestamp      [not null, default: `now()`]
}
