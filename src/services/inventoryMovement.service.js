import prisma from '../config/prisma.js'
import { generateResponse } from '../utils/handleResponse.js'

const safeMovement = (m) => ({
  id: m.id,
  batchId: m.batchId,
  type: m.type,
  quantity: m.quantity,
  createdAt: m.createdAt,
})

export const create = async (data, userId) => {
  try {
    const batch = await prisma.batch.findUnique({
      where: { id: data.batchId },
      include: { supply: true },
    })

    if (!batch) {
      return generateResponse(404, false, 'Batch not found')
    }

    const quantity = Number(data.quantity)
    let newBatchQty = Number(batch.currentQuantity)
    let newSupplyQty = Number(batch.supply.currentStock)

    // 🔥 lógica clave
    if (data.type === 'entry') {
      newBatchQty += quantity
      newSupplyQty += quantity
    }

    if (data.type === 'exit' || data.type === 'loss') {
      if (quantity > newBatchQty) {
        return generateResponse(400, false, 'Insufficient stock in batch')
      }
      newBatchQty -= quantity
      newSupplyQty -= quantity
    }

    if (data.type === 'adjustment') {
      newSupplyQty = newSupplyQty - newBatchQty + quantity
      newBatchQty = quantity
    }

    // 🔥 transacción (MUY IMPORTANTE)
    const result = await prisma.$transaction([
      prisma.inventoryMovement.create({
        data: {
          batchId: data.batchId,
          userId,
          referenceId: data.referenceId ?? null,
          type: data.type,
          quantity,
          reason: data.reason,
        },
      }),

      prisma.batch.update({
        where: { id: data.batchId },
        data: { currentQuantity: newBatchQty },
      }),

      prisma.supply.update({
        where: { id: batch.supplyId },
        data: { currentStock: newSupplyQty },
      }),
    ])

    return generateResponse(201, true, 'Movement created', safeMovement(result[0]))
  } catch (error) {
    return generateResponse(500, false, 'Error creating movement', null, error.message)
  }
}

export const getAll = async () => {
  try {
    const data = await prisma.inventoryMovement.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return generateResponse(200, true, 'Movements retrieved', data.map(safeMovement))
  } catch (error) {
    return generateResponse(500, false, 'Error retrieving movements', null, error.message)
  }
}