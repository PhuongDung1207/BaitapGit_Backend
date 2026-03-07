const express = require("express");
const {
  listProducts,
  searchProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
} = require("./product.controller");

const productRouter = express.Router();

productRouter.get("/", listProducts);
productRouter.get("/search", searchProducts);
productRouter.get("/:id", getProductById);
productRouter.post("/", createProduct);
productRouter.put("/:id", updateProduct);
productRouter.delete("/:id", deleteProduct);

module.exports = productRouter;
