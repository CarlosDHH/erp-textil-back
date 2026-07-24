import prisma from '../config/prisma.js'

/**
 * Bitácora de modificaciones.
 *
 * Los eventos se guardan en `movimientos_inventario` (el mismo origen que ya
 * alimenta la pestaña "Actividad Reciente" del perfil) con `type = 'update'`.
 * A diferencia de un movimiento de stock, estos eventos no llevan lote ni
 * cantidad: identifican el registro editado con las columnas `entidad`,
 * `entidad_id` y `entidad_nombre`.
 */

/** Valor de `type` que distingue una edición de un movimiento de stock. */
export const UPDATE_TYPE = 'update'

/** Valores admitidos en la columna `entidad`. */
export const ENTITY = {
  SUPPLY: 'supply',
  BATCH: 'batch',
  USER: 'user',
}

const ENTITY_LABELS = {
  [ENTITY.SUPPLY]: 'Insumo',
  [ENTITY.BATCH]: 'Lote',
  [ENTITY.USER]: 'Usuario',
}

/**
 * Deja los valores en una forma comparable con `!==`.
 *
 * Hace falta porque Prisma no devuelve primitivas en dos casos: las columnas
 * `Decimal` llegan como objeto (dos importes iguales serían objetos distintos)
 * y las fechas como `Date` (misma fecha, referencia distinta). Sin normalizar,
 * el diff marcaría como modificado cualquier campo numérico o de fecha aunque
 * no hubiera cambiado.
 */
const normalize = (value) => {
  if (value === null || value === undefined) return null
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'object') return value.toString()
  return value
}

/**
 * Devuelve las etiquetas legibles de los campos que realmente cambiaron.
 *
 * @param {object} before Registro tal como estaba antes de la edición.
 * @param {object} after  Registro ya actualizado.
 * @param {Record<string, string>} labels Mapa `campo -> etiqueta en español`.
 * @returns {string[]} Etiquetas de los campos modificados.
 */
export const diffFields = (before, after, labels) =>
  Object.entries(labels)
    .filter(([field]) => normalize(before?.[field]) !== normalize(after?.[field]))
    .map(([, label]) => label)

/**
 * Registra una modificación en la bitácora.
 *
 * Manejo de errores (deliberado): si se recibe `client` —es decir, la llamada
 * ocurre dentro de un `$transaction`— el error se propaga, porque en PostgreSQL
 * una sentencia fallida ya invalidó la transacción y fingir que no pasó nada
 * dejaría al llamador operando sobre una transacción muerta. Fuera de una
 * transacción el fallo solo se registra en consola: una bitácora rota no debe
 * tumbar la edición que la originó.
 *
 * @param {object}  params
 * @param {object}  [params.client]  Cliente transaccional (`tx`). Por defecto, el global.
 * @param {string}  params.userId    Autor del cambio. Sin él no se registra nada.
 * @param {string}  params.entity    Una de las claves de `ENTITY`.
 * @param {string}  params.entityId  Id del registro editado.
 * @param {string}  params.entityName Nombre legible del registro.
 * @param {string[]} [params.changedFields] Etiquetas de los campos modificados.
 * @param {string}  [params.batchId] Lote asociado, cuando la entidad es un lote.
 * @returns {Promise<object|null>} El evento creado, o `null` si no se registró.
 */
export const logUpdate = async ({
  client,
  userId,
  entity,
  entityId,
  entityName,
  changedFields = [],
  batchId = null,
}) => {
  // Sin usuario autenticado no hay a quién atribuir el cambio: se omite el
  // evento en lugar de guardar una fila huérfana (además `usuario_id` es NOT NULL).
  if (!userId) return null

  // Una edición que no cambió ningún campo no merece una entrada en el feed.
  if (!changedFields.length) return null

  const label = ENTITY_LABELS[entity] ?? entity
  const data = {
    batchId,
    userId,
    type: UPDATE_TYPE,
    quantity: null,
    entity,
    entityId,
    entityName,
    // El nombre del registro no se repite aquí: el feed ya lo muestra como
    // título y la etiqueta del evento ya dice "Modificación". Este texto solo
    // aporta lo que falta: qué tipo de registro fue y qué campos cambiaron.
    reason: `${label} · ${changedFields.join(', ')}`,
  }

  if (client) {
    // Dentro de una transacción: que el error suba y provoque el rollback.
    return client.inventoryMovement.create({ data })
  }

  try {
    return await prisma.inventoryMovement.create({ data })
  } catch (error) {
    console.error('[activityLog] No se pudo registrar la modificación:', error)
    return null
  }
}
