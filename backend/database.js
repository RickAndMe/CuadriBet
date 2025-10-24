const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Configuración robusta de base de datos para diferentes entornos
const DATABASE_CONFIG = {
    // Desarrollo: SQLite persistente en archivo
    development: {
        type: 'sqlite',
        filename: path.join(__dirname, process.env.DATABASE_NAME || 'bets.db'),
        options: { verbose: true }
    },

    // Producción: usar variables de entorno o configuración específica
    production: {
        type: process.env.DATABASE_TYPE || 'sqlite',
        filename: process.env.DATABASE_PATH || path.join(__dirname, 'production.db'),
        postgresql: {
            host: process.env.PG_HOST || 'localhost',
            port: process.env.PG_PORT || 5432,
            database: process.env.PG_DATABASE || 'cuadribet_prod',
            username: process.env.PG_USER,
            password: process.env.PG_PASSWORD,
            ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : false
        },
        mysql: {
            host: process.env.MYSQL_HOST || 'localhost',
            port: process.env.MYSQL_PORT || 3306,
            database: process.env.MYSQL_DATABASE || 'cuadribet_prod',
            username: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD
        }
    }
};

const config = DATABASE_CONFIG[process.env.NODE_ENV || 'development'];

// Inicializar base de datos según configuración
let db;

if (config.type === 'sqlite') {
    db = new sqlite3.Database(config.filename, (err) => {
        if (err) {
            console.error('❌ Error opening SQLite database:', err.message);
            process.exit(1);
        } else {
            console.log(`✅ Connected to SQLite database: ${config.filename}`);
            initializeDatabase();
        }
    });
} else {
    console.error('❌ Database type not supported in configuration');
    process.exit(1);
}

// Enable foreign key constraints
db.run('PRAGMA foreign_keys = ON');

// Initialize database with tables
function initializeDatabase() {
    const tables = [
        // Users table
        `CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,

        // Groups table
        `CREATE TABLE IF NOT EXISTS groups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            invite_code TEXT UNIQUE NOT NULL,
            created_by INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (created_by) REFERENCES users(id)
        )`,

        // Group members table (many-to-many between users and groups)
        `CREATE TABLE IF NOT EXISTS group_members (
            group_id INTEGER,
            user_id INTEGER,
            joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (group_id, user_id),
            FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )`,

        // Bets table
        `CREATE TABLE IF NOT EXISTS bets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            group_id INTEGER NOT NULL,
            description TEXT NOT NULL,
            deadline DATETIME NOT NULL,
            stake TEXT NOT NULL,
            created_by INTEGER NOT NULL,
            status TEXT CHECK(status IN ('pending', 'completed', 'cancelled')) DEFAULT 'pending',
            result TEXT CHECK(result IN ('won', 'lost', NULL)),
            completed_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            emoji TEXT,
            FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
            FOREIGN KEY (created_by) REFERENCES users(id)
        )`,

        // Bet votes table
        `CREATE TABLE IF NOT EXISTS bet_votes (
            bet_id INTEGER,
            user_id INTEGER,
            vote TEXT CHECK(vote IN ('favor', 'contra')) NOT NULL,
            voted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (bet_id, user_id),
            FOREIGN KEY (bet_id) REFERENCES bets(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )`,

        // Bet comments table
        `CREATE TABLE IF NOT EXISTS bet_comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bet_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            comment TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (bet_id) REFERENCES bets(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )`
    ];

    tables.forEach(sql => {
        db.run(sql, (err) => {
            if (err) {
                console.error('Error creating table:', err.message);
            }
        });
    });
}

module.exports = db;
