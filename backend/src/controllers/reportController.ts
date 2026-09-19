import { Request, Response } from 'express';
import db from '../config/db';

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    // Basic stats: Today's Sales, Total Products, Low Stock count, Total Customers
    const [[todaySales]]: any = await db.execute(`
      SELECT COALESCE(SUM(total_amount), 0) as total 
      FROM sales 
      WHERE DATE(created_at) = CURDATE() AND status = 'Completed'
    `);

    const [[productCount]]: any = await db.execute('SELECT COUNT(*) as count FROM products');
    
    const [[lowStock]]: any = await db.execute('SELECT COUNT(*) as count FROM products WHERE stock <= reorder_level AND is_service = FALSE');
    
    const [[customerCount]]: any = await db.execute('SELECT COUNT(*) as count FROM customers');

    // Sales Trend (Last 7 Days)
    const [salesTrend]: any = await db.execute(`
      SELECT DATE(created_at) as date, SUM(total_amount) as total
      FROM sales
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) AND status = 'Completed'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    // Top Selling Products
    const [topProducts]: any = await db.execute(`
      SELECT p.name, SUM(si.quantity) as sold_qty
      FROM sales_items si
      JOIN products p ON si.product_id = p.id
      JOIN sales s ON si.sale_id = s.id
      WHERE s.status = 'Completed'
      GROUP BY p.id
      ORDER BY sold_qty DESC
      LIMIT 5
    `);

    res.json({
      summary: {
        todaySales: todaySales.total,
        totalProducts: productCount.count,
        lowStockItems: lowStock.count,
        totalCustomers: customerCount.count
      },
      salesTrend,
      topProducts
    });
  } catch (error) {
    console.error("Dashboard Stats Error:", error);
    res.status(500).json({ message: 'Server error retrieving stats' });
  }
};

export const getShiftSummary = async (req: Request, res: Response) => {
  try {
    const { date } = req.query;
    let targetDate = 'CURDATE()';
    let params: any[] = [];
    
    if (date) {
      targetDate = '?';
      params.push(date);
    }

    const [[salesSummary]]: any = await db.execute(`
      SELECT 
        COUNT(id) as total_invoices,
        COALESCE(SUM(total_amount), 0) as total_sales,
        COALESCE(SUM(discount), 0) as total_discounts,
        COALESCE(SUM(tax), 0) as total_tax,
        COALESCE(SUM(CASE WHEN payment_method = 'Cash' THEN amount_paid ELSE 0 END), 0) as cash_received,
        COALESCE(SUM(CASE WHEN payment_method = 'Card' THEN amount_paid ELSE 0 END), 0) as card_received,
        COALESCE(SUM(CASE WHEN payment_method = 'Credit' THEN total_amount ELSE 0 END), 0) as credit_sales,
        COALESCE(SUM(loyalty_points_used), 0) as total_loyalty_used,
        COALESCE(SUM(loyalty_points_earned), 0) as total_loyalty_earned
      FROM sales
      WHERE DATE(created_at) = ${targetDate} AND status = 'Completed'
    `, params);

    const [[expenses]]: any = await db.execute(`
      SELECT COALESCE(SUM(amount), 0) as total_expenses 
      FROM expenses 
      WHERE expense_date = ${targetDate}
    `, params);

    const [[deposits]]: any = await db.execute(`
      SELECT COALESCE(SUM(amount), 0) as total_bank_deposits 
      FROM bank_deposits 
      WHERE deposit_date = ${targetDate}
    `, params);

    res.json({
      ...salesSummary,
      total_expenses: expenses.total_expenses,
      total_bank_deposits: deposits.total_bank_deposits
    });
  } catch (error) {
    console.error("Shift Summary Error:", error);
    res.status(500).json({ message: 'Server error retrieving shift summary' });
  }
};

export const getAdvancedReports = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    
    // 1. Inventory Valuation
    const [inventoryValuation]: any = await db.execute(`
      SELECT c.name as category, SUM(p.stock * p.purchase_price) as total_value, SUM(p.stock) as total_items
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_service = FALSE AND p.stock > 0
      GROUP BY p.category_id
      ORDER BY total_value DESC
    `);

    // 2. Profit and Loss
    let dateFilter = '';
    let params: any[] = [];
    if (startDate && endDate) {
      dateFilter = 'AND DATE(s.created_at) BETWEEN ? AND ?';
      params = [startDate, endDate];
    }
    
    const [pnlData]: any = await db.execute(`
      SELECT 
        SUM(si.subtotal) as total_revenue,
        SUM(si.quantity * p.purchase_price) as total_cogs
      FROM sales_items si
      JOIN sales s ON si.sale_id = s.id
      JOIN products p ON si.product_id = p.id
      WHERE s.status = 'Completed' ${dateFilter}
    `, params);

    // 3. Sales by Category
    const [salesByCategory]: any = await db.execute(`
      SELECT c.name as category, SUM(si.subtotal) as revenue
      FROM sales_items si
      JOIN sales s ON si.sale_id = s.id
      JOIN products p ON si.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE s.status = 'Completed' ${dateFilter}
      GROUP BY p.category_id
      ORDER BY revenue DESC
    `, params);

    res.json({
      inventoryValuation,
      profitAndLoss: {
        revenue: pnlData[0].total_revenue || 0,
        cogs: pnlData[0].total_cogs || 0,
        grossProfit: (pnlData[0].total_revenue || 0) - (pnlData[0].total_cogs || 0)
      },
      salesByCategory
    });
  } catch (error) {
    console.error("Advanced Reports Error:", error);
    res.status(500).json({ message: 'Server error retrieving advanced reports' });
  }
};

export const getFastMovingProducts = async (req: Request, res: Response) => {
  try {
    const [rows] = await db.execute(`
      SELECT p.name, SUM(si.quantity) as sold_qty 
      FROM sales_items si
      JOIN products p ON si.product_id = p.id
      GROUP BY p.id
      ORDER BY sold_qty DESC
      LIMIT 10
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getDailySales = async (req: Request, res: Response) => {
  try {
    const [rows] = await db.execute(`
      SELECT 
        dates.d as date,
        COALESCE(s.total_invoices, 0) as total_invoices,
        COALESCE(s.total_sales, 0) as total_sales,
        COALESCE(s.cash_sales, 0) as cash_sales,
        COALESCE(s.card_sales, 0) as card_sales,
        COALESCE(s.credit_sales, 0) as credit_sales,
        COALESCE(e.total_expenses, 0) as total_expenses,
        COALESCE(b.total_bank_deposits, 0) as total_bank_deposits
      FROM (
        SELECT DISTINCT DATE(created_at) as d FROM sales WHERE status = 'Completed'
        UNION
        SELECT DISTINCT expense_date as d FROM expenses
        UNION
        SELECT DISTINCT deposit_date as d FROM bank_deposits
      ) dates
      LEFT JOIN (
        SELECT 
          DATE(created_at) as date,
          COUNT(id) as total_invoices,
          SUM(total_amount) as total_sales,
          SUM(CASE WHEN payment_method = 'Cash' THEN amount_paid ELSE 0 END) as cash_sales,
          SUM(CASE WHEN payment_method = 'Card' THEN amount_paid ELSE 0 END) as card_sales,
          SUM(CASE WHEN payment_method = 'Credit' THEN total_amount ELSE 0 END) as credit_sales
        FROM sales WHERE status = 'Completed' GROUP BY DATE(created_at)
      ) s ON dates.d = s.date
      LEFT JOIN (
        SELECT expense_date as date, SUM(amount) as total_expenses 
        FROM expenses GROUP BY expense_date
      ) e ON dates.d = e.date
      LEFT JOIN (
        SELECT deposit_date as date, SUM(amount) as total_bank_deposits 
        FROM bank_deposits GROUP BY deposit_date
      ) b ON dates.d = b.date
      ORDER BY dates.d DESC
      LIMIT 30
    `);
    res.json(rows);
  } catch (error) {
    console.error("Daily Sales Error:", error);
    res.status(500).json({ message: 'Server error retrieving daily sales' });
  }
};
