const { v4: uuidv4 } = require("uuid");
const {
  warehouses,
  transactions,
  stockByWarehouseProduct,
  products
} = require("../../data/store");
const { badRequest, notFound } = require("../../utils/http");

function getWarehouseMetrics(warehouseId) {
  let totalQuantity = 0;
  let totalProducts = 0;

  Object.entries(stockByWarehouseProduct).forEach(([key, quantity]) => {
    const [currentWarehouseId] = key.split(":");
    if (currentWarehouseId !== warehouseId) {
      return;
    }

    totalQuantity += quantity;
    if (quantity > 0) {
      totalProducts += 1;
    }
  });

  return {
    totalQuantity,
    totalProducts
  };
}

function enrichWarehouse(warehouse) {
  const metrics = getWarehouseMetrics(warehouse.id);
  return {
    ...warehouse,
    ...metrics
  };
}

function parseBooleanQuery(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  if (normalized === "true" || normalized === "1") {
    return true;
  }
  if (normalized === "false" || normalized === "0") {
    return false;
  }
  return null;
}

function listWarehouses(req, res) {
  const q = String(req.query.q || "").trim().toLowerCase();
  const location = String(req.query.location || "").trim().toLowerCase();
  const hasStock = parseBooleanQuery(req.query.hasStock);
  const sortBy = String(req.query.sortBy || "createdAt");
  const sortOrder = String(req.query.sortOrder || "desc").toLowerCase() === "asc" ? "asc" : "desc";
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));

  let result = warehouses.map(enrichWarehouse);

  if (q) {
    result = result.filter((item) => {
      const name = String(item.name || "").toLowerCase();
      const itemLocation = String(item.location || "").toLowerCase();
      return name.includes(q) || itemLocation.includes(q);
    });
  }

  if (location) {
    result = result.filter((item) => String(item.location || "").toLowerCase().includes(location));
  }

  if (hasStock !== null) {
    result = result.filter((item) =>
      hasStock ? item.totalQuantity > 0 : item.totalQuantity <= 0
    );
  }

  const sortableFields = new Set(["createdAt", "name", "location", "totalQuantity", "totalProducts"]);
  const activeSortBy = sortableFields.has(sortBy) ? sortBy : "createdAt";
  result.sort((a, b) => {
    const left = a[activeSortBy];
    const right = b[activeSortBy];

    if (typeof left === "number" && typeof right === "number") {
      return sortOrder === "asc" ? left - right : right - left;
    }

    const leftText = String(left || "").toLowerCase();
    const rightText = String(right || "").toLowerCase();
    if (leftText === rightText) return 0;
    if (sortOrder === "asc") return leftText > rightText ? 1 : -1;
    return leftText < rightText ? 1 : -1;
  });

  const total = result.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  const data = result.slice(start, start + limit);

  res.json({
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages
    }
  });
}

function getWarehouseById(req, res, next) {
  try {
    const warehouse = warehouses.find((item) => item.id === req.params.id);
    if (!warehouse) {
      throw notFound("Warehouse not found");
    }
    res.json({ data: enrichWarehouse(warehouse) });
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

function getWarehouseInventorySummary(req, res, next) {
  try {
    const warehouse = warehouses.find((item) => item.id === req.params.id);
    if (!warehouse) {
      throw notFound("Warehouse not found");
    }

    const q = String(req.query.q || "").trim().toLowerCase();
    const sortBy = String(req.query.sortBy || "quantity");
    const sortOrder = String(req.query.sortOrder || "desc").toLowerCase() === "asc" ? "asc" : "desc";
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const threshold = Math.max(0, Number(req.query.threshold) || 10);
    const onlyLowStock = parseBooleanQuery(req.query.onlyLowStock) === true;

    let items = Object.entries(stockByWarehouseProduct)
      .map(([key, quantity]) => {
        const [warehouseId, productId] = key.split(":");
        return {
          warehouseId,
          productId,
          quantity
        };
      })
      .filter((item) => item.warehouseId === warehouse.id)
      .map((item) => {
        const product = products.find((entry) => entry.id === item.productId);
        return {
          productId: item.productId,
          sku: product ? product.sku : null,
          productName: product ? product.name : null,
          unit: product ? product.unit : null,
          quantity: item.quantity
        };
      });

    if (q) {
      items = items.filter((item) => {
        const sku = String(item.sku || "").toLowerCase();
        const name = String(item.productName || "").toLowerCase();
        const unit = String(item.unit || "").toLowerCase();
        return sku.includes(q) || name.includes(q) || unit.includes(q);
      });
    }

    if (onlyLowStock) {
      items = items.filter((item) => item.quantity <= threshold);
    }

    const sortableFields = new Set(["quantity", "sku", "productName", "unit"]);
    const activeSortBy = sortableFields.has(sortBy) ? sortBy : "quantity";
    items.sort((a, b) => {
      const left = a[activeSortBy];
      const right = b[activeSortBy];

      if (typeof left === "number" && typeof right === "number") {
        return sortOrder === "asc" ? left - right : right - left;
      }

      const leftText = String(left || "").toLowerCase();
      const rightText = String(right || "").toLowerCase();
      if (leftText === rightText) return 0;
      if (sortOrder === "asc") return leftText > rightText ? 1 : -1;
      return leftText < rightText ? 1 : -1;
    });

    const total = items.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    const data = items.slice(start, start + limit);
    const summary = {
      totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
      totalProducts: items.filter((item) => item.quantity > 0).length,
      lowStockProducts: items.filter((item) => item.quantity <= threshold).length
    };

    res.json({
      data,
      warehouse: enrichWarehouse(warehouse),
      summary,
      threshold,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });
  } catch (error) {
    next(error);
  }
}

function getWarehouseTransactions(req, res, next) {
  try {
    const warehouse = warehouses.find((item) => item.id === req.params.id);
    if (!warehouse) {
      throw notFound("Warehouse not found");
    }

    const type = String(req.query.type || "").trim().toUpperCase();
    if (type && type !== "RECEIVE" && type !== "SHIP") {
      throw badRequest("type must be RECEIVE or SHIP");
    }

    const productId = String(req.query.productId || "").trim();
    const q = String(req.query.q || "").trim().toLowerCase();
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

    let result = transactions
      .filter((item) => item.warehouseId === warehouse.id)
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

    if (type) {
      result = result.filter((item) => item.type === type);
    }

    if (productId) {
      result = result.filter((item) => item.productId === productId);
    }

    if (q) {
      result = result.filter((item) => {
        const product = products.find((entry) => entry.id === item.productId);
        const sku = String(product && product.sku ? product.sku : "").toLowerCase();
        const name = String(product && product.name ? product.name : "").toLowerCase();
        const note = String(item.note || "").toLowerCase();
        return sku.includes(q) || name.includes(q) || note.includes(q);
      });
    }

    const data = result
      .slice((page - 1) * limit, (page - 1) * limit + limit)
      .map((item) => {
        const product = products.find((entry) => entry.id === item.productId);
        return {
          ...item,
          product: product
            ? {
                id: product.id,
                sku: product.sku,
                name: product.name,
                unit: product.unit
              }
            : null
        };
      });

    const totalIn = result
      .filter((item) => item.type === "RECEIVE")
      .reduce((sum, item) => sum + item.quantity, 0);
    const totalOut = result
      .filter((item) => item.type === "SHIP")
      .reduce((sum, item) => sum + item.quantity, 0);

    res.json({
      data,
      warehouse: enrichWarehouse(warehouse),
      summary: {
        totalIn,
        totalOut,
        net: totalIn - totalOut
      },
      pagination: {
        page,
        limit,
        total: result.length,
        totalPages: Math.max(1, Math.ceil(result.length / limit))
      }
    });
  } catch (error) {
    next(error);
  }
}

function getWarehouseDashboard(req, res, next) {
  try {
    const warehouse = warehouses.find((item) => item.id === req.params.id);
    if (!warehouse) {
      throw notFound("Warehouse not found");
    }

    const threshold = Math.max(0, Number(req.query.threshold) || 10);
    const recentLimit = Math.min(50, Math.max(1, Number(req.query.recentLimit) || 10));
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    const warehouseInventory = Object.entries(stockByWarehouseProduct)
      .map(([key, quantity]) => {
        const [warehouseId, productId] = key.split(":");
        return {
          warehouseId,
          productId,
          quantity
        };
      })
      .filter((item) => item.warehouseId === warehouse.id);

    const inventoryDetail = warehouseInventory.map((item) => {
      const product = products.find((entry) => entry.id === item.productId);
      return {
        productId: item.productId,
        sku: product ? product.sku : null,
        productName: product ? product.name : null,
        unit: product ? product.unit : null,
        quantity: item.quantity
      };
    });

    const warehouseTransactions = transactions
      .filter((item) => item.warehouseId === warehouse.id)
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

    const recentTransactions = warehouseTransactions.slice(0, recentLimit).map((item) => {
      const product = products.find((entry) => entry.id === item.productId);
      return {
        ...item,
        product: product
          ? {
              id: product.id,
              sku: product.sku,
              name: product.name,
              unit: product.unit
            }
          : null
      };
    });

    const last7Days = warehouseTransactions.filter((item) => {
      const createdAtMs = Date.parse(item.createdAt);
      return Number.isFinite(createdAtMs) && createdAtMs >= sevenDaysAgo;
    });

    const last30Days = warehouseTransactions.filter((item) => {
      const createdAtMs = Date.parse(item.createdAt);
      return Number.isFinite(createdAtMs) && createdAtMs >= thirtyDaysAgo;
    });

    const topMovingProducts = Array.from(
      last30Days.reduce((map, item) => {
        const current = map.get(item.productId) || {
          productId: item.productId,
          totalMovement: 0,
          totalIn: 0,
          totalOut: 0
        };

        current.totalMovement += item.quantity;
        if (item.type === "RECEIVE") {
          current.totalIn += item.quantity;
        }
        if (item.type === "SHIP") {
          current.totalOut += item.quantity;
        }
        map.set(item.productId, current);
        return map;
      }, new Map()).values()
    )
      .sort((a, b) => b.totalMovement - a.totalMovement)
      .slice(0, 5)
      .map((item) => {
        const product = products.find((entry) => entry.id === item.productId);
        return {
          ...item,
          product: product
            ? {
                id: product.id,
                sku: product.sku,
                name: product.name,
                unit: product.unit
              }
            : null
        };
      });

    res.json({
      data: {
        warehouse: enrichWarehouse(warehouse),
        inventory: {
          totalQuantity: inventoryDetail.reduce((sum, item) => sum + item.quantity, 0),
          totalProducts: inventoryDetail.filter((item) => item.quantity > 0).length,
          outOfStockProducts: inventoryDetail.filter((item) => item.quantity === 0).length,
          lowStockProducts: inventoryDetail.filter((item) => item.quantity <= threshold).length,
          threshold
        },
        movement: {
          last7Days: {
            totalIn: last7Days
              .filter((item) => item.type === "RECEIVE")
              .reduce((sum, item) => sum + item.quantity, 0),
            totalOut: last7Days
              .filter((item) => item.type === "SHIP")
              .reduce((sum, item) => sum + item.quantity, 0),
            totalTransactions: last7Days.length
          },
          last30Days: {
            totalIn: last30Days
              .filter((item) => item.type === "RECEIVE")
              .reduce((sum, item) => sum + item.quantity, 0),
            totalOut: last30Days
              .filter((item) => item.type === "SHIP")
              .reduce((sum, item) => sum + item.quantity, 0),
            totalTransactions: last30Days.length
          }
        },
        topMovingProducts,
        recentTransactions
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listWarehouses,
  getWarehouseById,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
  getWarehouseInventorySummary,
  getWarehouseTransactions,
  getWarehouseDashboard
};
