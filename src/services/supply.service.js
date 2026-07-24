import prisma from '../config/prisma.js'
import { generateResponse } from '../utils/handleResponse.js'
import { paginate, paginatedResponse } from '../utils/queryHelpers.js'
import { ENTITY, diffFields, logUpdate } from './activityLog.service.js'

const baseWhere = { isActive: true }

/** Campos auditables del insumo y su etiqueta en la bitácora. */
const SUPPLY_AUDIT_FIELDS = {
  code: 'código',
  name: 'nombre',
  type: 'categoría',
  unitMeasure: 'unidad de medida',
  minStock: 'stock mínimo',
  currentStock: 'stock actual',
  durationDays: 'días de duración',
  isActive: 'estado',
}

const safeSupply = (supply) => ({
  id: supply.id,
  code: supply.code,
  name: supply.name,
  type: supply.type,
  unitMeasure: supply.unitMeasure,
  minStock: supply.minStock,
  currentStock: supply.currentStock,
  durationDays: supply.durationDays,
  isActive: supply.isActive,
  createdAt: supply.createdAt,
})

export const getAll = async ({ page, limit, search } = {}) => {
  try {
    const where = {
      ...baseWhere,
      ...(search && {
        OR: [
          { code: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
          { type: { contains: search, mode: 'insensitive' } },
        ],
      }),
    }

    const [supplies, total] = await Promise.all([
      prisma.supply.findMany({
        where,
        ...paginate(page, limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.supply.count({ where }),
    ])

    return generateResponse(
      200,
      true,
      'Supplies retrieved',
      paginatedResponse(supplies.map(safeSupply), total, page, limit)
    )
  } catch (error) {
    return generateResponse(500, false, 'Error retrieving supplies', null, error.message)
  }
}

export const getById = async (id) => {
  try {
    const supply = await prisma.supply.findFirst({
      where: { id, ...baseWhere },
    })

    if (!supply) return generateResponse(404, false, 'Supply not found')

    return generateResponse(200, true, 'Supply retrieved', safeSupply(supply))
  } catch (error) {
    return generateResponse(500, false, 'Error retrieving supply', null, error.message)
  }
}

export const create = async (data) => {
  try {
    const exists = await prisma.supply.findUnique({
      where: { code: data.code },
    })

    if (exists) {
      return generateResponse(409, false, 'A supply with this code already exists')
    }

    const supply = await prisma.supply.create({
      data: {
        code: data.code,
        name: data.name,
        type: data.type,
        unitMeasure: data.unitMeasure,
        minStock: data.minStock ?? 0,
        currentStock: data.currentStock ?? 0,
        durationDays: data.durationDays ?? null,
      },
    })

    return generateResponse(201, true, 'Supply created', safeSupply(supply))
  } catch (error) {
    return generateResponse(500, false, 'Error creating supply', null, error.message)
  }
}

/**
 * Edición de insumo. Además de aplicar los cambios deja constancia en la
 * bitácora de actividad con los campos que realmente se modificaron.
 *
 * @param {string} id
 * @param {object} data
 * @param {string} [userId] Autor del cambio; sin él la edición se aplica igual,
 *                          pero sin trazabilidad (mismo criterio que en lotes).
 */
export const update = async (id, data, userId) => {
  try {
    const supply = await prisma.supply.findFirst({
      where: { id, ...baseWhere },
    })

    if (!supply) return generateResponse(404, false, 'Supply not found')

    const updated = await prisma.supply.update({
      where: { id },
      data: {
        ...(data.code && { code: data.code }),
        ...(data.name && { name: data.name }),
        ...(data.type && { type: data.type }),
        ...(data.unitMeasure && { unitMeasure: data.unitMeasure }),
        ...(data.minStock !== undefined && { minStock: data.minStock }),
        ...(data.currentStock !== undefined && { currentStock: data.currentStock }),
        ...(data.durationDays !== undefined && { durationDays: data.durationDays }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    })

    // Fuera de transacción a propósito: el insumo ya quedó guardado y un fallo
    // al escribir la bitácora no debe revertir ni fallar la edición.
    await logUpdate({
      userId,
      entity: ENTITY.SUPPLY,
      entityId: updated.id,
      entityName: updated.name,
      changedFields: diffFields(supply, updated, SUPPLY_AUDIT_FIELDS),
    })

    return generateResponse(200, true, 'Supply updated', safeSupply(updated))
  } catch (error) {
    return generateResponse(500, false, 'Error updating supply', null, error.message)
  }
}

export const remove = async (id) => {
  try {
    const supply = await prisma.supply.findFirst({
      where: { id, ...baseWhere },
    })

    if (!supply) return generateResponse(404, false, 'Supply not found')

    await prisma.supply.update({
      where: { id },
      data: { isActive: false },
    })

    return generateResponse(200, true, 'Supply deactivated')
  } catch (error) {
    return generateResponse(500, false, 'Error deleting supply', null, error.message)
  }
}