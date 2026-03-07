const warehouses = [];
const products = [];
const transactions = [];
const stockByWarehouseProduct = {};

function stockKey(warehouseId, productId) {
  return `${warehouseId}:${productId}`;
}

module.exports = {
  warehouses,
  products,
  transactions,
  stockByWarehouseProduct,
  stockKey
};
