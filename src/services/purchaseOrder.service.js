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
    const order = await prisma.PurchaseOrder.create({
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