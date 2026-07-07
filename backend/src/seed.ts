import bcrypt from 'bcryptjs';
import db from './config/db';

const seedAdmin = async () => {
  try {
    const password = 'admin'; // Default password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const [rows]: any = await db.execute('SELECT * FROM users WHERE username = ?', ['admin']);
    
    if (rows.length === 0) {
      await db.execute(
        'INSERT INTO users (username, password, full_name, role) VALUES (?, ?, ?, ?)',
        ['admin', hashedPassword, 'System Administrator', 'Admin']
      );
      console.log('Admin user created successfully. Username: admin, Password: admin');
    } else {
      console.log('Admin user already exists.');
    }
    
    process.exit();
  } catch (error) {
    console.error('Failed to seed admin:', error);
    process.exit(1);
  }
};

seedAdmin();
