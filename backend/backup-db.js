const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Script de backup y recuperación de base de datos para mantener persistencia

const DATABASE_PATH = path.join(__dirname, process.env.DATABASE_NAME || 'bets.db');
const BACKUP_DIR = path.join(__dirname, 'backups');

// Asegurar que el directorio de backups existe
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR);
}

function backupDatabase() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(BACKUP_DIR, `cuadribet_backup_${timestamp}.db`);

    return new Promise((resolve, reject) => {
        if (!fs.existsSync(DATABASE_PATH)) {
            console.log('❗ No hay base de datos para respaldar');
            return resolve(null);
        }

        try {
            fs.copyFileSync(DATABASE_PATH, backupPath);
            console.log(`✅ Backup creado: ${backupPath}`);
            resolve(backupPath);
        } catch (error) {
            console.error('❌ Error creando backup:', error);
            reject(error);
        }
    });
}

function listBackups() {
    try {
        const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.db'));
        console.log('\n📋 BACKUPS DISPONIBLES:');
        console.log('='.repeat(50));

        files.sort().reverse().forEach((file, index) => {
            const filePath = path.join(BACKUP_DIR, file);
            const stats = fs.statSync(filePath);
            const sizeKB = (stats.size / 1024).toFixed(1);
            console.log(`${index + 1}. ${file} (${sizeKB} KB) - ${stats.mtime.toLocaleString()}`);
        });

        if (files.length === 0) {
            console.log('No hay backups disponibles');
        }
    } catch (error) {
        console.log('No se pudieron listar los backups');
    }
}

function restoreFromBackup(backupIndex) {
    try {
        const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.db')).sort().reverse();
        const selectedBackup = files[backupIndex - 1];

        if (!selectedBackup) {
            console.error(`❌ Backup #${backupIndex} no encontrado`);
            listBackups();
            return;
        }

        const backupPath = path.join(BACKUP_DIR, selectedBackup);

        // Crear backup del estado actual antes de restaurar
        if (fs.existsSync(DATABASE_PATH)) {
            const tempBackup = path.join(BACKUP_DIR, `pre_restore_backup_${Date.now()}.db`);
            fs.copyFileSync(DATABASE_PATH, tempBackup);
            console.log(`📋 Estado actual respaldado como: pre_restore_backup`);
        }

        // Restaurar desde el backup seleccionado
        fs.copyFileSync(backupPath, DATABASE_PATH);
        console.log(`✅ Base de datos restaurada desde: ${selectedBackup}`);

    } catch (error) {
        console.error('❌ Error restaurando backup:', error);
        process.exit(1);
    }
}

// Ejecutar según argumentos de línea de comando
const command = process.argv[2];
const arg = process.argv[3];

switch (command) {
    case 'backup':
        backupDatabase().catch(console.error);
        break;

    case 'list':
        listBackups();
        break;

    case 'restore':
        const index = parseInt(arg);
        if (!index) {
            console.log('Uso: node backup-db.js restore <número de backup>');
            console.log('Ejemplo: node backup-db.js restore 1');
            console.log('');
            listBackups();
        } else {
            restoreFromBackup(index);
        }
        break;

    case 'auto':
        // Auto-backup diario (decidir según necesidades)
        backupDatabase().catch(console.error);
        break;

    case 'info':
        console.log('ℹ️  SISTEMA DE BACKUPS DE CUADRIBET');
        console.log('');
        console.log('Comandos disponibles:');
        console.log('  backup     - Crear nuevo backup');
        console.log('  list       - Listar backups disponibles');
        console.log('  restore N  - Restaurar desde backup número N');
        console.log('');
        console.log('Uso: node backup-db.js <comando>');
        console.log('');
        listBackups();
        break;

    default:
        console.log('CuadriBET - Herramienta de Backup de Base de Datos');
        console.log('');
        console.log('Uso: node backup-db.js <comando>');
        console.log('');
        console.log('Comandos:');
        console.log('  backup     - Crear backup manual');
        console.log('  list       - Listar backups');
        console.log('  restore N  - Restaurar backup N');
        console.log('  info       - Información completa');
        console.log('');
        console.log('Ejemplos:');
        console.log('  npm run backup-db    # Crear backup');
        console.log('  npm run backup-db list');
        console.log('  npm run backup-db restore 1');
}

module.exports = { backupDatabase, listBackups, restoreFromBackup };
