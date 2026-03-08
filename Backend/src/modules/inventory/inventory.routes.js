const express = require("express");
const {
  receiveStock,
  shipStock,
  transferStock,
  adjustStock,
  getStock,
  getTransactions
} = require("./inventory.controller");

const inventoryRouter = express.Router();

inventoryRouter.get("/stock", getStock);
inventoryRouter.get("/transactions", getTransactions);
inventoryRouter.post("/receive", receiveStock);
inventoryRouter.post("/ship", shipStock);
inventoryRouter.post("/transfer", transferStock);
inventoryRouter.post("/adjust", adjustStock);

module.exports = inventoryRouter;
