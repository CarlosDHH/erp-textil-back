import prisma from '../config/prisma.js'
import { generateResponse } from '../utils/handleResponse.js'
import { paginate, paginatedResponse } from '../utils/queryHelpers.js'

const safeBatch = (b) => ({
  id: b.id,
  batchNumber: b.batchNumber,
  supplyId: b.supplyId,
  supplierId: b.supplierId,
  initialQuantity: b.initialQuantity,
  currentQuantity: b.currentQuantity,
  color: b.color,
  warehouseLocation: b.warehouseLocation,
  entryDate: b.entryDate,
  createdAt: b.createdAt,
})

export const getAll = async ({ page, limit, search } = {}) => {
  try {
    const where = {
      ...(search && {
        batchNumber: { contains: search, mode: 'insensitive' },
      }),
    }

    const [batches, total] = await Promise.all([
      prisma.batch.findMany({
        where,
        ...paginate(page, limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.batch.count({ where }),
    ])

    return generateResponse(
      200,
      true,
      'Batches retrieved',
      paginatedResponse(batches.map(safeBatch), total, page, limit)
    )
  } catch (error) {
    return generateResponse(500, false, 'Error retrieving batches', null, error.message)
  }
}

export const getById = async (id) => {
  try {
    const batch = await prisma.batch.findUnique({ where: { id } })
    if (!batch) return generateResponse(404, false, 'Batch not found')

    return generateResponse(200, true, 'Batch retrieved', safeBatch(batch))
  } catch (error) {
    return generateResponse(500, false, 'Error retrieving batch', null, error.message)
  }
}

export const create = async (data) => {
  try {
    const exists = await prisma.batch.findUnique({
      where: { batchNumber: data.batchNumber },
    })

    if (exists) {
      return generateResponse(409, false, 'Batch number already exists')
    }

    const batch = await prisma.batch.create({
      data: {
        supplyId: data.supplyId,
        supplierId: data.supplierId,
        purchaseOrderId: data.purchaseOrderId ?? null,
        batchNumber: data.batchNumber,
        season: data.season,
        toneRange: data.toneRange,
        color: data.color,
        initialQuantity: data.initialQuantity,
        currentQuantity: data.initialQuantity, // 🔥 clave
        warehouseLocation: data.warehouseLocation,
        entryDate: data.entryDate,
        notes: data.notes,
      },
    })

    return generateResponse(201, true, 'Batch created', safeBatch(batch))
  } catch (error) {
    return generateResponse(500, false, 'Error creating batch', null, error.message)
  }
}

export const update = async (id, data) => {
  try {
    const batch = await prisma.batch.findUnique({ where: { id } })
    if (!batch) return generateResponse(404, false, 'Batch not found')

    const updated = await prisma.batch.update({
      where: { id },
      data: {
        ...(data.color && { color: data.color }),
        ...(data.warehouseLocation && { warehouseLocation: data.warehouseLocation }),
        ...(data.notes && { notes: data.notes }),
      },
    })

    return generateResponse(200, true, 'Batch updated', safeBatch(updated))
  } catch (error) {
    return generateResponse(500, false, 'Error updating batch', null, error.message)
  }
}

export const remove = async (id) => {
  try {
    const batch = await prisma.batch.findUnique({ where: { id } })
    if (!batch) return generateResponse(404, false, 'Batch not found')

    await prisma.batch.delete({ where: { id } })

    return generateResponse(200, true, 'Batch deleted')
  } catch (error) {
    return generateResponse(500, false, 'Error deleting batch', null, error.message)
  }
}