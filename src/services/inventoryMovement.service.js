import prisma from '../config/prisma.js'
import { generateResponse } from '../utils/handleResponse.js'
import { paginate, paginatedResponse } from '../utils/queryHelpers.js'
import { BusinessRuleError, InsufficientStockError, toErrorResponse } from '../utils/errors.js'

/** Tipos de movimiento que descuentan existencias. */
export const EXIT_TYPES = ['exit', 'loss']

const MOVEMENT_TYPES = ['entry', 'exit', 'adjustment', 'loss']

/**
 * Verifica que una salida quepa tanto en el lote como en el stock global del
 * insumo. Se ejecuta **dentro** de la transacción, sobre datos releídos con `tx`,
 * para que dos salidas simultáneas no puedan dejar el inventario en negativo.
 */
const assertEnoughStock = ({ quantity, batch, supply }) => {
  const availableInBatch = Number(batch.currentQuantity)
  if (quantity > availableInBatch) {
    throw new InsufficientStockError(
      `Material insuficiente en el lote ${batch.batchNumber}: se solicitaron ${quantity} y solo hay ${availableInBatch} ${supply.unitMeasure}.`,
      {
        scope: 'batch',
        requested: quantity,
        available: availableInBatch,
        unitMeasure: supply.unitMeasure,
        batchNumber: batch.batchNumber,
        supplyName: supply.name,
      }
    )
  }

  const availableInSupply = Number(supply.currentStock)
  if (quantity > availableInSupply) {
    throw new InsufficientStockError(
      `Material insuficiente: «${supply.name}» tiene ${availableInSupply} ${supply.unitMeasure} y se solicitaron ${quantity}.`,
      {
        scope: 'supply',
        requested: quantity,
        available: availableInSupply,
        unitMeasure: supply.unitMeasure,
        supplyName: supply.name,
      }
    )
  }
}

/** Normaliza y valida la cantidad recibida por la API. */
const parseQuantity = (value) => {
  const quantity = Number(value)
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new BusinessRuleError('La cantidad debe ser un número mayor que cero.')
  }
  return quantity
}

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

/**
 * Registra un movimiento de inventario y ajusta lote e insumo de forma atómica.
 *
 * Antes se leía el stock **fuera** de la transacción y se escribían valores ya
 * calculados: dos peticiones concurrentes podían leer el mismo saldo y dejar el
 * inventario en negativo. Ahora todo (lectura, validación y escritura) ocurre
 * dentro de `$transaction`, y las actualizaciones usan increment/decrement
 * relativos en lugar de valores absolutos.
 */
export const create = async (data, userId) => {
  try {
    if (!MOVEMENT_TYPES.includes(data.type)) {
      throw new BusinessRuleError(
        `Tipo de movimiento inválido. Debe ser uno de: ${MOVEMENT_TYPES.join(', ')}.`
      )
    }

    const quantity = parseQuantity(data.quantity)

    const movement = await prisma.$transaction(async (tx) => {
      const batch = await tx.batch.findUnique({
        where: { id: data.batchId },
        include: { supply: true },
      })

      if (!batch) {
        throw new BusinessRuleError('El lote indicado no existe.')
      }

      let batchDelta = 0
      let supplyDelta = 0

      if (data.type === 'entry') {
        batchDelta = quantity
        supplyDelta = quantity
      }

      if (EXIT_TYPES.includes(data.type)) {
        // Rechaza y revierte si la cantidad supera el lote o el stock del insumo.
        assertEnoughStock({ quantity, batch, supply: batch.supply })
        batchDelta = -quantity
        supplyDelta = -quantity
      }

      if (data.type === 'adjustment') {
        // El ajuste fija el saldo del lote; el insumo se mueve en la misma diferencia.
        batchDelta = quantity - Number(batch.currentQuantity)
        supplyDelta = batchDelta

        const resultingSupplyStock = Number(batch.supply.currentStock) + supplyDelta
        if (resultingSupplyStock < 0) {
          throw new InsufficientStockError(
            `El ajuste dejaría «${batch.supply.name}» en ${resultingSupplyStock} ${batch.supply.unitMeasure}, por debajo de cero.`,
            {
              scope: 'supply',
              requested: Math.abs(supplyDelta),
              available: Number(batch.supply.currentStock),
              unitMeasure: batch.supply.unitMeasure,
              supplyName: batch.supply.name,
            }
          )
        }
      }

      await tx.batch.update({
        where: { id: batch.id },
        data: { currentQuantity: { increment: batchDelta } },
      })

      await tx.supply.update({
        where: { id: batch.supplyId },
        data: { currentStock: { increment: supplyDelta } },
      })

      return tx.inventoryMovement.create({
        data: {
          batchId: batch.id,
          userId,
          referenceId: data.referenceId ?? null,
          type: data.type,
          quantity,
          reason: data.reason ?? null,
        },
        include: { batch: { include: { supply: true } } },
      })
    })

    return generateResponse(201, true, 'Movimiento registrado', safeMovement(movement))
  } catch (error) {
    return toErrorResponse(error, 'Error al registrar el movimiento', generateResponse)
  }
}

/**
 * Listado de movimientos con filtros opcionales.
 *
 * @param {string} [userId]  Movimientos de un usuario (feed de Actividad Reciente).
 * @param {string} [type]    Tipo o tipos separados por coma, ej. 'exit,loss'.
 * @param {string} [from]    Fecha ISO inicial inclusiva (para el resumen del dashboard).
 * @param {string} [to]      Fecha ISO final inclusiva.
 */
export const getAll = async ({ userId, type, from, to, page = 1, limit = 20 } = {}) => {
  try {
    const types = type
      ? String(type)
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : []

    const createdAt = {
      ...(from && { gte: new Date(from) }),
      ...(to && { lte: new Date(to) }),
    }

    const where = {
      ...(userId && { userId }),
      ...(types.length && { type: { in: types } }),
      ...(Object.keys(createdAt).length && { createdAt }),
    }

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

/**
 * Salida (despacho) de un lote concreto.
 * La lectura del saldo se hace con `tx` para que la validación y el descuento
 * sean atómicos: si la cantidad no cabe, la transacción entera se revierte.
 */
export const createExit = async (data, userId) => {
  try {
    if (!userId) {
      return generateResponse(401, false, 'Usuario no autenticado')
    }

    const quantity = parseQuantity(data.quantity)

    const movement = await prisma.$transaction(async (tx) => {
      const batch = await tx.batch.findUnique({
        where: { id: data.batchId },
        include: { supply: true },
      })

      if (!batch) {
        throw new BusinessRuleError('El lote indicado no existe.')
      }

      assertEnoughStock({ quantity, batch, supply: batch.supply })

      await tx.batch.update({
        where: { id: batch.id },
        data: { currentQuantity: { decrement: quantity } },
      })

      await tx.supply.update({
        where: { id: batch.supplyId },
        data: { currentStock: { decrement: quantity } },
      })

      return tx.inventoryMovement.create({
        data: {
          batchId: batch.id,
          userId,
          type: 'exit',
          quantity,
          reason: data.reason || 'Salida de almacén',
        },
        include: { batch: { include: { supply: true } } },
      })
    })

    return generateResponse(200, true, 'Salida registrada', safeMovement(movement))
  } catch (error) {
    return toErrorResponse(error, 'Error al registrar la salida', generateResponse)
  }
}

/**
 * Salida por PEPS (primeras entradas, primeras salidas): consume los lotes más
 * antiguos hasta cubrir la cantidad pedida.
 *
 * Los lotes se leen dentro de la transacción (antes se leían fuera, así que una
 * salida concurrente podía dejar saldos negativos) y si el total disponible no
 * alcanza se lanza InsufficientStockError, que revierte todos los descuentos ya
 * aplicados en el bucle.
 */
export const createExitFIFO = async (data, userId) => {
  try {
    if (!userId) {
      return generateResponse(401, false, 'Usuario no autenticado')
    }

    const requested = parseQuantity(data.quantity)

    const consumed = await prisma.$transaction(async (tx) => {
      const supply = await tx.supply.findUnique({ where: { id: data.supplyId } })
      if (!supply) {
        throw new BusinessRuleError('El insumo indicado no existe.')
      }

      const batches = await tx.batch.findMany({
        where: { supplyId: data.supplyId, currentQuantity: { gt: 0 } },
        orderBy: { entryDate: 'asc' },
      })

      const available = batches.reduce((sum, b) => sum + Number(b.currentQuantity), 0)
      if (requested > available) {
        throw new InsufficientStockError(
          `Material insuficiente: «${supply.name}» tiene ${available} ${supply.unitMeasure} repartidos en ${batches.length} lote(s) y se solicitaron ${requested}.`,
          {
            scope: 'supply',
            requested,
            available,
            unitMeasure: supply.unitMeasure,
            supplyName: supply.name,
          }
        )
      }

      let remaining = requested
      const detail = []

      for (const batch of batches) {
        if (remaining <= 0) break

        const toTake = Math.min(Number(batch.currentQuantity), remaining)

        await tx.batch.update({
          where: { id: batch.id },
          data: { currentQuantity: { decrement: toTake } },
        })

        await tx.inventoryMovement.create({
          data: {
            batchId: batch.id,
            userId,
            type: 'exit',
            quantity: toTake,
            reason: data.reason || 'Salida PEPS',
          },
        })

        detail.push({ batchId: batch.id, batchNumber: batch.batchNumber, quantity: toTake })
        remaining -= toTake
      }

      await tx.supply.update({
        where: { id: data.supplyId },
        data: { currentStock: { decrement: requested } },
      })

      return detail
    })

    return generateResponse(200, true, 'Salida PEPS completada', {
      supplyId: data.supplyId,
      quantity: requested,
      batches: consumed,
    })
  } catch (error) {
    return toErrorResponse(error, 'Error en la salida PEPS', generateResponse)
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