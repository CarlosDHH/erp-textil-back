import prisma from '../config/prisma.js'
import { generateResponse } from '../utils/handleResponse.js'

const safeDetail = (d) => ({
  id: d.id,
  supplyId: d.supplyId,
  supply: d.supply?.name,
  requestedQty: d.requestedQty,
  receivedQty: d.receivedQty,
  unitPrice: d.unitPrice,
  status: d.status,
})

export const addItem = async (data) => {
  try {
    const order = await prisma.purchaseOrder.findUnique({
      where: { id: data.purchaseOrderId },
    })

    if (!order) {
      return generateResponse(404, false, 'Order not found')
    }

    const supply = await prisma.supply.findUnique({
      where: { id: data.supplyId },
    })

    if (!supply) {
      return generateResponse(404, false, 'Supply not found')
    }

    const detail = await prisma.purchaseOrderDetail.create({
      data: {
        purchaseOrderId: data.purchaseOrderId,
        supplyId: data.supplyId,
        requestedQty: data.requestedQty,
        unitPrice: data.unitPrice,
      },
      include: {
        supply: { select: { name: true } },
      },
    })

    return generateResponse(201, true, 'Item added', safeDetail(detail))
  } catch (error) {
    return generateResponse(500, false, 'Error adding item', null, error.message)
  }
}