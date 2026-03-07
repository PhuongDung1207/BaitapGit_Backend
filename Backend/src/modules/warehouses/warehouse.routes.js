const express = require("express");
const {
  listWarehouses,
  getWarehouseById,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse
} = require("./warehouse.controller");

const warehouseRouter = express.Router();

warehouseRouter.get("/", listWarehouses);
warehouseRouter.get("/:id", getWarehouseById);
warehouseRouter.post("/", createWarehouse);
warehouseRouter.put("/:id", updateWarehouse);
warehouseRouter.delete("/:id", deleteWarehouse);

module.exports = warehouseRouter;
