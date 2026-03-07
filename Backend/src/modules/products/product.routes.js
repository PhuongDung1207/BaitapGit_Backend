const express = require("express");
const {
  listProducts,
  searchProducts,
  getProductById,
  createProduct,
  createProductsBulk,
  duplicateProduct,
  updateProduct,
  updateProductStatus,
  getProductInventorySummary,
  getProductTransactions,
  listLowStockProducts,
  deleteProduct
} = require("./product.controller");

const productRouter = express.Router();

productRouter.get("/", listProducts);
productRouter.get("/search", searchProducts);
productRouter.get("/low-stock", listLowStockProducts);
productRouter.get("/:id/inventory", getProductInventorySummary);
productRouter.get("/:id/transactions", getProductTransactions);
productRouter.get("/:id", getProductById);
productRouter.post("/", createProduct);
productRouter.post("/bulk", createProductsBulk);
productRouter.post("/:id/duplicate", duplicateProduct);
productRouter.put("/:id", updateProduct);
productRouter.patch("/:id/status", updateProductStatus);
productRouter.delete("/:id", deleteProduct);

module.exports = productRouter;
