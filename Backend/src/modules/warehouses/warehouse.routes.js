const express = require("express");
const {
  listWarehouses,
  getWarehouseById,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
  getWarehouseInventorySummary,
  getWarehouseTransactions
} = require("./warehouse.controller");

const warehouseRouter = express.Router();

warehouseRouter.get("/", listWarehouses);
warehouseRouter.get("/:id/inventory", getWarehouseInventorySummary);
warehouseRouter.get("/:id/transactions", getWarehouseTransactions);
warehouseRouter.get("/:id", getWarehouseById);
warehouseRouter.post("/", createWarehouse);
warehouseRouter.put("/:id", updateWarehouse);
warehouseRouter.delete("/:id", deleteWarehouse);

module.exports = warehouseRouter;
