const express = require("express");
const {
  listProducts,
  searchProducts,
  getProductById,
  createProduct,
  createProductsBulk,
  updateProduct,
  getProductInventorySummary,
  listLowStockProducts,
  deleteProduct
} = require("./product.controller");

const productRouter = express.Router();

productRouter.get("/", listProducts);
productRouter.get("/search", searchProducts);
productRouter.get("/low-stock", listLowStockProducts);
productRouter.get("/:id/inventory", getProductInventorySummary);
productRouter.get("/:id", getProductById);
productRouter.post("/", createProduct);
productRouter.post("/bulk", createProductsBulk);
productRouter.put("/:id", updateProduct);
productRouter.delete("/:id", deleteProduct);

module.exports = productRouter;
