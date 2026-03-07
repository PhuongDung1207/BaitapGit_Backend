const express = require("express");
const {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
} = require("./product.controller");

const productRouter = express.Router();

productRouter.get("/", listProducts);
productRouter.get("/:id", getProductById);
productRouter.post("/", createProduct);
productRouter.put("/:id", updateProduct);
productRouter.delete("/:id", deleteProduct);

module.exports = productRouter;
