import * as SQLite from 'expo-sqlite';

// Open or create the database
const db = SQLite.openDatabaseSync('balanceos.db');

// Initialize all tables
export async function initDatabase(): Promise<void> {
  try {
    // Profile table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS profile (
        id INTEGER PRIMARY KEY DEFAULT 1,
        birth_date TEXT,
        height REAL,
        gender TEXT,
        nutrient_goals TEXT,
        vital_goals TEXT,
        sport_goals TEXT,
        tracking_settings TEXT,
        language TEXT DEFAULT 'de',
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Nutrition entries table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS nutrition_entries (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        time TEXT,
        description TEXT,
        calories REAL DEFAULT 0,
        protein REAL DEFAULT 0,
        carbs REAL DEFAULT 0,
        fat REAL DEFAULT 0,
        fiber REAL DEFAULT 0,
        sugar REAL DEFAULT 0,
        salt REAL DEFAULT 0,
        water REAL DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Vitals table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS vitals (
        id TEXT PRIMARY KEY,
        date TEXT UNIQUE NOT NULL,
        weight REAL,
        body_fat REAL,
        sleep_start TEXT,
        sleep_end TEXT,
        sleep_duration REAL,
        sleep_quality INTEGER,
        morning_energy INTEGER,
        resting_heart_rate INTEGER,
        basal_metabolic_rate REAL,
        neat REAL,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Sport/Activity table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS sport (
        id TEXT PRIMARY KEY,
        date TEXT UNIQUE NOT NULL,
        steps INTEGER DEFAULT 0,
        calories_burned REAL DEFAULT 0,
        workouts TEXT,
        custom_metrics TEXT,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Finance categories table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS finance_categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        budget REAL,
        rhythm TEXT DEFAULT 'monthly',
        color TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Finance entries table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS finance_entries (
        id TEXT PRIMARY KEY,
        category_id TEXT NOT NULL,
        date TEXT NOT NULL,
        description TEXT,
        amount REAL NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES finance_categories(id)
      );
    `);

    // App blocker rules table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS app_blocker_rules (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        apps TEXT,
        start_time TEXT,
        end_time TEXT,
        days TEXT,
        is_active INTEGER DEFAULT 1,
        unlock_type TEXT DEFAULT 'password',
        unlock_password TEXT,
        sport_minutes_required INTEGER,
        allow_temporary_unlock INTEGER DEFAULT 1,
        temporary_unlock_minutes INTEGER DEFAULT 5,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Push notifications table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        message TEXT,
        time TEXT,
        days TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create indexes for better performance
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_nutrition_date ON nutrition_entries(date);
      CREATE INDEX IF NOT EXISTS idx_vitals_date ON vitals(date);
      CREATE INDEX IF NOT EXISTS idx_sport_date ON sport(date);
      CREATE INDEX IF NOT EXISTS idx_finance_entries_date ON finance_entries(date);
      CREATE INDEX IF NOT EXISTS idx_finance_entries_category ON finance_entries(category_id);
    `);

    // Insert default profile if not exists
    const profile = await db.getFirstAsync('SELECT id FROM profile WHERE id = 1');
    if (!profile) {
      await db.runAsync(`
        INSERT INTO profile (id, nutrient_goals, vital_goals, sport_goals, tracking_settings, language)
        VALUES (1, '{}', '{}', '{}', '{}', 'de')
      `);
    }

    console.log('BalanceOS Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

// Helper to generate UUID
export function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Export the database instance
export { db };
export default db;
