import { Request, Response } from 'express';
import db from '../config/db';

export const getSettings = async (req: Request, res: Response) => {
  try {
    const [rows]: any = await db.execute('SELECT setting_key, setting_value FROM settings');
    const settingsObj: any = {};
    for (const row of rows) {
      settingsObj[row.setting_key] = row.setting_value;
    }
    res.json(settingsObj);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateSettings = async (req: Request, res: Response) => {
  const settings = req.body;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    
    for (const [key, value] of Object.entries(settings)) {
      await connection.execute(
        `INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE setting_value = ?`,
        [key, String(value), String(value)]
      );
    }

    await connection.commit();
    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ message: 'Server error' });
  } finally {
    connection.release();
  }
};
