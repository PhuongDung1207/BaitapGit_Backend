# Storage Management Backend (Node.js + JavaScript)

Backend-only project for a simple storage management system.

## 1. Setup

```bash
cd Backend
npm install
```

## 2. Run

```bash
npm run dev
```

Or production mode:

```bash
npm start
```

Default server: `http://localhost:3000`

## 3. API Endpoints

### Health
- `GET /api/health`

### Warehouses
- `GET /api/warehouses?q=main&location=chi%20minh&hasStock=true&sortBy=totalQuantity&sortOrder=desc&page=1&limit=10`
- `GET /api/warehouses/:id/inventory?q=sku&onlyLowStock=true&threshold=10&sortBy=quantity&sortOrder=asc&page=1&limit=20`
- `GET /api/warehouses/:id/transactions?type=RECEIVE&productId=product-id&q=note&page=1&limit=20`
- `GET /api/warehouses/:id`
- `POST /api/warehouses`
- `PUT /api/warehouses/:id`
- `DELETE /api/warehouses/:id`

Body example:

```json
{
  "name": "Main Warehouse",
  "location": "Ho Chi Minh City"
}
```

### Products
- `GET /api/products`
- `GET /api/products?q=steel&unit=piece&isActive=true&sortBy=name&sortOrder=asc&page=1&limit=10`
- `GET /api/products/search?q=keyword`
- `GET /api/products/low-stock?threshold=10`
- `GET /api/products/:id`
- `GET /api/products/:id/inventory`
- `GET /api/products/:id/transactions?type=RECEIVE&page=1&limit=20`
- `POST /api/products`
- `POST /api/products/bulk`
- `POST /api/products/:id/duplicate`
- `PUT /api/products/:id`
- `PATCH /api/products/:id/status`
- `DELETE /api/products/:id`

Body example:

```json
{
  "sku": "SKU-001",
  "name": "Steel Box",
  "unit": "piece",
  "imageUrl": "https://example.com/images/steel-box.jpg"
}
```

Update product status example:

```json
{
  "isActive": false
}
```

Bulk create example:

```json
{
  "items": [
    {
      "sku": "SKU-002",
      "name": "Plastic Box",
      "unit": "piece",
      "imageUrl": "https://example.com/images/plastic-box.jpg"
    },
    {
      "sku": "SKU-003",
      "name": "Wood Pallet",
      "unit": "piece"
    }
  ]
}
```

Duplicate product note:
- `POST /api/products/:id/duplicate` can duplicate a product.
- Optional body:

```json
{
  "sku": "SKU-001-COPY-CUSTOM",
  "name": "Steel Box Special Copy"
}
```

### Inventory
- `GET /api/inventory/stock?warehouseId=&productId=`
- `GET /api/inventory/transactions`
- `POST /api/inventory/receive`
- `POST /api/inventory/ship`
- `POST /api/inventory/transfer`

Receive/Ship body example:

```json
{
  "warehouseId": "warehouse-id",
  "productId": "product-id",
  "quantity": 25,
  "note": "Initial stock"
}
```

Transfer body example:

```json
{
  "fromWarehouseId": "warehouse-id-A",
  "toWarehouseId": "warehouse-id-B",
  "productId": "product-id",
  "quantity": 10,
  "note": "Move to overflow area"
}
```

## 4. Notes
- Current implementation uses in-memory data store (`src/data/store.js`).
- Restarting server will reset all data.
- You can replace the store layer with MongoDB, MySQL, or PostgreSQL later.
