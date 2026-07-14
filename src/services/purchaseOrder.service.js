import prisma from '../config/prisma.js'
import { generateResponse } from '../utils/handleResponse.js'
import { paginate, paginatedResponse } from '../utils/queryHelpers.js'

const safeOrder = (o) => ({
  id: o.id,
  folio: o.folio,
  supplier: o.supplier?.name,
  status: o.status,
  issueDate: o.issueDate,
  total: o.total,
  createdAt: o.createdAt,
})

export const getAll = async ({ page, limit, search } = {}) => {
  try {
    const where = {
      ...(search && {
        OR: [
          { folio: { contains: search, mode: 'insensitive' } },
        ],
      }),
    }

    const [orders, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        include: {
          supplier: { select: { name: true } },
        },
        ...paginate(page, limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.purchaseOrder.count({ where }),
    ])

    return generateResponse(
      200,
      true,
      'Orders retrieved',
      paginatedResponse(orders.map(safeOrder), total, page, limit)
    )
  } catch (error) {
    return generateResponse(500, false, 'Error retrieving orders', null, error.message)
  }
}

export const getById = async (id) => {
  try {
    const order = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        details: {
          include: { supply: true },
        },
      },
    })

    if (!order) return generateResponse(404, false, 'Order not found')

    return generateResponse(200, true, 'Order retrieved', order)
  } catch (error) {
    return generateResponse(500, false, 'Error retrieving order', null, error.message)
  }
}

export const create = async (data, userId) => {
  try {
    const order = await prisma.purchaseOrder.create({
      data: {
        folio: data.folio,
        supplierId: data.supplierId,
        createdById: userId,
        issueDate: new Date(),
        status: 'draft',
        notes: data.notes,
      },
    })

    return generateResponse(201, true, 'Order created', order)
  } catch (error) {
    return generateResponse(500, false, 'Error creating order', null, error.message)
  }
}

export const update = async (id, data) => {
  try {
    const order = await prisma.purchaseOrder.findUnique({ where: { id } })
    if (!order) return generateResponse(404, false, 'Order not found')

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        ...(data.status && { status: data.status }),
        ...(data.notes && { notes: data.notes }),
      },
    })

    return generateResponse(200, true, 'Order updated', updated)
  } catch (error) {
    return generateResponse(500, false, 'Error updating order', null, error.message)
  }
}

export const receiveOrder = async (orderId) => {
  try {
    const order = await prisma.purchaseOrder.findUnique({
      where: { id: orderId },
      include: {
        details: true,
      },
    })

    // ❌ no existe
    if (!order) {
      return generateResponse(404, false, 'Order not found')
    }

    // ❌ ya completada
    if (order.status === 'completed') {
      return generateResponse(400, false, 'Order already completed')
    }

    // ❌ sin items
    if (!order.details.length) {
      return generateResponse(400, false, 'Order has no items')
    }

    // 🔍 filtrar pendientes
    const pendingItems = order.details.filter(
      d => Number(d.requestedQty) > Number(d.receivedQty)
    )

    // ❌ todo recibido
    if (!pendingItems.length) {
      return generateResponse(400, false, 'All items already received')
    }

    // 🔥 PROCESAMIENTO (PASO 3)
    const processedItems = pendingItems.map(item => {
      const requested = Number(item.requestedQty)
      const received = Number(item.receivedQty)

      const remaining = requested - received

      return {
        detailId: item.id,
        supplyId: item.supplyId,
        requested,
        received,
        remaining,
        toReceive: remaining 
      }
    })

    const item = processedItems[0] 

    
const result = await prisma.$transaction(async (tx) => {

  for (const item of processedItems) {

    // 1. crear lote
    const batch = await tx.batch.create({
      data: {
        supplyId: item.supplyId,
        supplierId: order.supplierId,
        purchaseOrderId: order.id,
        batchNumber: `LOT-${Date.now()}-${Math.floor(Math.random()*1000)}`,
        initialQuantity: item.toReceive,
        currentQuantity: item.toReceive,
        entryDate: new Date(),
      },
    })

    // 2. movimiento
    await tx.inventoryMovement.create({
      data: {
        batchId: batch.id,
        userId: order.createdById,
        referenceId: order.id,
        type: 'entry',
        quantity: item.toReceive,
        reason: 'Purchase Order Reception',
      },
    })

    // 3. stock
    await tx.supply.update({
      where: { id: item.supplyId },
      data: {
        currentStock: {
          increment: item.toReceive,
        },
      },
    })

    // 4. detalle
    await tx.purchaseOrderDetail.update({
      where: { id: item.detailId },
      data: {
        receivedQty: {
          increment: item.toReceive,
        },
        status: 'completed',
      },
    })
  }

  // 🔥 5. actualizar orden
  const updatedDetails = await tx.purchaseOrderDetail.findMany({
    where: { purchaseOrderId: order.id },
  })

  const allCompleted = updatedDetails.every(
    d => Number(d.requestedQty) === Number(d.receivedQty)
  )

  await tx.purchaseOrder.update({
    where: { id: order.id },
    data: {
      status: allCompleted ? 'completed' : 'partial',
      receivedDate: new Date(),
    },
  })

  return true
})

  return generateResponse(200, true, 'Order received successfully')

  } catch (error) {
    return generateResponse(500, false, 'Error receiving order', null, error.message)
  }
}