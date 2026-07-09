import * as detailService from '../services/purchaseOrderDetail.service.js'

export const addItem = async (req, res) => {
  const result = await detailService.addItem(req.body)
  res.status(result.statusCode).json(result)
}