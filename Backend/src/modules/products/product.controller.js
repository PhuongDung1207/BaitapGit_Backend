const { v4: uuidv4 } = require("uuid");
const { products, transactions, stockByWarehouseProduct } = require("../../data/store");
const { badRequest, notFound } = require("../../utils/http");

function listProducts(_req, res) {
  const data = products.map((item) => ({
    ...item,
    imageUrl: item.imageUrl || null
  }));
  res.json({ data });
}


function searchProducts(req, res) {
  const keyword = String(req.query.q || "").trim().toLowerCase();

  if (!keyword) {
    return res.json({ data: [] });
  }

  const results = products
    .filter((item) => {
      const sku = String(item.sku || "").toLowerCase();
      const name = String(item.name || "").toLowerCase();
      const unit = String(item.unit || "").toLowerCase();

      return sku.includes(keyword) || name.includes(keyword) || unit.includes(keyword);
    })
    .map((item) => ({
      ...item,
      imageUrl: item.imageUrl || null
    }));

  return res.json({ data: results });
}

function getProductById(req, res, next) {
  try {
    const product = products.find((item) => item.id === req.params.id);
    if (!product) {
      throw notFound("Product not found");
    }
    res.json({
      data: {
        ...product,
        imageUrl: product.imageUrl || null
      }
    });
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
      createdAt: new Date().toISOString()
    };

    products.push(product);
    res.status(201).json({ data: product });
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

    res.json({
      data: {
        ...product,
        imageUrl: product.imageUrl || null
      }
    });
  } catch (error) {
    next(error);
  }
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
  updateProduct,
  deleteProduct
};
