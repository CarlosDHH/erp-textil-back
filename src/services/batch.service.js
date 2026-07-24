import prisma from '../config/prisma.js'
import { generateResponse } from '../utils/handleResponse.js'
import { paginate, paginatedResponse } from '../utils/queryHelpers.js'
import { BusinessRuleError, InsufficientStockError, toErrorResponse } from '../utils/errors.js'
import { ENTITY, diffFields, logUpdate } from './activityLog.service.js'

/** Campos auditables del lote y su etiqueta en la bitácora. */
const BATCH_AUDIT_FIELDS = {
  batchNumber: 'número de lote',
  supplyId: 'insumo',
  supplierId: 'proveedor',
  initialQuantity: 'cantidad inicial',
  color: 'color',
  materialType: 'tipo de material',
  season: 'temporada',
  toneRange: 'rango de tono',
  warehouseLocation: 'ubicación',
  entryDate: 'fecha de entrada',
  notes: 'notas',
}

const safeBatch = (b) => ({
  id: b.id,
  batchNumber: b.batchNumber,
  supplyId: b.supplyId,
  supplierId: b.supplierId,
  supplyName: b.supply?.name ?? null,
  supplierName: b.supplier?.name ?? null,
  initialQuantity: b.initialQuantity,
  currentQuantity: b.currentQuantity,
  color: b.color,
  materialType: b.materialType ?? null,
  season: b.season ?? null,
  toneRange: b.toneRange ?? null,
  warehouseLocation: b.warehouseLocation,
  entryDate: b.entryDate,
  notes: b.notes ?? null,
  createdAt: b.createdAt,
})

// Relaciones que se resuelven para mostrar nombres legibles (proveedor / insumo).
const batchRelations = {
  supplier: { select: { name: true } },
  supply: { select: { name: true } },
}

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
        include: batchRelations,
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
    const batch = await prisma.batch.findUnique({
      where: { id },
      include: batchRelations,
    })
    if (!batch) return generateResponse(404, false, 'Batch not found')

    return generateResponse(200, true, 'Batch retrieved', safeBatch(batch))
  } catch (error) {
    return generateResponse(500, false, 'Error retrieving batch', null, error.message)
  }
}

/**
 * Alta de lote. Un lote es mercancía que entra al almacén, así que la operación
 * es transaccional y tiene tres efectos inseparables: crear el lote, sumar la
 * cantidad al stock del insumo y dejar registrado el movimiento de entrada.
 *
 * Antes solo se creaba la fila del lote: el `stock_actual` del insumo nunca
 * subía, por lo que ninguna salida podía autorizarse y el historial de
 * movimientos quedaba siempre vacío.
 */
export const create = async (data, userId) => {
  try {
    const quantity = Number(data.initialQuantity)
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new BusinessRuleError('La cantidad inicial debe ser un número mayor que cero.')
    }

    const batch = await prisma.$transaction(async (tx) => {
      const exists = await tx.batch.findUnique({ where: { batchNumber: data.batchNumber } })
      if (exists) {
        throw new BusinessRuleError(`El número de lote ${data.batchNumber} ya está registrado.`)
      }

      const supply = await tx.supply.findUnique({ where: { id: data.supplyId } })
      if (!supply) {
        throw new BusinessRuleError('El insumo indicado no existe.')
      }

      const created = await tx.batch.create({
        data: {
          supplyId: data.supplyId,
          supplierId: data.supplierId,
          purchaseOrderId: data.purchaseOrderId ?? null,
          batchNumber: data.batchNumber,
          season: data.season ?? null,
          toneRange: data.toneRange ?? null,
          materialType: data.materialType ?? null,
          color: data.color,
          initialQuantity: quantity,
          currentQuantity: quantity,
          warehouseLocation: data.warehouseLocation,
          entryDate: new Date(data.entryDate),
          notes: data.notes ?? null,
        },
        include: batchRelations,
      })

      await tx.supply.update({
        where: { id: data.supplyId },
        data: { currentStock: { increment: quantity } },
      })

      // El movimiento solo se registra si se conoce al responsable; sin usuario
      // autenticado el lote se crea igual, pero sin trazabilidad.
      if (userId) {
        await tx.inventoryMovement.create({
          data: {
            batchId: created.id,
            userId,
            type: 'entry',
            quantity,
            reason: `Alta del lote ${created.batchNumber}`,
          },
        })
      }

      return created
    })

    return generateResponse(201, true, 'Lote registrado', safeBatch(batch))
  } catch (error) {
    return toErrorResponse(error, 'Error al registrar el lote', generateResponse)
  }
}

/**
 * Edición de lote. Si cambia la cantidad inicial, la diferencia se propaga al
 * saldo del lote y al stock del insumo dentro de la misma transacción y se deja
 * un movimiento de ajuste; antes solo se reescribía `initialQuantity` y el
 * inventario quedaba descuadrado.
 */
export const update = async (id, data, userId) => {
  try {
    const updated = await prisma.$transaction(async (tx) => {
      const batch = await tx.batch.findUnique({ where: { id }, include: { supply: true } })
      if (!batch) {
        throw new BusinessRuleError('El lote indicado no existe.')
      }

      let delta = 0
      if (data.initialQuantity != null) {
        const nextInitial = Number(data.initialQuantity)
        if (!Number.isFinite(nextInitial) || nextInitial <= 0) {
          throw new BusinessRuleError('La cantidad inicial debe ser un número mayor que cero.')
        }
        delta = nextInitial - Number(batch.initialQuantity)
      }

      if (delta !== 0) {
        const nextBatchQty = Number(batch.currentQuantity) + delta
        if (nextBatchQty < 0) {
          throw new InsufficientStockError(
            `No se puede reducir el lote a esa cantidad: ya se consumieron ${Number(batch.initialQuantity) - Number(batch.currentQuantity)} ${batch.supply.unitMeasure}.`,
            {
              scope: 'batch',
              requested: Math.abs(delta),
              available: Number(batch.currentQuantity),
              unitMeasure: batch.supply.unitMeasure,
              batchNumber: batch.batchNumber,
            }
          )
        }

        const nextSupplyStock = Number(batch.supply.currentStock) + delta
        if (nextSupplyStock < 0) {
          throw new InsufficientStockError(
            `El cambio dejaría «${batch.supply.name}» por debajo de cero (${nextSupplyStock} ${batch.supply.unitMeasure}).`,
            {
              scope: 'supply',
              requested: Math.abs(delta),
              available: Number(batch.supply.currentStock),
              unitMeasure: batch.supply.unitMeasure,
              supplyName: batch.supply.name,
            }
          )
        }

        await tx.supply.update({
          where: { id: batch.supplyId },
          data: { currentStock: { increment: delta } },
        })

        if (userId) {
          await tx.inventoryMovement.create({
            data: {
              batchId: batch.id,
              userId,
              type: 'adjustment',
              quantity: Math.abs(delta),
              reason: `Ajuste de cantidad del lote ${batch.batchNumber}`,
            },
          })
        }
      }

      const result = await tx.batch.update({
        where: { id },
        data: {
          ...(data.batchNumber && { batchNumber: data.batchNumber }),
          ...(data.supplyId && { supplyId: data.supplyId }),
          ...(data.supplierId && { supplierId: data.supplierId }),
          ...(data.initialQuantity != null && {
            initialQuantity: Number(data.initialQuantity),
            currentQuantity: { increment: delta },
          }),
          ...(data.color !== undefined && { color: data.color }),
          ...(data.materialType !== undefined && { materialType: data.materialType }),
          ...(data.season !== undefined && { season: data.season }),
          ...(data.toneRange !== undefined && { toneRange: data.toneRange }),
          ...(data.warehouseLocation !== undefined && { warehouseLocation: data.warehouseLocation }),
          ...(data.entryDate && { entryDate: new Date(data.entryDate) }),
          ...(data.notes !== undefined && { notes: data.notes }),
        },
        include: batchRelations,
      })

      // Va dentro de la transacción, junto al movimiento de ajuste que ya se
      // registraba aquí: si la edición se revierte, su rastro también.
      await logUpdate({
        client: tx,
        userId,
        entity: ENTITY.BATCH,
        entityId: result.id,
        entityName: result.batchNumber,
        batchId: result.id,
        changedFields: diffFields(batch, result, BATCH_AUDIT_FIELDS),
      })

      return result
    })

    return generateResponse(200, true, 'Lote actualizado', safeBatch(updated))
  } catch (error) {
    return toErrorResponse(error, 'Error al actualizar el lote', generateResponse)
  }
}

/**
 * Baja de lote.
 *
 * El borrado fallaba con un error de clave foránea en cuanto el lote tenía
 * movimientos asociados (el botón «Eliminar» devolvía 500 sin explicación).
 * Ahora se eliminan primero los movimientos y se devuelve al insumo el saldo
 * que el lote todavía tenía, todo en una sola transacción.
 */
export const remove = async (id) => {
  try {
    await prisma.$transaction(async (tx) => {
      const batch = await tx.batch.findUnique({ where: { id }, include: { supply: true } })
      if (!batch) {
        throw new BusinessRuleError('El lote indicado no existe.')
      }

      const remaining = Number(batch.currentQuantity)
      if (remaining > 0) {
        // El stock del insumo incluye lo que queda en este lote: al desaparecer
        // el lote, esa cantidad deja de existir en el almacén.
        const nextStock = Number(batch.supply.currentStock) - remaining
        await tx.supply.update({
          where: { id: batch.supplyId },
          // Nunca por debajo de cero, aunque los datos vinieran descuadrados.
          data: { currentStock: nextStock < 0 ? 0 : nextStock },
        })
      }

      await tx.inventoryMovement.deleteMany({ where: { batchId: id } })
      await tx.batch.delete({ where: { id } })
    })

    return generateResponse(200, true, 'Lote eliminado')
  } catch (error) {
    return toErrorResponse(error, 'Error al eliminar el lote', generateResponse)
  }
}
