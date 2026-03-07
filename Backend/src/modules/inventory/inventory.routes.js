const express = require("express");
const {
  receiveStock,
  shipStock,
  getStock,
  getTransactions
} = require("./inventory.controller");

const inventoryRouter = express.Router();

inventoryRouter.get("/stock", getStock);
inventoryRouter.get("/transactions", getTransactions);
inventoryRouter.post("/receive", receiveStock);
inventoryRouter.post("/ship", shipStock);

module.exports = inventoryRouter;
