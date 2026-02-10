import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Check if we're running on web
const isWeb = Platform.OS === 'web';

// Storage keys for AsyncStorage fallback
const STORAGE_KEYS = {
  profile: '@healthmate_profile',
  nutrition: '@healthmate_nutrition',
  vitals: '@healthmate_vitals',
  sport: '@healthmate_sport',
  financeCategories: '@healthmate_finance_categories',
  financeEntries: '@healthmate_finance_entries',
  blockerRules: '@healthmate_blocker_rules',
  notifications: '@healthmate_notifications',
};

// In-memory cache for web
let memoryDb: {
  profile: any;
  nutrition: any[];
  vitals: any[];
  sport: any[];
  financeCategories: any[];
  financeEntries: any[];
  blockerRules: any[];
  notifications: any[];
} = {
  profile: null,
  nutrition: [],
  vitals: [],
  sport: [],
  financeCategories: [],
  financeEntries: [],
  blockerRules: [],
  notifications: [],
};

// SQLite database (only on native)
let sqliteDb: any = null;

// Initialize SQLite only on native platforms
async function initSQLite() {
  if (!isWeb) {
    const SQLite = await import('expo-sqlite');
    sqliteDb = SQLite.openDatabaseSync('healthmate.db');
    
    // Create tables
    await sqliteDb.execAsync(`
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

    await sqliteDb.execAsync(`
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

    await sqliteDb.execAsync(`
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

    await sqliteDb.execAsync(`
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

    await sqliteDb.execAsync(`
      CREATE TABLE IF NOT EXISTS finance_categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        budget REAL,
        rhythm TEXT DEFAULT 'monthly',
        color TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await sqliteDb.execAsync(`
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

    await sqliteDb.execAsync(`
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

    await sqliteDb.execAsync(`
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

    await sqliteDb.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_nutrition_date ON nutrition_entries(date);
      CREATE INDEX IF NOT EXISTS idx_vitals_date ON vitals(date);
      CREATE INDEX IF NOT EXISTS idx_sport_date ON sport(date);
      CREATE INDEX IF NOT EXISTS idx_finance_entries_date ON finance_entries(date);
      CREATE INDEX IF NOT EXISTS idx_finance_entries_category ON finance_entries(category_id);
    `);

    // Insert default profile if not exists
    const profile = await sqliteDb.getFirstAsync('SELECT id FROM profile WHERE id = 1');
    if (!profile) {
      await sqliteDb.runAsync(`
        INSERT INTO profile (id, nutrient_goals, vital_goals, sport_goals, tracking_settings, language)
        VALUES (1, '{}', '{}', '{}', '{}', 'de')
      `);
    }
  }
}

// Initialize AsyncStorage fallback for web
async function initWebStorage() {
  try {
    // Load all data from AsyncStorage
    const profileStr = await AsyncStorage.getItem(STORAGE_KEYS.profile);
    const nutritionStr = await AsyncStorage.getItem(STORAGE_KEYS.nutrition);
    const vitalsStr = await AsyncStorage.getItem(STORAGE_KEYS.vitals);
    const sportStr = await AsyncStorage.getItem(STORAGE_KEYS.sport);
    const financeCategoriesStr = await AsyncStorage.getItem(STORAGE_KEYS.financeCategories);
    const financeEntriesStr = await AsyncStorage.getItem(STORAGE_KEYS.financeEntries);
    const blockerRulesStr = await AsyncStorage.getItem(STORAGE_KEYS.blockerRules);
    const notificationsStr = await AsyncStorage.getItem(STORAGE_KEYS.notifications);

    memoryDb.profile = profileStr ? JSON.parse(profileStr) : {
      id: 1,
      nutrient_goals: {},
      vital_goals: {},
      sport_goals: {},
      tracking_settings: {},
      language: 'de',
    };
    memoryDb.nutrition = nutritionStr ? JSON.parse(nutritionStr) : [];
    memoryDb.vitals = vitalsStr ? JSON.parse(vitalsStr) : [];
    memoryDb.sport = sportStr ? JSON.parse(sportStr) : [];
    memoryDb.financeCategories = financeCategoriesStr ? JSON.parse(financeCategoriesStr) : [];
    memoryDb.financeEntries = financeEntriesStr ? JSON.parse(financeEntriesStr) : [];
    memoryDb.blockerRules = blockerRulesStr ? JSON.parse(blockerRulesStr) : [];
    memoryDb.notifications = notificationsStr ? JSON.parse(notificationsStr) : [];
  } catch (error) {
    console.error('Error loading web storage:', error);
  }
}

// Save web storage
async function saveWebStorage(key: keyof typeof memoryDb) {
  if (isWeb) {
    try {
      const storageKey = {
        profile: STORAGE_KEYS.profile,
        nutrition: STORAGE_KEYS.nutrition,
        vitals: STORAGE_KEYS.vitals,
        sport: STORAGE_KEYS.sport,
        financeCategories: STORAGE_KEYS.financeCategories,
        financeEntries: STORAGE_KEYS.financeEntries,
        blockerRules: STORAGE_KEYS.blockerRules,
        notifications: STORAGE_KEYS.notifications,
      }[key];
      await AsyncStorage.setItem(storageKey, JSON.stringify(memoryDb[key]));
    } catch (error) {
      console.error('Error saving web storage:', error);
    }
  }
}

// Initialize database
export async function initDatabase(): Promise<void> {
  try {
    if (isWeb) {
      await initWebStorage();
      console.log('Web storage initialized successfully');
    } else {
      await initSQLite();
      console.log('SQLite database initialized successfully');
    }
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

// Database wrapper that works on both web and native
export const db = {
  async getFirstAsync<T>(query: string, params?: any[]): Promise<T | null> {
    if (isWeb) {
      // Web fallback - parse query and return from memory
      return null; // Services handle this directly
    }
    return sqliteDb?.getFirstAsync(query, params) || null;
  },

  async getAllAsync<T>(query: string, params?: any[]): Promise<T[]> {
    if (isWeb) {
      return []; // Services handle this directly
    }
    return sqliteDb?.getAllAsync(query, params) || [];
  },

  async runAsync(query: string, params?: any[]): Promise<void> {
    if (!isWeb && sqliteDb) {
      await sqliteDb.runAsync(query, params);
    }
  },

  async execAsync(query: string): Promise<void> {
    if (!isWeb && sqliteDb) {
      await sqliteDb.execAsync(query);
    }
  },
};

// Export memory database and save function for services
export { memoryDb, saveWebStorage, isWeb };
export default db;
