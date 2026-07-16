const mysql = require('mysql2/promise');
require('dotenv').config();

async function testUpdate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'pos_system',
    port: process.env.DB_PORT || 3306
  });

  try {
    const id = "2";
    const name = "Test Category";
    const description = "";
    const icon = null;
    const color_code = "#3b82f6";
    const parent_id = "";

    const parsedParentId = parent_id ? parseInt(parent_id, 10) : null;

    console.log("Executing SQL...");
    const [result] = await connection.execute(
      'UPDATE categories SET name = ?, description = ?, icon = ?, color_code = ?, parent_id = ? WHERE id = ?',
      [name, description || null, icon || null, color_code || null, parsedParentId, id]
    );
    console.log("Success:", result);
  } catch (error) {
    console.error("Database Error:", error.message);
  } finally {
    connection.end();
  }
}

testUpdate();
