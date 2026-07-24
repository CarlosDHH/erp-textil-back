import prisma from '../config/prisma.js'
import { generateResponse } from '../utils/handleResponse.js'
import { paginate, paginatedResponse } from '../utils/queryHelpers.js'

const safeMovement = (m) => ({
  id: m.id,
  batchId: m.batchId,
  batchNumber: m.batch?.batchNumber ?? null,
  userId: m.userId,
  supplyId: m.batch?.supply?.id ?? null,
  supplyName: m.batch?.supply?.name ?? null,
  // La unidad de medida viaja junto al movimiento para que el frontend pueda
  // mostrar "12 Metros" en lugar de un número suelto sin contexto.
  unitMeasure: m.batch?.supply?.unitMeasure ?? null,
  type: m.type,
  quantity: Number(m.quantity),
  reason: m.reason,
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

export const getAll = async ({ userId, page = 1, limit = 20 } = {}) => {
  try {
    const where = userId ? { userId } : {}

    const [data, total] = await Promise.all([
      prisma.inventoryMovement.findMany({
        where,
        include: { batch: { include: { supply: true } } },
        orderBy: { createdAt: 'desc' },
        ...paginate(page, limit),
      }),
      prisma.inventoryMovement.count({ where }),
    ])

    return generateResponse(
      200,
      true,
      'Movements retrieved',
      paginatedResponse(data.map(safeMovement), total, page, limit)
    )
  } catch (error) {
    return generateResponse(500, false, 'Error retrieving movements', null, error.message)
  }
}

export const createExit = async (data, userId) => {
  try {
    if (!userId) {
      return generateResponse(401, false, 'User not authenticated')
    }

    const batch = await prisma.batch.findUnique({
      where: { id: data.batchId },
      include: { supply: true },
    })

    if (!batch) {
      return generateResponse(404, false, 'Batch not found')
    }

    const quantity = Number(data.quantity)

    if (quantity > Number(batch.currentQuantity)) {
      return generateResponse(400, false, 'Insufficient stock in batch')
    }

    const result = await prisma.$transaction(async (tx) => {

      // 1. actualizar batch
      await tx.batch.update({
        where: { id: data.batchId },
        data: {
          currentQuantity: {
            decrement: quantity,
          },
        },
      })

      // 2. actualizar supply (stock global)
      await tx.supply.update({
        where: { id: batch.supplyId },
        data: {
          currentStock: {
            decrement: quantity,
          },
        },
      })

      // 3. crear movimiento
      const movement = await tx.inventoryMovement.create({
        data: {
          batchId: data.batchId,
          userId,
          type: 'exit',
          quantity,
          reason: data.reason || 'Stock exit', // puedes cambiarlo
        },
      })

      return movement
    })

    return generateResponse(200, true, 'Stock exit completed', result)

  } catch (error) {
    return generateResponse(500, false, 'Error creating exit movement', null, error.message)
  }
}

export const createExitFIFO = async (data, userId) => {
  try {
    if (!userId) {
      return generateResponse(401, false, 'User not authenticated')
    }

    let remaining = Number(data.quantity)

    // 🔥 obtener lotes ordenados por fecha (FIFO)
    const batches = await prisma.batch.findMany({
      where: {
        supplyId: data.supplyId,
        currentQuantity: { gt: 0 },
      },
      orderBy: {
        entryDate: 'asc',
      },
    })

    if (!batches.length) {
      return generateResponse(400, false, 'No stock available')
    }

    const result = await prisma.$transaction(async (tx) => {

      for (const batch of batches) {
        if (remaining <= 0) break

        const available = Number(batch.currentQuantity)
        const toTake = Math.min(available, remaining)

        // 1. actualizar batch
        await tx.batch.update({
          where: { id: batch.id },
          data: {
            currentQuantity: {
              decrement: toTake,
            },
          },
        })

        // 2. movimiento
        await tx.inventoryMovement.create({
          data: {
            batchId: batch.id,
            userId,
            type: 'exit',
            quantity: toTake,
            reason: data.reason || 'FIFO exit',
          },
        })

        remaining -= toTake
      }

      if (remaining > 0) {
        throw new Error('Insufficient total stock')
      }

      // 3. actualizar supply
      await tx.supply.update({
        where: { id: data.supplyId },
        data: {
          currentStock: {
            decrement: Number(data.quantity),
          },
        },
      })

      return true
    })

    return generateResponse(200, true, 'FIFO exit completed')

  } catch (error) {
    return generateResponse(500, false, 'Error in FIFO exit', null, error.message)
  }
}

export const getKardex = async (supplyId) => {
  try {
    const movements = await prisma.inventoryMovement.findMany({
      where: {
        batch: {
          supplyId: supplyId,
        },
      },
      include: {
        batch: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    if (!movements.length) {
      return generateResponse(404, false, 'No movements found')
    }

    let balance = 0

    const kardex = movements.map(m => {
      const quantity = Number(m.quantity)

      if (m.type === 'entry') balance += quantity
      if (m.type === 'exit' || m.type === 'loss') balance -= quantity

      return {
        date: m.createdAt,
        type: m.type,
        quantity,
        batchId: m.batchId,
        balance,
      }
    })

    return generateResponse(200, true, 'Kardex generated', kardex)

  } catch (error) {
    return generateResponse(500, false, 'Error generating kardex', null, error.message)
  }
}