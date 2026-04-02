import db from '../src/lib/db';

console.log('Running database migrations...');

// Create users table
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Create meal plans table
db.exec(`
  CREATE TABLE IF NOT EXISTS meal_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    week_start_date TEXT NOT NULL,
    plan_data TEXT NOT NULL,
    budget REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// Create grocery lists table
db.exec(`
  CREATE TABLE IF NOT EXISTS grocery_lists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    meal_plan_id INTEGER,
    list_data TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (meal_plan_id) REFERENCES meal_plans(id)
  );
`);

// Create grocery prices table
db.exec(`
  CREATE TABLE IF NOT EXISTS grocery_prices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    store_name TEXT NOT NULL,
    item_name TEXT NOT NULL,
    price REAL NOT NULL,
    unit TEXT,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// Create diet preferences table
db.exec(`
  CREATE TABLE IF NOT EXISTS diet_preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    diet_type TEXT DEFAULT 'low-carb-paleo',
    daily_calorie_target INTEGER,
    daily_carb_limit INTEGER,
    budget_weekly REAL,
    health_conditions TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// Create deals/coupons table
db.exec(`
  CREATE TABLE IF NOT EXISTS deals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    store TEXT NOT NULL,
    item TEXT NOT NULL,
    original_price REAL,
    sale_price REAL NOT NULL,
    expires_at DATETIME,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

console.log('Database migrations completed successfully!');
