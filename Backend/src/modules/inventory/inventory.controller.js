const { v4: uuidv4 } = require("uuid");
const {
  warehouses,
  products,
  transactions,
  stockByWarehouseProduct,
  stockKey
} = require("../../data/store");
const { badRequest, notFound, parsePositiveNumber } = require("../../utils/http");

function ensureWarehouseAndProduct(warehouseId, productId) {
  const warehouse = warehouses.find((item) => item.id === warehouseId);
  if (!warehouse) {
    throw notFound("Warehouse not found");
  }

  const product = products.find((item) => item.id === productId);
  if (!product) {
    throw notFound("Product not found");
  }

  return { warehouse, product };
}

function getStockRecord(warehouseId, productId) {
  const key = stockKey(warehouseId, productId);
  if (!stockByWarehouseProduct[key]) {
    stockByWarehouseProduct[key] = 0;
  }
  return key;
}

function receiveStock(req, res, next) {
  try {
    const { warehouseId, productId, quantity, note } = req.body;
    const parsedQuantity = parsePositiveNumber(quantity);
    if (!warehouseId || !productId || !parsedQuantity) {
      throw badRequest("warehouseId, productId and positive quantity are required");
    }

    ensureWarehouseAndProduct(warehouseId, productId);
    const key = getStockRecord(warehouseId, productId);
    stockByWarehouseProduct[key] += parsedQuantity;

    const transaction = {
      id: uuidv4(),
      type: "RECEIVE",
      warehouseId,
      productId,
      quantity: parsedQuantity,
      note: note ? String(note).trim() : "",
      createdAt: new Date().toISOString()
    };

    transactions.push(transaction);
    res.status(201).json({
      data: {
        transaction,
        currentStock: stockByWarehouseProduct[key]
      }
    });
  } catch (error) {
    next(error);
  }
}

function shipStock(req, res, next) {
  try {
    const { warehouseId, productId, quantity, note } = req.body;
    const parsedQuantity = parsePositiveNumber(quantity);
    if (!warehouseId || !productId || !parsedQuantity) {
      throw badRequest("warehouseId, productId and positive quantity are required");
    }

    ensureWarehouseAndProduct(warehouseId, productId);
    const key = getStockRecord(warehouseId, productId);
    if (stockByWarehouseProduct[key] < parsedQuantity) {
      throw badRequest("Insufficient stock");
    }

    stockByWarehouseProduct[key] -= parsedQuantity;
    const transaction = {
      id: uuidv4(),
      type: "SHIP",
      warehouseId,
      productId,
      quantity: parsedQuantity,
      note: note ? String(note).trim() : "",
      createdAt: new Date().toISOString()
    };

    transactions.push(transaction);
    res.status(201).json({
      data: {
        transaction,
        currentStock: stockByWarehouseProduct[key]
      }
    });
  } catch (error) {
    next(error);
  }
}

function getStock(req, res, next) {
  try {
    const { warehouseId, productId } = req.query;
    const list = Object.entries(stockByWarehouseProduct).map(([key, quantity]) => {
      const [warehouseKey, productKey] = key.split(":");
      return {
        warehouseId: warehouseKey,
        productId: productKey,
        quantity
      };
    });

    const filtered = list.filter((item) => {
      if (warehouseId && item.warehouseId !== warehouseId) {
        return false;
      }
      if (productId && item.productId !== productId) {
        return false;
      }
      return true;
    });

    res.json({ data: filtered });
  } catch (error) {
    next(error);
  }
}

function getTransactions(_req, res) {
  res.json({ data: transactions });
}

module.exports = {
  receiveStock,
  shipStock,
  getStock,
  getTransactions
};
