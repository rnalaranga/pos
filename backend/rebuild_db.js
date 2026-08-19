const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function rebuildDatabase() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '',
      port: process.env.DB_PORT || 3306,
      multipleStatements: true
    });

    console.log("Connected to MySQL server.");

    const dbName = process.env.DB_NAME || 'pos_system';
    
    // WARNING: This completely wipes the database!
    console.log(`Dropping existing database '${dbName}'...`);
    await connection.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
    
    console.log(`Creating fresh database '${dbName}'...`);
    await connection.query(`CREATE DATABASE \`${dbName}\``);
    await connection.query(`USE \`${dbName}\``);

    // Read and execute schema.sql
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      console.log("Executing schema.sql...");
      await connection.query(schemaSql);
      console.log("Schema imported successfully.");
    } else {
      console.log("Schema file not found at " + schemaPath);
    }

    await connection.end();
    console.log("\nDatabase completely rebuilt from scratch! 🎉");
    console.log("Don't forget to run 'node seed_admin.js' next.");
  } catch (error) {
    console.error("Rebuild failed:", error);
  }
}

rebuildDatabase();
