const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function setupDatabase() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '',
      port: process.env.DB_PORT || 3306,
      multipleStatements: true
    });

    console.log("Connected to MySQL server.");

    // Create database if it doesn't exist
    const dbName = process.env.DB_NAME || 'pos_system';
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    console.log(`Database '${dbName}' created or already exists.`);
    
    await connection.query(`USE \`${dbName}\``);

    // Read and execute schema.sql
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await connection.query(schemaSql);
      console.log("Schema imported successfully.");
    } else {
      console.log("Schema file not found at " + schemaPath);
    }

    await connection.end();
    console.log("Database setup complete.");
  } catch (error) {
    console.error("Setup failed:", error);
  }
}

setupDatabase();
