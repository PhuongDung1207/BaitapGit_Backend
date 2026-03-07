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
- `GET /api/warehouses`
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
- `GET /api/products?q=steel&unit=piece&sortBy=name&sortOrder=asc&page=1&limit=10`
- `GET /api/products/search?q=keyword`
- `GET /api/products/low-stock?threshold=10`
- `GET /api/products/:id`
- `GET /api/products/:id/inventory`
- `POST /api/products`
- `POST /api/products/bulk`
- `PUT /api/products/:id`
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

### Inventory
- `GET /api/inventory/stock?warehouseId=&productId=`
- `GET /api/inventory/transactions`
- `POST /api/inventory/receive`
- `POST /api/inventory/ship`

Receive/Ship body example:

```json
{
  "warehouseId": "warehouse-id",
  "productId": "product-id",
  "quantity": 25,
  "note": "Initial stock"
}
```

## 4. Notes
- Current implementation uses in-memory data store (`src/data/store.js`).
- Restarting server will reset all data.
- You can replace the store layer with MongoDB, MySQL, or PostgreSQL later.
