const { v4: uuidv4 } = require("uuid");
const { warehouses, transactions, stockByWarehouseProduct } = require("../../data/store");
const { badRequest, notFound } = require("../../utils/http");

function listWarehouses(_req, res) {
  res.json({ data: warehouses });
}

function getWarehouseById(req, res, next) {
  try {
    const warehouse = warehouses.find((item) => item.id === req.params.id);
    if (!warehouse) {
      throw notFound("Warehouse not found");
    }
    res.json({ data: warehouse });
  } catch (error) {
    next(error);
  }
}

function createWarehouse(req, res, next) {
  try {
    const { name, location } = req.body;
    if (!name || !location) {
      throw badRequest("name and location are required");
    }

    const warehouse = {
      id: uuidv4(),
      name: String(name).trim(),
      location: String(location).trim(),
      createdAt: new Date().toISOString()
    };

    warehouses.push(warehouse);
    res.status(201).json({ data: warehouse });
  } catch (error) {
    next(error);
  }
}

function updateWarehouse(req, res, next) {
  try {
    const warehouse = warehouses.find((item) => item.id === req.params.id);
    if (!warehouse) {
      throw notFound("Warehouse not found");
    }

    const { name, location } = req.body;
    if (name !== undefined) {
      warehouse.name = String(name).trim();
    }
    if (location !== undefined) {
      warehouse.location = String(location).trim();
    }

    res.json({ data: warehouse });
  } catch (error) {
    next(error);
  }
}

function deleteWarehouse(req, res, next) {
  try {
    const index = warehouses.findIndex((item) => item.id === req.params.id);
    if (index === -1) {
      throw notFound("Warehouse not found");
    }

    const removedWarehouse = warehouses[index];
    const hasTransactions = transactions.some((item) => item.warehouseId === removedWarehouse.id);
    if (hasTransactions) {
      throw badRequest("Cannot delete warehouse that already has inventory transactions");
    }

    warehouses.splice(index, 1);

    Object.keys(stockByWarehouseProduct).forEach((key) => {
      if (key.startsWith(`${removedWarehouse.id}:`)) {
        delete stockByWarehouseProduct[key];
      }
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listWarehouses,
  getWarehouseById,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse
};
