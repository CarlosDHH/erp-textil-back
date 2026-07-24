import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// ─── Catálogo base ─────────────────────────────────────────────────────────

const MODULES = [
  { slug: 'dashboard', name: 'Dashboard', icon: 'home', path: '/admin/dashboard', sortOrder: 1 },
  { slug: 'usuarios', name: 'Usuarios', icon: 'users', path: '/admin/users', sortOrder: 2 },
  { slug: 'roles', name: 'Roles', icon: 'shield', path: '/admin/roles', sortOrder: 3 },
  { slug: 'insumos', name: 'Insumos', icon: 'box', path: '/admin/supplies', sortOrder: 4 },
  { slug: 'proveedores', name: 'Proveedores', icon: 'truck', path: '/admin/suppliers', sortOrder: 5 },
  { slug: 'lotes', name: 'Lotes', icon: 'layers', path: '/admin/batches', sortOrder: 6 },
  { slug: 'almacen', name: 'Almacén', icon: 'archive', path: '/admin/warehouse', sortOrder: 7 },
  { slug: 'compras', name: 'Compras', icon: 'shopping-cart', path: '/admin/purchase-orders', sortOrder: 8 },
  { slug: 'reportes', name: 'Reportes', icon: 'bar-chart-2', path: '/admin/reports', sortOrder: 9 },
]

const ROLES = [
  { name: 'admin', description: 'Administrador del sistema con acceso total' },
  { name: 'almacenista', description: 'Encargado de la gestión de almacén e inventario' },
  { name: 'comprador', description: 'Encargado de compras y relación con proveedores' },
  { name: 'supervisor', description: 'Supervisión general con acceso de solo lectura' },
]

const FULL = { canView: true, canCreate: true, canEdit: true, canDelete: true }
const VIEW_ONLY = { canView: true, canCreate: false, canEdit: false, canDelete: false }

const ROLE_PERMISSIONS = {
  admin: MODULES.map((m) => ({ slug: m.slug, ...FULL })),
  almacenista: [
    { slug: 'dashboard', ...VIEW_ONLY },
    { slug: 'insumos', ...FULL },
    { slug: 'almacen', ...FULL },
    { slug: 'proveedores', ...VIEW_ONLY },
    { slug: 'compras', ...VIEW_ONLY },
  ],
  comprador: [
    { slug: 'dashboard', ...VIEW_ONLY },
    { slug: 'proveedores', ...FULL },
    { slug: 'compras', ...FULL },
    { slug: 'insumos', ...VIEW_ONLY },
    { slug: 'reportes', ...VIEW_ONLY },
  ],
  supervisor: MODULES.map((m) => ({ slug: m.slug, ...VIEW_ONLY })),
}

const USERS = [
  { name: 'Admin', lastName: 'Sistema', email: 'admin@sistema.com', password: 'Admin@123', roleName: 'admin' },
  { name: 'Laura', lastName: 'Martínez', email: 'almacen@sistema.com', password: 'Almacen@123', roleName: 'almacenista' },
  { name: 'Carlos', lastName: 'Ramírez', email: 'compras@sistema.com', password: 'Compras@123', roleName: 'comprador' },
  { name: 'Ana', lastName: 'López', email: 'supervisor@sistema.com', password: 'Supervisor@123', roleName: 'supervisor' },
]

const SUPPLIERS = [
  { name: 'Textiles del Norte S.A. de C.V.', rfc: 'TNO850612AB1', phone: '8181234567', email: 'ventas@textilesdelnorte.mx', contactName: 'Jorge Salinas' },
  { name: 'Hilos y Cierres Industriales', rfc: 'HCI900308XY2', phone: '5544567890', email: 'contacto@hilosycierres.mx', contactName: 'Patricia Núñez' },
  { name: 'Botones y Accesorios MX', rfc: 'BAM110925QZ3', phone: '3312349876', email: 'info@botonesmx.com', contactName: 'Roberto Díaz' },
  { name: 'Telas Premium del Bajío', rfc: 'TPB070714LK4', phone: '4621239087', email: 'ventas@telaspremium.mx', contactName: 'Marisol Torres' },
  { name: 'Insumos Textiles Guadalajara', rfc: 'ITG960201MN5', phone: '3336547890', email: 'contacto@itg.mx', contactName: 'Fernando Ibarra' },
]

const SUPPLIES = [
  { code: 'TELA-ALG-001', name: 'Tela de Algodón Peinado', type: 'fabric', unitMeasure: 'meter', minStock: 50, currentStock: 320, durationDays: 90 },
  { code: 'TELA-POL-002', name: 'Tela Poliéster Deportiva', type: 'fabric', unitMeasure: 'meter', minStock: 40, currentStock: 210, durationDays: 60 },
  { code: 'HILO-POL-001', name: 'Hilo de Poliéster 40/2', type: 'thread', unitMeasure: 'cone', minStock: 30, currentStock: 150, durationDays: 120 },
  { code: 'HILO-ALG-002', name: 'Hilo de Algodón Mercerizado', type: 'thread', unitMeasure: 'cone', minStock: 20, currentStock: 90, durationDays: 120 },
  { code: 'CIER-MET-001', name: 'Cierre Metálico #5', type: 'zipper', unitMeasure: 'piece', minStock: 100, currentStock: 500, durationDays: 180 },
  { code: 'CIER-INV-002', name: 'Cierre Invisible #3', type: 'zipper', unitMeasure: 'piece', minStock: 80, currentStock: 260, durationDays: 180 },
  { code: 'BOT-PLA-001', name: 'Botón de Plástico 4 Hoyos', type: 'button', unitMeasure: 'piece', minStock: 200, currentStock: 1200, durationDays: 365 },
  { code: 'BOT-MET-002', name: 'Botón Metálico Tipo Jean', type: 'button', unitMeasure: 'piece', minStock: 150, currentStock: 600, durationDays: 365 },
  { code: 'ENTR-FUS-001', name: 'Entretela Fusionable', type: 'interfacing', unitMeasure: 'meter', minStock: 30, currentStock: 140, durationDays: 90 },
  { code: 'TINT-NEG-001', name: 'Tinta Negra Textil', type: 'ink', unitMeasure: 'kg', minStock: 5, currentStock: 22, durationDays: 365 },
  { code: 'ETIQ-CART-001', name: 'Etiqueta de Cartón', type: 'stationery', unitMeasure: 'piece', minStock: 500, currentStock: 3000, durationDays: 365 },
  { code: 'HEBI-MET-001', name: 'Hebilla Metálica', type: 'accessory', unitMeasure: 'piece', minStock: 100, currentStock: 400, durationDays: 365 },
]

const BATCHES = [
  { batchNumber: 'LOTE-2026-0001', supplyCode: 'TELA-ALG-001', supplierName: 'Textiles del Norte S.A. de C.V.', season: 'Primavera-Verano 2026', color: 'Blanco', initialQuantity: 200, currentQuantity: 180, warehouseLocation: 'A-01-01', entryDate: new Date('2026-01-15') },
  { batchNumber: 'LOTE-2026-0002', supplyCode: 'TELA-POL-002', supplierName: 'Telas Premium del Bajío', season: 'Otoño-Invierno 2026', color: 'Azul Marino', initialQuantity: 150, currentQuantity: 120, warehouseLocation: 'A-01-02', entryDate: new Date('2026-02-10') },
  { batchNumber: 'LOTE-2026-0003', supplyCode: 'HILO-POL-001', supplierName: 'Hilos y Cierres Industriales', color: 'Negro', initialQuantity: 100, currentQuantity: 70, warehouseLocation: 'B-02-01', entryDate: new Date('2026-02-20') },
  { batchNumber: 'LOTE-2026-0004', supplyCode: 'CIER-MET-001', supplierName: 'Hilos y Cierres Industriales', color: 'Dorado', initialQuantity: 300, currentQuantity: 260, warehouseLocation: 'B-03-01', entryDate: new Date('2026-03-05') },
  { batchNumber: 'LOTE-2026-0005', supplyCode: 'BOT-PLA-001', supplierName: 'Botones y Accesorios MX', color: 'Blanco', initialQuantity: 800, currentQuantity: 750, warehouseLocation: 'C-01-01', entryDate: new Date('2026-03-18') },
  { batchNumber: 'LOTE-2026-0006', supplyCode: 'ENTR-FUS-001', supplierName: 'Insumos Textiles Guadalajara', color: 'Blanco', initialQuantity: 100, currentQuantity: 90, warehouseLocation: 'A-02-01', entryDate: new Date('2026-04-01') },
]

const PURCHASE_ORDERS = [
  {
    folio: 'OC-2026-0001',
    supplierName: 'Textiles del Norte S.A. de C.V.',
    status: 'completed',
    issueDate: new Date('2026-01-05'),
    estimatedDate: new Date('2026-01-12'),
    receivedDate: new Date('2026-01-14'),
    total: 17100.0,
    notes: 'Compra de tela para temporada primavera-verano',
    details: [{ supplyCode: 'TELA-ALG-001', requestedQty: 200, receivedQty: 200, unitPrice: 85.5, status: 'completed' }],
  },
  {
    folio: 'OC-2026-0002',
    supplierName: 'Hilos y Cierres Industriales',
    status: 'partial',
    issueDate: new Date('2026-02-15'),
    estimatedDate: new Date('2026-02-22'),
    receivedDate: null,
    total: 6600.0,
    notes: 'Reabastecimiento de hilos y cierres',
    details: [
      { supplyCode: 'HILO-POL-001', requestedQty: 100, receivedQty: 70, unitPrice: 45.0, status: 'partial' },
      { supplyCode: 'CIER-MET-001', requestedQty: 300, receivedQty: 300, unitPrice: 12.0, status: 'completed' },
    ],
  },
  {
    folio: 'OC-2026-0003',
    supplierName: 'Botones y Accesorios MX',
    status: 'sent',
    issueDate: new Date('2026-04-10'),
    estimatedDate: new Date('2026-04-20'),
    receivedDate: null,
    total: 2800.0,
    notes: 'Pedido de botones para nueva colección',
    details: [{ supplyCode: 'BOT-PLA-001', requestedQty: 800, receivedQty: 0, unitPrice: 3.5, status: 'pending' }],
  },
  {
    folio: 'OC-2026-0004',
    supplierName: 'Insumos Textiles Guadalajara',
    status: 'draft',
    issueDate: new Date('2026-07-10'),
    estimatedDate: null,
    receivedDate: null,
    total: null,
    notes: 'Cotización preliminar de entretela',
    details: [{ supplyCode: 'ENTR-FUS-001', requestedQty: 150, receivedQty: 0, unitPrice: null, status: 'pending' }],
  },
]

// ─── Histórico para los KPIs del dashboard ──────────────────────────────────
//
// El gráfico "Insumos Registrados por Mes" agrupa por `Supply.createdAt`. Como
// esa columna es `@default(now())` y el bloque de arriba nunca la fija, todos
// los insumos caían en el mes de la carga y el gráfico mostraba una sola barra.
//
// Este bloque añade insumos y lotes NUEVOS con la fecha de alta escrita a mano
// y repartida en los últimos 6 meses. No modifica ni borra nada de lo anterior:
// los registros que ya existan se respetan tal cual.

/**
 * Unidad de medida que corresponde a cada categoría.
 * Existe para que la semilla no pueda generar combinaciones sin sentido como
 * "Telas medidas en piezas": la unidad se deriva del tipo, no se escribe suelta.
 */
const CATEGORY_UNITS = {
  fabric: 'meter',
  thread: 'cone',
  zipper: 'piece',
  button: 'piece',
  interfacing: 'meter',
  ink: 'kg',
  stationery: 'piece',
  accessory: 'piece',
  other: 'piece',
}

/** Etiqueta en español de la categoría, para el campo `materialType` del lote. */
const CATEGORY_LABELS = {
  fabric: 'Telas',
  thread: 'Hilos',
  zipper: 'Cierres',
  button: 'Botones',
  interfacing: 'Entretela',
  ink: 'Tinta',
  stationery: 'Papelería',
  accessory: 'Accesorios',
}

/**
 * Insumos con su lote, agrupados por antigüedad. `monthsAgo: 0` es el mes en
 * curso. Cada insumo trae exactamente un lote para que el stock del insumo y el
 * saldo del lote puedan cuadrar sin ambigüedad (ver `seedKpiHistory`).
 */
const KPI_DATASET = [
  { monthsAgo: 5, day: 8,  code: 'TELA-MEZ-101', name: 'Tela de Mezclilla 12 Oz',          type: 'fabric',      minStock: 40,  batchNumber: 'LOTE-2026-1101', supplierName: 'Textiles del Norte S.A. de C.V.', color: 'Índigo',       season: 'Otoño-Invierno 2026',  initialQuantity: 300,  consumed: 45,  warehouseLocation: 'A-03-01' },
  { monthsAgo: 5, day: 15, code: 'HILO-NYL-102', name: 'Hilo de Nylon Alta Tenacidad',     type: 'thread',      minStock: 25,  batchNumber: 'LOTE-2026-1102', supplierName: 'Hilos y Cierres Industriales',    color: 'Negro',        season: null,                   initialQuantity: 120,  consumed: 30,  warehouseLocation: 'B-02-02' },
  { monthsAgo: 5, day: 24, code: 'BOT-MAD-103',  name: 'Botón de Madera Natural',          type: 'button',      minStock: 150, batchNumber: 'LOTE-2026-1103', supplierName: 'Botones y Accesorios MX',         color: 'Caoba',        season: null,                   initialQuantity: 900,  consumed: 120, warehouseLocation: 'C-01-02' },

  { monthsAgo: 4, day: 6,  code: 'TELA-LIN-104', name: 'Tela de Lino Europeo',             type: 'fabric',      minStock: 35,  batchNumber: 'LOTE-2026-1104', supplierName: 'Telas Premium del Bajío',         color: 'Beige',        season: 'Primavera-Verano 2026', initialQuantity: 220, consumed: 35,  warehouseLocation: 'A-03-02' },
  { monthsAgo: 4, day: 14, code: 'CIER-PLA-105', name: 'Cierre de Plástico #8',            type: 'zipper',      minStock: 90,  batchNumber: 'LOTE-2026-1105', supplierName: 'Hilos y Cierres Industriales',    color: 'Negro',        season: null,                   initialQuantity: 500,  consumed: 80,  warehouseLocation: 'B-03-02' },
  { monthsAgo: 4, day: 22, code: 'ETIQ-TEX-106', name: 'Etiqueta Textil Tejida',           type: 'stationery',  minStock: 400, batchNumber: 'LOTE-2026-1106', supplierName: 'Insumos Textiles Guadalajara',    color: 'Blanco',       season: null,                   initialQuantity: 2500, consumed: 300, warehouseLocation: 'D-01-01' },

  { monthsAgo: 3, day: 7,  code: 'TELA-GAB-107', name: 'Tela Gabardina Stretch',           type: 'fabric',      minStock: 45,  batchNumber: 'LOTE-2026-1107', supplierName: 'Textiles del Norte S.A. de C.V.', color: 'Caqui',        season: 'Otoño-Invierno 2026',  initialQuantity: 260,  consumed: 50,  warehouseLocation: 'A-03-03' },
  { monthsAgo: 3, day: 16, code: 'HILO-ELA-108', name: 'Hilo Elástico Spandex',            type: 'thread',      minStock: 20,  batchNumber: 'LOTE-2026-1108', supplierName: 'Hilos y Cierres Industriales',    color: 'Transparente', season: null,                   initialQuantity: 95,   consumed: 25,  warehouseLocation: 'B-02-03' },
  { monthsAgo: 3, day: 25, code: 'TINT-AZU-109', name: 'Tinta Azul Reactiva',              type: 'ink',         minStock: 6,   batchNumber: 'LOTE-2026-1109', supplierName: 'Insumos Textiles Guadalajara',    color: 'Azul',         season: null,                   initialQuantity: 30,   consumed: 8,   warehouseLocation: 'E-01-01' },

  { monthsAgo: 2, day: 5,  code: 'TELA-PAN-110', name: 'Tela Pana Acanalada',              type: 'fabric',      minStock: 30,  batchNumber: 'LOTE-2026-1110', supplierName: 'Telas Premium del Bajío',         color: 'Vino',         season: 'Otoño-Invierno 2026',  initialQuantity: 180,  consumed: 30,  warehouseLocation: 'A-04-01' },
  { monthsAgo: 2, day: 13, code: 'HEBI-PLA-111', name: 'Hebilla de Plástico 25 mm',        type: 'accessory',   minStock: 120, batchNumber: 'LOTE-2026-1111', supplierName: 'Botones y Accesorios MX',         color: 'Negro',        season: null,                   initialQuantity: 600,  consumed: 90,  warehouseLocation: 'C-02-01' },
  { monthsAgo: 2, day: 21, code: 'ENTR-NOT-112', name: 'Entretela No Tejida',              type: 'interfacing', minStock: 35,  batchNumber: 'LOTE-2026-1112', supplierName: 'Insumos Textiles Guadalajara',    color: 'Blanco',       season: null,                   initialQuantity: 200,  consumed: 40,  warehouseLocation: 'A-02-02' },

  { monthsAgo: 1, day: 4,  code: 'TELA-POP-113', name: 'Tela Popelina de Algodón',         type: 'fabric',      minStock: 50,  batchNumber: 'LOTE-2026-1113', supplierName: 'Textiles del Norte S.A. de C.V.', color: 'Celeste',      season: 'Primavera-Verano 2026', initialQuantity: 340, consumed: 60,  warehouseLocation: 'A-04-02' },
  { monthsAgo: 1, day: 12, code: 'CIER-MET-114', name: 'Cierre Metálico #3 Bronce',        type: 'zipper',      minStock: 100, batchNumber: 'LOTE-2026-1114', supplierName: 'Hilos y Cierres Industriales',    color: 'Bronce',       season: null,                   initialQuantity: 450,  consumed: 70,  warehouseLocation: 'B-03-03' },
  { monthsAgo: 1, day: 20, code: 'BOT-RES-115',  name: 'Botón de Resina Perlado',          type: 'button',      minStock: 180, batchNumber: 'LOTE-2026-1115', supplierName: 'Botones y Accesorios MX',         color: 'Perla',        season: null,                   initialQuantity: 1100, consumed: 150, warehouseLocation: 'C-01-03' },

  { monthsAgo: 0, day: 5,  code: 'TELA-SAT-116', name: 'Tela Satín Poliéster',             type: 'fabric',      minStock: 40,  batchNumber: 'LOTE-2026-1116', supplierName: 'Telas Premium del Bajío',         color: 'Marfil',       season: 'Primavera-Verano 2026', initialQuantity: 210, consumed: 25,  warehouseLocation: 'A-04-03' },
  { monthsAgo: 0, day: 12, code: 'HILO-BOR-117', name: 'Hilo de Bordado Rayón',            type: 'thread',      minStock: 22,  batchNumber: 'LOTE-2026-1117', supplierName: 'Hilos y Cierres Industriales',    color: 'Multicolor',   season: null,                   initialQuantity: 130,  consumed: 20,  warehouseLocation: 'B-02-04' },
  { monthsAgo: 0, day: 18, code: 'ETIQ-COL-118', name: 'Etiqueta Colgante Kraft',          type: 'stationery',  minStock: 350, batchNumber: 'LOTE-2026-1118', supplierName: 'Insumos Textiles Guadalajara',    color: 'Kraft',        season: null,                   initialQuantity: 2000, consumed: 250, warehouseLocation: 'D-01-02' },
]

/** Momento en que se ejecuta la semilla; ancla de todas las fechas relativas. */
const NOW = new Date()

/**
 * Fecha dentro del mes indicado, a las 10:00.
 *
 * Nunca devuelve una fecha futura: en el mes en curso el día se recorta a hoy,
 * porque un insumo "registrado" la semana que viene rompería los KPIs diarios
 * del dashboard (y no tendría ningún sentido en una bitácora).
 */
const monthDate = (monthsAgo, day, hour = 10) => {
  const target = new Date(NOW.getFullYear(), NOW.getMonth() - monthsAgo, 1, hour, 0, 0, 0)
  // Día 28 como tope: así ningún mes corto desborda al mes siguiente.
  const lastSafeDay = monthsAgo === 0 ? NOW.getDate() : 28
  target.setDate(Math.min(day, lastSafeDay))
  return target > NOW ? NOW : target
}

/**
 * Inserta el histórico de insumos, lotes y movimientos repartido en 6 meses.
 *
 * Congruencia garantizada por construcción:
 *   · la unidad de medida se deriva de la categoría (`CATEGORY_UNITS`);
 *   · `Supply.currentStock` se calcula como la suma del saldo de sus lotes,
 *     nunca se escribe a mano;
 *   · cada lote genera su movimiento de entrada y, si hubo consumo, su salida,
 *     ambos fechados dentro del mismo mes que el lote.
 */
async function seedKpiHistory(suppliers, users) {
  const almacenista = users['almacen@sistema.com']
  let createdSupplies = 0
  let createdBatches = 0

  for (const item of KPI_DATASET) {
    const supplier = suppliers[item.supplierName]
    if (!supplier) continue

    const registeredAt = monthDate(item.monthsAgo, item.day)
    const remaining = item.initialQuantity - item.consumed

    // El insumo se da de alta con la fecha del mes correspondiente. Si ya
    // existe (re-ejecución de la semilla) se respeta tal cual.
    const existingSupply = await prisma.supply.findUnique({ where: { code: item.code } })
    const supply =
      existingSupply ??
      (await prisma.supply.create({
        data: {
          code: item.code,
          name: item.name,
          type: item.type,
          unitMeasure: CATEGORY_UNITS[item.type] ?? 'piece',
          minStock: item.minStock,
          // El stock nace en cero y lo sube el movimiento de entrada del lote,
          // igual que haría la aplicación al registrar mercancía.
          currentStock: 0,
          createdAt: registeredAt,
        },
      }))
    if (!existingSupply) createdSupplies += 1

    const existingBatch = await prisma.batch.findUnique({ where: { batchNumber: item.batchNumber } })
    if (existingBatch) continue

    await prisma.batch.create({
      data: {
        batchNumber: item.batchNumber,
        supplyId: supply.id,
        supplierId: supplier.id,
        season: item.season,
        color: item.color,
        materialType: CATEGORY_LABELS[item.type] ?? null,
        initialQuantity: item.initialQuantity,
        currentQuantity: remaining,
        warehouseLocation: item.warehouseLocation,
        entryDate: registeredAt,
        createdAt: registeredAt,
      },
    })
    createdBatches += 1

    const batch = await prisma.batch.findUnique({ where: { batchNumber: item.batchNumber } })

    if (almacenista) {
      await prisma.inventoryMovement.create({
        data: {
          batchId: batch.id,
          userId: almacenista.id,
          type: 'entry',
          quantity: item.initialQuantity,
          reason: `Entrada del lote ${item.batchNumber}`,
          createdAt: registeredAt,
        },
      })

      if (item.consumed > 0) {
        await prisma.inventoryMovement.create({
          data: {
            batchId: batch.id,
            userId: almacenista.id,
            type: 'exit',
            quantity: item.consumed,
            reason: 'Salida por producción',
            // Unos días después de la entrada, sin salirse del mes ni del presente.
            createdAt: monthDate(item.monthsAgo, item.day + 3, 16),
          },
        })
      }
    }

    // El stock del insumo se ajusta al saldo real del lote recién creado.
    await prisma.supply.update({
      where: { id: supply.id },
      data: { currentStock: { increment: remaining } },
    })
  }

  return { createdSupplies, createdBatches }
}

// ─── Seeders ────────────────────────────────────────────────────────────────

async function seedRoles() {
  const roles = {}
  for (const r of ROLES) {
    roles[r.name] = await prisma.role.upsert({
      where: { name: r.name },
      update: {},
      create: r,
    })
  }
  return roles
}

async function seedModules() {
  const modules = {}
  for (const mod of MODULES) {
    modules[mod.slug] = await prisma.module.upsert({
      where: { slug: mod.slug },
      update: {},
      create: mod,
    })
  }
  return modules
}

async function seedRolePermissions(roles, modules) {
  for (const [roleName, perms] of Object.entries(ROLE_PERMISSIONS)) {
    const role = roles[roleName]
    for (const p of perms) {
      const module = modules[p.slug]
      if (!role || !module) continue

      await prisma.rolePermission.upsert({
        where: { roleId_moduleId: { roleId: role.id, moduleId: module.id } },
        update: {
          canView: p.canView,
          canCreate: p.canCreate,
          canEdit: p.canEdit,
          canDelete: p.canDelete,
        },
        create: {
          roleId: role.id,
          moduleId: module.id,
          canView: p.canView,
          canCreate: p.canCreate,
          canEdit: p.canEdit,
          canDelete: p.canDelete,
        },
      })
    }
  }
}

async function seedUsers(roles) {
  const users = {}
  for (const u of USERS) {
    const passwordHash = await bcrypt.hash(u.password, 10)
    users[u.email] = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        name: u.name,
        lastName: u.lastName,
        email: u.email,
        passwordHash,
        roleId: roles[u.roleName].id,
      },
    })
  }
  return users
}

async function seedSuppliers() {
  const suppliers = {}
  for (const s of SUPPLIERS) {
    let supplier = await prisma.supplier.findFirst({ where: { name: s.name } })
    if (!supplier) {
      supplier = await prisma.supplier.create({ data: s })
    }
    suppliers[s.name] = supplier
  }
  return suppliers
}

async function seedSupplies() {
  const supplies = {}
  for (const s of SUPPLIES) {
    supplies[s.code] = await prisma.supply.upsert({
      where: { code: s.code },
      update: {},
      create: s,
    })
  }
  return supplies
}

async function seedBatches(supplies, suppliers) {
  const batches = {}
  for (const b of BATCHES) {
    batches[b.batchNumber] = await prisma.batch.upsert({
      where: { batchNumber: b.batchNumber },
      update: {},
      create: {
        batchNumber: b.batchNumber,
        supplyId: supplies[b.supplyCode].id,
        supplierId: suppliers[b.supplierName].id,
        season: b.season ?? null,
        color: b.color ?? null,
        initialQuantity: b.initialQuantity,
        currentQuantity: b.currentQuantity,
        warehouseLocation: b.warehouseLocation ?? null,
        entryDate: b.entryDate,
      },
    })
  }
  return batches
}

async function seedInventoryMovements(batches, users) {
  const almacenista = users['almacen@sistema.com']

  for (const b of BATCHES) {
    const batch = batches[b.batchNumber]
    const existing = await prisma.inventoryMovement.findFirst({ where: { batchId: batch.id } })
    if (existing) continue

    await prisma.inventoryMovement.create({
      data: {
        batchId: batch.id,
        userId: almacenista.id,
        type: 'entry',
        quantity: b.initialQuantity,
        reason: 'Entrada inicial de inventario',
      },
    })

    const consumed = b.initialQuantity - b.currentQuantity
    if (consumed > 0) {
      await prisma.inventoryMovement.create({
        data: {
          batchId: batch.id,
          userId: almacenista.id,
          type: 'exit',
          quantity: consumed,
          reason: 'Salida por producción',
        },
      })
    }
  }
}

async function seedPurchaseOrders(supplies, suppliers, users) {
  const createdBy = users['compras@sistema.com']
  const approvedBy = users['admin@sistema.com']

  for (const po of PURCHASE_ORDERS) {
    const existing = await prisma.purchaseOrder.findUnique({ where: { folio: po.folio } })
    if (existing) continue

    const created = await prisma.purchaseOrder.create({
      data: {
        folio: po.folio,
        supplierId: suppliers[po.supplierName].id,
        createdById: createdBy.id,
        approvedById: po.status !== 'draft' ? approvedBy.id : null,
        status: po.status,
        issueDate: po.issueDate,
        estimatedDate: po.estimatedDate,
        receivedDate: po.receivedDate,
        total: po.total,
        notes: po.notes,
      },
    })

    for (const d of po.details) {
      await prisma.purchaseOrderDetail.create({
        data: {
          purchaseOrderId: created.id,
          supplyId: supplies[d.supplyCode].id,
          requestedQty: d.requestedQty,
          receivedQty: d.receivedQty,
          unitPrice: d.unitPrice,
          status: d.status,
        },
      })
    }
  }
}

async function main() {
  const roles = await seedRoles()
  const modules = await seedModules()
  await seedRolePermissions(roles, modules)
  const users = await seedUsers(roles)
  const suppliers = await seedSuppliers()
  const supplies = await seedSupplies()
  const batches = await seedBatches(supplies, suppliers)
  await seedInventoryMovements(batches, users)
  await seedPurchaseOrders(supplies, suppliers, users)
  const kpi = await seedKpiHistory(suppliers, users)

  console.log('✅ Seed completado')
  console.log(`   Roles: ${Object.keys(roles).length}`)
  console.log(`   Módulos: ${Object.keys(modules).length}`)
  console.log(`   Usuarios: ${Object.keys(users).length}`)
  console.log(`   Proveedores: ${Object.keys(suppliers).length}`)
  console.log(`   Insumos (catálogo base): ${Object.keys(supplies).length}`)
  console.log(`   Lotes (catálogo base): ${Object.keys(batches).length}`)
  console.log(`   Órdenes de compra: ${PURCHASE_ORDERS.length}`)
  console.log('')
  console.log('   📊 Histórico para KPIs (últimos 6 meses)')
  console.log(`      Insumos nuevos: ${kpi.createdSupplies}`)
  console.log(`      Lotes nuevos:   ${kpi.createdBatches}`)

  // Comprobación visible de que el gráfico "Insumos Registrados por Mes" ya
  // tiene varias barras y no una sola.
  const perMonth = await prisma.$queryRawUnsafe(
    `SELECT to_char(creado_en, 'YYYY-MM') AS mes, count(*)::int AS total
       FROM insumos GROUP BY 1 ORDER BY 1`
  )
  console.log('')
  console.log('   Insumos por mes de registro:')
  for (const row of perMonth) console.log(`      ${row.mes}  ${'█'.repeat(row.total)} ${row.total}`)
}

main()
  .catch((error) => {
    console.error('❌ Error al correr el seed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
