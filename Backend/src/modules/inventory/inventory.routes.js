const express = require("express");
const {
  receiveStock,
  shipStock,
  transferStock,
  getStock,
  getTransactions
} = require("./inventory.controller");

const inventoryRouter = express.Router();

inventoryRouter.get("/stock", getStock);
inventoryRouter.get("/transactions", getTransactions);
inventoryRouter.post("/receive", receiveStock);
inventoryRouter.post("/ship", shipStock);
inventoryRouter.post("/transfer", transferStock);

module.exports = inventoryRouter;
