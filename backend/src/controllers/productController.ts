import { Request, Response } from 'express';
import db from '../config/db';
import * as xlsx from 'xlsx';

export const getProducts = async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT p.*, c.name as category_name, 
             COALESCE((SELECT SUM(quantity) FROM sales_items WHERE product_id = p.id), 0) as total_sold
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      ORDER BY p.name ASC
    `;
    const [rows]: any = await db.execute(query);
    const [materials]: any = await db.execute('SELECT * FROM service_materials');
    
    const productsWithMaterials = rows.map((p: any) => ({
      ...p,
      materials: materials.filter((m: any) => m.service_id === p.id).map((m: any) => ({
        material_id: m.material_id,
        quantity: m.quantity
      }))
    }));
    
    res.json(productsWithMaterials);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createProduct = async (req: Request, res: Response) => {
  const { 
    barcode, sku, name, category_id, supplier_id, unit, 
    purchase_price, selling_price, wholesale_price, 
    stock, reorder_level, is_service, status, materials 
  } = req.body;
  
  try {
    const [result]: any = await db.execute(
      `INSERT INTO products (
        barcode, sku, name, category_id, supplier_id, unit, 
        purchase_price, selling_price, wholesale_price, 
        stock, reorder_level, is_service, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        barcode || null, sku || null, name, category_id || null, supplier_id || null, unit || 'pcs',
        purchase_price || 0, selling_price || 0, wholesale_price || 0,
        stock || 0, reorder_level || 5, is_service || false, status || 'Active'
      ]
    );
    
    const productId = result.insertId;
    if (is_service && materials && materials.length > 0) {
      for (const mat of materials) {
        await db.execute(
          'INSERT INTO service_materials (service_id, material_id, quantity) VALUES (?, ?, ?)',
          [productId, mat.material_id, mat.quantity]
        );
      }
    }
    
    res.status(201).json({ id: productId, name, barcode, sku });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Barcode or SKU already exists' });
    }
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { 
    barcode, sku, name, category_id, supplier_id, unit, 
    purchase_price, selling_price, wholesale_price, 
    stock, reorder_level, is_service, status, materials 
  } = req.body;

  try {
    await db.execute(
      `UPDATE products SET 
        barcode = ?, sku = ?, name = ?, category_id = ?, supplier_id = COALESCE(?, supplier_id), unit = ?, 
        purchase_price = ?, selling_price = ?, wholesale_price = ?, 
        stock = ?, reorder_level = ?, is_service = ?, status = COALESCE(?, status)
      WHERE id = ?`,
      [
        barcode || null, sku || null, name, category_id || null, supplier_id || null, unit || 'pcs',
        purchase_price, selling_price, wholesale_price,
        stock, reorder_level, is_service, status || null, id
      ]
    );
    
    await db.execute('DELETE FROM service_materials WHERE service_id = ?', [id]);
    if (is_service && materials && materials.length > 0) {
      for (const mat of materials) {
        await db.execute(
          'INSERT INTO service_materials (service_id, material_id, quantity) VALUES (?, ?, ?)',
          [id, mat.material_id, mat.quantity]
        );
      }
    }

    res.json({ message: 'Product updated successfully' });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Barcode or SKU already exists' });
    }
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await db.execute('DELETE FROM products WHERE id = ?', [id]);
    res.json({ message: 'Product deleted successfully' });
  } catch (error: any) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      await db.execute('UPDATE products SET status = "Inactive" WHERE id = ?', [id]);
      return res.json({ message: 'Product marked as inactive because it has associated records' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

export const downloadProductTemplate = (req: Request, res: Response) => {
  const wsData = [
    [
      'Category Name (Optional)', 'Product Name', 'Barcode', 'SKU', 'Purchase Price', 
      'Selling Price', 'Wholesale Price', 'Stock', 'Reorder Level', 'Unit', 'Is Service (Yes/No)'
    ]
  ];
  const ws = xlsx.utils.aoa_to_sheet(wsData);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, 'Products Template');

  const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Disposition', 'attachment; filename="product_import_template.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buffer);
};

export const importProducts = async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  try {
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet) as any[];

    if (!data || data.length === 0) {
      return res.status(400).json({ message: 'Excel file is empty or invalid' });
    }

    // Pre-fetch categories to map category names to IDs
    const [categories]: any = await db.execute('SELECT id, name FROM categories');
    const categoryMap = new Map(categories.map((c: any) => [c.name.toLowerCase().trim(), c.id]));

    let successCount = 0;
    let errors = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const name = row['Product Name'];
      const barcode = row['Barcode'] ? String(row['Barcode']) : null;
      const sku = row['SKU'] ? String(row['SKU']) : null;
      const purchase_price = parseFloat(row['Purchase Price']) || 0;
      const selling_price = parseFloat(row['Selling Price']);
      const wholesale_price = parseFloat(row['Wholesale Price']) || 0;
      const stock = parseInt(row['Stock']) || 0;
      const reorder_level = parseInt(row['Reorder Level']) || 5;
      const unit = row['Unit'] || 'pcs';
      const is_service = row['Is Service (Yes/No)']?.toString().toLowerCase() === 'yes' ? 1 : 0;
      
      let category_id = null;
      const catName = row['Category Name (Optional)'];
      if (catName) {
        const catNameLower = String(catName).toLowerCase().trim();
        if (categoryMap.has(catNameLower)) {
          category_id = categoryMap.get(catNameLower);
        } else {
          try {
            const [catResult]: any = await db.execute('INSERT INTO categories (name) VALUES (?)', [catName.trim()]);
            category_id = catResult.insertId;
            categoryMap.set(catNameLower, category_id);
          } catch(e) {
            // ignore if duplicate
          }
        }
      }

      if (!name || isNaN(selling_price)) {
        errors.push(`Row ${i + 2}: Missing required fields (Product Name or Selling Price)`);
        continue;
      }

      try {
        await db.execute(
          `INSERT INTO products (
            barcode, sku, name, category_id, unit, 
            purchase_price, selling_price, wholesale_price, 
            stock, reorder_level, is_service, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active')
          ON DUPLICATE KEY UPDATE 
            name = VALUES(name),
            category_id = VALUES(category_id),
            unit = VALUES(unit),
            purchase_price = VALUES(purchase_price),
            selling_price = VALUES(selling_price),
            wholesale_price = VALUES(wholesale_price),
            stock = stock + VALUES(stock),
            reorder_level = VALUES(reorder_level),
            is_service = VALUES(is_service)`,
          [
            barcode, sku, name, category_id, unit,
            purchase_price, selling_price, wholesale_price,
            stock, reorder_level, is_service
          ]
        );
        successCount++;
      } catch (err: any) {
        errors.push(`Row ${i + 2}: Failed to insert product ${name} - ${err.message}`);
      }
    }

    res.json({ message: `Successfully imported/updated ${successCount} products.`, errors });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to process Excel file' });
  }
};
