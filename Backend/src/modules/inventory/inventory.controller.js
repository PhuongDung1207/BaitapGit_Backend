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

function buildTransferNote(direction, warehouseName, customNote) {
  const baseText =
    direction === "OUT"
      ? `Transfer to ${warehouseName}`
      : `Transfer from ${warehouseName}`;

  if (!customNote) {
    return baseText;
  }

  return `${baseText}. ${customNote}`;
}

function transferStock(req, res, next) {
  try {
    const { fromWarehouseId, toWarehouseId, productId, quantity, note } = req.body;
    const parsedQuantity = parsePositiveNumber(quantity);
    const normalizedNote = note ? String(note).trim() : "";

    if (!fromWarehouseId || !toWarehouseId || !productId || !parsedQuantity) {
      throw badRequest("fromWarehouseId, toWarehouseId, productId and positive quantity are required");
    }

    if (fromWarehouseId === toWarehouseId) {
      throw badRequest("fromWarehouseId and toWarehouseId must be different");
    }

    const { warehouse: fromWarehouse } = ensureWarehouseAndProduct(fromWarehouseId, productId);
    const { warehouse: toWarehouse } = ensureWarehouseAndProduct(toWarehouseId, productId);

    const fromKey = getStockRecord(fromWarehouseId, productId);
    const toKey = getStockRecord(toWarehouseId, productId);

    if (stockByWarehouseProduct[fromKey] < parsedQuantity) {
      throw badRequest("Insufficient stock in source warehouse");
    }

    stockByWarehouseProduct[fromKey] -= parsedQuantity;
    stockByWarehouseProduct[toKey] += parsedQuantity;

    const transferId = uuidv4();
    const createdAt = new Date().toISOString();

    const shipTransaction = {
      id: uuidv4(),
      referenceId: transferId,
      type: "SHIP",
      warehouseId: fromWarehouseId,
      counterpartyWarehouseId: toWarehouseId,
      productId,
      quantity: parsedQuantity,
      note: buildTransferNote("OUT", toWarehouse.name, normalizedNote),
      createdAt
    };

    const receiveTransaction = {
      id: uuidv4(),
      referenceId: transferId,
      type: "RECEIVE",
      warehouseId: toWarehouseId,
      counterpartyWarehouseId: fromWarehouseId,
      productId,
      quantity: parsedQuantity,
      note: buildTransferNote("IN", fromWarehouse.name, normalizedNote),
      createdAt
    };

    transactions.push(shipTransaction, receiveTransaction);

    res.status(201).json({
      data: {
        transferId,
        productId,
        quantity: parsedQuantity,
        fromWarehouse: {
          id: fromWarehouseId,
          name: fromWarehouse.name,
          currentStock: stockByWarehouseProduct[fromKey]
        },
        toWarehouse: {
          id: toWarehouseId,
          name: toWarehouse.name,
          currentStock: stockByWarehouseProduct[toKey]
        },
        transactions: [shipTransaction, receiveTransaction]
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
  transferStock,
  getStock,
  getTransactions
};
