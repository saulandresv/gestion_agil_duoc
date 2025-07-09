#!/usr/bin/env node
/**
 * User Creation Script for Inventario System (Node.js)
 * 
 * Creates new users in the SQLite database with hashed passwords.
 * Usage: node createUser.js <username> <password> [options]
 * 
 * Examples:
 *   node createUser.js admin secret123 --full-name "Admin User" --role admin
 *   node createUser.js operator pass456 --full-name "John Doe" --role operador
 *   node createUser.js --list-shifts
 */

const Database = require('./sqlite-stub');
const bcrypt = require('bcrypt');
const { program } = require('commander');

// Database configuration
const dbPath = process.env.DB_PATH || './inventario.db';
const db = new Database(dbPath);

const VALID_ROLES = ['admin', 'operador', 'supervisor', 'storekeeper'];

/**
 * Generate password hash using bcrypt
 */
async function hashPassword(password) {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
}

/**
 * Check if username already exists
 */
function checkUserExists(username) {
    const users = db.prepare('SELECT id FROM users WHERE username = ?').all(username);
    return users.length > 0;
}

/**
 * Get available shifts
 */
function getShifts() {
    try {
        const shifts = db.prepare('SELECT id, code, start_time, end_time FROM shifts ORDER BY id').all();
        return shifts;
    } catch (error) {
        console.error('Error getting shifts:', error.message);
        return [];
    }
}

/**
 * Create a new user in the database
 */
async function createUser(username, password, options = {}) {
    const { fullName, role = 'operador', shiftId } = options;
    
    // Validate role
    if (!VALID_ROLES.includes(role)) {
        console.error(`Error: Invalid role '${role}'. Valid roles: ${VALID_ROLES.join(', ')}`);
        return false;
    }
    
    // Generate full name if not provided
    const userFullName = fullName || username.replace('.', ' ').replace(/\w\S*/g, (txt) => 
        txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
    
    // Check if user exists
    if (checkUserExists(username)) {
        console.error(`Error: User '${username}' already exists`);
        return false;
    }
    
    // Validate shift if provided
    if (shiftId) {
        const shifts = db.prepare('SELECT id FROM shifts WHERE id = ?').all(shiftId);
        if (shifts.length === 0) {
            console.error(`Error: Shift ID ${shiftId} does not exist`);
            return false;
        }
    }
    
    try {
        // Hash password
        const passwordHash = await hashPassword(password);
        
        // Insert new user
        const result = db.prepare(`
            INSERT INTO users (username, full_name, password_hash, role, shift_id, created_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'))
        `).run(username, userFullName, passwordHash, role, shiftId || null);
        
        // Get the created user
        const newUser = db.prepare('SELECT * FROM users WHERE id = ?').all(result.lastInsertRowid)[0];
        
        console.log('✅ User created successfully:');
        console.log(`   ID: ${newUser.id}`);
        console.log(`   Username: ${newUser.username}`);
        console.log(`   Full Name: ${newUser.full_name}`);
        console.log(`   Role: ${newUser.role}`);
        console.log(`   Shift ID: ${newUser.shift_id || 'None'}`);
        
        return true;
        
    } catch (error) {
        console.error('Error creating user:', error.message);
        return false;
    }
}

/**
 * List available shifts
 */
function listShifts() {
    try {
        const shifts = getShifts();
        
        if (shifts.length > 0) {
            console.log('\nAvailable shifts:');
            shifts.forEach(shift => {
                console.log(`  ID ${shift.id}: ${shift.code} (${shift.start_time} - ${shift.end_time})`);
            });
        } else {
            console.log('No shifts found in database');
        }
        
    } catch (error) {
        console.error('Error retrieving shifts:', error.message);
    }
}

/**
 * List existing users
 */
function listUsers() {
    try {
        const users = db.prepare('SELECT id, username, full_name, role, shift_id FROM users ORDER BY id').all();
        
        if (users.length > 0) {
            console.log('\nExisting users:');
            users.forEach(user => {
                console.log(`  ID ${user.id}: ${user.username} (${user.full_name}) - Role: ${user.role}, Shift: ${user.shift_id || 'None'}`);
            });
        } else {
            console.log('No users found in database');
        }
        
    } catch (error) {
        console.error('Error retrieving users:', error.message);
    }
}

/**
 * Main function
 */
async function main() {
    program
        .name('createUser')
        .description('Create a new user in the inventario system')
        .version('1.0.0');

    program
        .argument('[username]', 'Username for the new user')
        .argument('[password]', 'Password for the new user')
        .option('-n, --full-name <name>', 'Full name of the user')
        .option('-r, --role <role>', 'User role (admin, operador, supervisor, storekeeper)', 'operador')
        .option('-s, --shift <id>', 'Shift ID (optional)', parseInt)
        .option('--list-shifts', 'List available shifts and exit')
        .option('--list-users', 'List existing users and exit')
        .action(async (username, password, options) => {
            // Handle list options
            if (options.listShifts) {
                listShifts();
                return;
            }
            
            if (options.listUsers) {
                listUsers();
                return;
            }
            
            // Validate required arguments
            if (!username || !password) {
                console.error('Error: Username and password are required unless using --list-shifts or --list-users');
                process.exit(1);
            }
            
            // Validate password strength
            if (password.length < 6) {
                console.error('Error: Password must be at least 6 characters long');
                process.exit(1);
            }
            
            // Create user
            const success = await createUser(username, password, {
                fullName: options.fullName,
                role: options.role,
                shiftId: options.shift
            });
            
            if (success) {
                console.log(`\n💡 User can now login with username '${username}' and the provided password`);
                process.exit(0);
            } else {
                process.exit(1);
            }
        });

    program.parse();
}

// Run the script
if (require.main === module) {
    main().catch(error => {
        console.error('Unexpected error:', error);
        process.exit(1);
    });
}

module.exports = { createUser, listUsers, listShifts };