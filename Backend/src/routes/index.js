const express = require("express");
const warehouseRouter = require("../modules/warehouses/warehouse.routes");
const productRouter = require("../modules/products/product.routes");
const inventoryRouter = require("../modules/inventory/inventory.routes");

const apiRouter = express.Router();

apiRouter.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString()
  });
});

apiRouter.use("/warehouses", warehouseRouter);
apiRouter.use("/products", productRouter);
apiRouter.use("/inventory", inventoryRouter);

module.exports = apiRouter;
