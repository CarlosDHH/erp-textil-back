/**
 * Error de negocio: la cantidad solicitada supera las existencias.
 *
 * Se lanza *dentro* de la transacción de Prisma para que ésta haga rollback
 * automático; el servicio lo captura y lo traduce a un HTTP 400 con el detalle
 * de lo solicitado vs. lo disponible, que el frontend muestra en la alerta
 * «Material insuficiente».
 */
export class InsufficientStockError extends Error {
  /**
   * @param {string} message  Mensaje legible para el usuario final.
   * @param {object} [details] { requested, available, scope, supplyName, batchNumber }
   */
  constructor(message, details = {}) {
    super(message)
    this.name = 'InsufficientStockError'
    this.details = details
  }
}

/** Error de negocio genérico que debe responderse como 400 y no como 500. */
export class BusinessRuleError extends Error {
  constructor(message, details = {}) {
    super(message)
    this.name = 'BusinessRuleError'
    this.details = details
  }
}

/**
 * Convierte los errores de negocio en la respuesta HTTP correspondiente.
 * Cualquier otro error se considera un fallo real del servidor (500).
 *
 * @param {Error} error
 * @param {string} fallbackMessage Mensaje para el caso 500.
 * @param {(status:number, ok:boolean, msg:string, data?:any, err?:any)=>any} respond
 */
export const toErrorResponse = (error, fallbackMessage, respond) => {
  if (error instanceof InsufficientStockError || error instanceof BusinessRuleError) {
    return respond(400, false, error.message, error.details)
  }
  return respond(500, false, fallbackMessage, null, error.message)
}
