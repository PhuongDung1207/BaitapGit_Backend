const { v4: uuidv4 } = require("uuid");
const {
  products,
  transactions,
  stockByWarehouseProduct,
  warehouses
} = require("../../data/store");
const { badRequest, notFound } = require("../../utils/http");

function serializeProduct(product) {
  return {
    ...product,
    imageUrl: product.imageUrl || null,
    isActive: product.isActive !== false
  };
}

function getProductTotalStock(productId) {
  return Object.entries(stockByWarehouseProduct).reduce((total, [key, quantity]) => {
    const [, currentProductId] = key.split(":");
    if (currentProductId === productId) {
      return total + quantity;
    }
    return total;
  }, 0);
}

function listProducts(req, res) {
  const q = String(req.query.q || "").trim().toLowerCase();
  const unit = String(req.query.unit || "").trim().toLowerCase();
  const isActiveQuery = req.query.isActive;
  const sortBy = String(req.query.sortBy || "createdAt");
  const sortOrder = String(req.query.sortOrder || "desc").toLowerCase() === "asc" ? "asc" : "desc";
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));

  let result = products.map(serializeProduct);

  if (q) {
    result = result.filter((item) => {
      const sku = String(item.sku || "").toLowerCase();
      const name = String(item.name || "").toLowerCase();
      const itemUnit = String(item.unit || "").toLowerCase();
      return sku.includes(q) || name.includes(q) || itemUnit.includes(q);
    });
  }

  if (unit) {
    result = result.filter((item) => String(item.unit || "").toLowerCase() === unit);
  }

  if (isActiveQuery !== undefined) {
    const normalized = String(isActiveQuery).trim().toLowerCase();
    const isActive = normalized === "true" || normalized === "1";
    const isInactive = normalized === "false" || normalized === "0";
    if (isActive || isInactive) {
      result = result.filter((item) => item.isActive === isActive);
    }
  }

  const sortableFields = new Set(["createdAt", "name", "sku", "unit"]);
  const activeSortBy = sortableFields.has(sortBy) ? sortBy : "createdAt";
  result.sort((a, b) => {
    const left = String(a[activeSortBy] || "").toLowerCase();
    const right = String(b[activeSortBy] || "").toLowerCase();
    if (left === right) return 0;
    if (sortOrder === "asc") return left > right ? 1 : -1;
    return left < right ? 1 : -1;
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

function searchProducts(req, res) {
  const keyword = String(req.query.q || "").trim().toLowerCase();
  if (!keyword) {
    return res.json({ data: [] });
  }

  const data = products
    .map(serializeProduct)
    .filter((item) => {
      const sku = String(item.sku || "").toLowerCase();
      const name = String(item.name || "").toLowerCase();
      const unit = String(item.unit || "").toLowerCase();
      return sku.includes(keyword) || name.includes(keyword) || unit.includes(keyword);
    });

  return res.json({ data });
}

function getProductById(req, res, next) {
  try {
    const product = products.find((item) => item.id === req.params.id);
    if (!product) {
      throw notFound("Product not found");
    }
    res.json({ data: serializeProduct(product) });
  } catch (error) {
    next(error);
  }
}

function createProduct(req, res, next) {
  try {
    const { sku, name, unit, imageUrl } = req.body;
    if (!sku || !name) {
      throw badRequest("sku and name are required");
    }

    const skuText = String(sku).trim();
    const existedSku = products.some((item) => item.sku === skuText);
    if (existedSku) {
      throw badRequest("sku already exists");
    }

    const product = {
      id: uuidv4(),
      sku: skuText,
      name: String(name).trim(),
      unit: unit ? String(unit).trim() : "item",
      imageUrl: imageUrl ? String(imageUrl).trim() : null,
      isActive: true,
      createdAt: new Date().toISOString()
    };

    products.push(product);
    res.status(201).json({ data: serializeProduct(product) });
  } catch (error) {
    next(error);
  }
}

function getUniqueSkuCopy(baseSku) {
  const firstCandidate = `${baseSku}-COPY`;
  if (!products.some((item) => item.sku === firstCandidate)) {
    return firstCandidate;
  }

  let count = 2;
  while (products.some((item) => item.sku === `${baseSku}-COPY-${count}`)) {
    count += 1;
  }
  return `${baseSku}-COPY-${count}`;
}

function createProductsBulk(req, res, next) {
  try {
    const items = req.body && Array.isArray(req.body.items) ? req.body.items : null;
    if (!items || !items.length) {
      throw badRequest("items is required and must be a non-empty array");
    }

    const skuSeen = new Set();
    const prepared = items.map((item, index) => {
      const sku = String(item.sku || "").trim();
      const name = String(item.name || "").trim();
      const unit = item.unit ? String(item.unit).trim() : "item";
      const imageUrl = item.imageUrl ? String(item.imageUrl).trim() : null;

      if (!sku || !name) {
        throw badRequest(`items[${index}] must include sku and name`);
      }
      if (skuSeen.has(sku)) {
        throw badRequest(`Duplicate sku in request: ${sku}`);
      }
      if (products.some((product) => product.sku === sku)) {
        throw badRequest(`sku already exists: ${sku}`);
      }

      skuSeen.add(sku);
      return {
        id: uuidv4(),
        sku,
        name,
        unit,
        imageUrl,
        isActive: true,
        createdAt: new Date().toISOString()
      };
    });

    products.push(...prepared);
    res.status(201).json({
      data: prepared.map(serializeProduct),
      count: prepared.length
    });
  } catch (error) {
    next(error);
  }
}

function duplicateProduct(req, res, next) {
  try {
    const sourceProduct = products.find((item) => item.id === req.params.id);
    if (!sourceProduct) {
      throw notFound("Product not found");
    }

    const requestedSku = req.body && req.body.sku ? String(req.body.sku).trim() : "";
    const requestedName = req.body && req.body.name ? String(req.body.name).trim() : "";
    const sku = requestedSku || getUniqueSkuCopy(sourceProduct.sku);
    if (products.some((item) => item.sku === sku)) {
      throw badRequest("sku already exists");
    }

    const duplicated = {
      id: uuidv4(),
      sku,
      name: requestedName || `${sourceProduct.name} (Copy)`,
      unit: sourceProduct.unit,
      imageUrl: sourceProduct.imageUrl || null,
      isActive: sourceProduct.isActive !== false,
      createdAt: new Date().toISOString()
    };

    products.push(duplicated);
    res.status(201).json({ data: serializeProduct(duplicated) });
  } catch (error) {
    next(error);
  }
}

function updateProduct(req, res, next) {
  try {
    const product = products.find((item) => item.id === req.params.id);
    if (!product) {
      throw notFound("Product not found");
    }

    const { sku, name, unit, imageUrl } = req.body;
    if (sku !== undefined) {
      const skuText = String(sku).trim();
      const conflict = products.some((item) => item.sku === skuText && item.id !== product.id);
      if (conflict) {
        throw badRequest("sku already exists");
      }
      product.sku = skuText;
    }
    if (name !== undefined) {
      product.name = String(name).trim();
    }
    if (unit !== undefined) {
      product.unit = String(unit).trim();
    }
    if (imageUrl !== undefined) {
      const imageText = String(imageUrl).trim();
      product.imageUrl = imageText || null;
    }

    res.json({ data: serializeProduct(product) });
  } catch (error) {
    next(error);
  }
}

function updateProductStatus(req, res, next) {
  try {
    const product = products.find((item) => item.id === req.params.id);
    if (!product) {
      throw notFound("Product not found");
    }

    if (typeof req.body.isActive !== "boolean") {
      throw badRequest("isActive must be boolean");
    }

    product.isActive = req.body.isActive;
    product.updatedAt = new Date().toISOString();

    res.json({ data: serializeProduct(product) });
  } catch (error) {
    next(error);
  }
}

function getProductInventorySummary(req, res, next) {
  try {
    const product = products.find((item) => item.id === req.params.id);
    if (!product) {
      throw notFound("Product not found");
    }

    const byWarehouse = Object.entries(stockByWarehouseProduct)
      .map(([key, quantity]) => {
        const [warehouseId, productId] = key.split(":");
        return { warehouseId, productId, quantity };
      })
      .filter((item) => item.productId === product.id)
      .map((item) => {
        const warehouse = warehouses.find((entry) => entry.id === item.warehouseId);
        return {
          warehouseId: item.warehouseId,
          warehouseName: warehouse ? warehouse.name : null,
          quantity: item.quantity
        };
      });

    const totalQuantity = byWarehouse.reduce((sum, item) => sum + item.quantity, 0);

    res.json({
      data: {
        product: serializeProduct(product),
        totalQuantity,
        byWarehouse
      }
    });
  } catch (error) {
    next(error);
  }
}

function getProductTransactions(req, res, next) {
  try {
    const product = products.find((item) => item.id === req.params.id);
    if (!product) {
      throw notFound("Product not found");
    }

    const type = String(req.query.type || "").trim().toUpperCase();
    if (type && type !== "RECEIVE" && type !== "SHIP") {
      throw badRequest("type must be RECEIVE or SHIP");
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

    let result = transactions
      .filter((item) => item.productId === product.id)
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

    if (type) {
      result = result.filter((item) => item.type === type);
    }

    const total = result.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    const data = result.slice(start, start + limit);
    const totalIn = result
      .filter((item) => item.type === "RECEIVE")
      .reduce((sum, item) => sum + item.quantity, 0);
    const totalOut = result
      .filter((item) => item.type === "SHIP")
      .reduce((sum, item) => sum + item.quantity, 0);

    res.json({
      data,
      summary: {
        totalIn,
        totalOut,
        net: totalIn - totalOut
      },
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

function listLowStockProducts(req, res) {
  const parsedThreshold = Number(req.query.threshold);
  const threshold =
    Number.isFinite(parsedThreshold) && parsedThreshold >= 0 ? parsedThreshold : 10;

  const data = products
    .map((product) => ({
      ...serializeProduct(product),
      totalQuantity: getProductTotalStock(product.id)
    }))
    .filter((item) => item.totalQuantity <= threshold)
    .sort((a, b) => a.totalQuantity - b.totalQuantity);

  res.json({
    data,
    threshold
  });
}

function deleteProduct(req, res, next) {
  try {
    const index = products.findIndex((item) => item.id === req.params.id);
    if (index === -1) {
      throw notFound("Product not found");
    }

    const removedProduct = products[index];
    const hasTransactions = transactions.some((item) => item.productId === removedProduct.id);
    if (hasTransactions) {
      throw badRequest("Cannot delete product that already has inventory transactions");
    }

    products.splice(index, 1);

    Object.keys(stockByWarehouseProduct).forEach((key) => {
      if (key.endsWith(`:${removedProduct.id}`)) {
        delete stockByWarehouseProduct[key];
      }
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = {
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
};
