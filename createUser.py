#!/usr/bin/env python3
"""
User Creation Script for Inventario System

Creates new users in the PostgreSQL database with hashed passwords.
Usage: python createUser.py <username> <password> [--full-name "Full Name"] [--role role] [--shift shift_id]

Example:
  python createUser.py admin secret123 --full-name "Admin User" --role admin
  python createUser.py operator pass456 --full-name "John Doe" --role operador --shift 1
"""

import sys
import os
import argparse
import bcrypt
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database configuration
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': os.getenv('DB_PORT', '5432'),
    'database': os.getenv('DB_NAME', 'inventario'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASS', '')
}

VALID_ROLES = ['admin', 'operador', 'supervisor', 'storekeeper']

def hash_password(password):
    """Generate password hash using bcrypt"""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def get_db_connection():
    """Create database connection"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        return conn
    except psycopg2.Error as e:
        print(f"Error connecting to database: {e}")
        sys.exit(1)

def check_user_exists(cursor, username):
    """Check if username already exists"""
    cursor.execute("SELECT id FROM users WHERE username = %s", (username,))
    return cursor.fetchone() is not None

def get_shifts(cursor):
    """Get available shifts"""
    cursor.execute("SELECT id, code, start_time, end_time FROM shifts ORDER BY id")
    return cursor.fetchall()

def create_user(username, password, full_name=None, role='operador', shift_id=None):
    """Create a new user in the database"""
    
    # Validate role
    if role not in VALID_ROLES:
        print(f"Error: Invalid role '{role}'. Valid roles: {', '.join(VALID_ROLES)}")
        return False
    
    # Generate full name if not provided
    if not full_name:
        full_name = username.replace('.', ' ').title()
    
    # Hash password
    password_hash = hash_password(password)
    
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            # Check if user exists
            if check_user_exists(cursor, username):
                print(f"Error: User '{username}' already exists")
                return False
            
            # Validate shift if provided
            if shift_id:
                cursor.execute("SELECT id FROM shifts WHERE id = %s", (shift_id,))
                if not cursor.fetchone():
                    print(f"Error: Shift ID {shift_id} does not exist")
                    return False
            
            # Insert new user
            insert_query = """
                INSERT INTO users (username, full_name, password_hash, role, shift_id, created_at)
                VALUES (%s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
                RETURNING id, username, full_name, role, shift_id
            """
            
            cursor.execute(insert_query, (username, full_name, password_hash, role, shift_id))
            new_user = cursor.fetchone()
            
            conn.commit()
            
            print(f"✅ User created successfully:")
            print(f"   ID: {new_user['id']}")
            print(f"   Username: {new_user['username']}")
            print(f"   Full Name: {new_user['full_name']}")
            print(f"   Role: {new_user['role']}")
            print(f"   Shift ID: {new_user['shift_id'] or 'None'}")
            
            return True
            
    except psycopg2.Error as e:
        conn.rollback()
        print(f"Error creating user: {e}")
        return False
    finally:
        conn.close()

def list_shifts():
    """List available shifts"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            shifts = get_shifts(cursor)
            
            if shifts:
                print("\nAvailable shifts:")
                for shift in shifts:
                    print(f"  ID {shift['id']}: {shift['code']} ({shift['start_time']} - {shift['end_time']})")
            else:
                print("No shifts found in database")
                
    except psycopg2.Error as e:
        print(f"Error retrieving shifts: {e}")
    finally:
        conn.close()

def main():
    parser = argparse.ArgumentParser(
        description='Create a new user in the inventario system',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s admin secret123 --full-name "Admin User" --role admin
  %(prog)s john.doe password --full-name "John Doe" --role operador --shift 1
  %(prog)s supervisor pass456 --role supervisor
  %(prog)s --list-shifts
        """
    )
    
    parser.add_argument('username', nargs='?', help='Username for the new user')
    parser.add_argument('password', nargs='?', help='Password for the new user')
    parser.add_argument('--full-name', '-n', help='Full name of the user')
    parser.add_argument('--role', '-r', choices=VALID_ROLES, default='operador', 
                       help='User role (default: operador)')
    parser.add_argument('--shift', '-s', type=int, help='Shift ID (optional)')
    parser.add_argument('--list-shifts', action='store_true', 
                       help='List available shifts and exit')
    
    args = parser.parse_args()
    
    # Handle list shifts option
    if args.list_shifts:
        list_shifts()
        return
    
    # Validate required arguments
    if not args.username or not args.password:
        parser.error('Username and password are required unless using --list-shifts')
    
    # Validate password strength
    if len(args.password) < 6:
        print("Error: Password must be at least 6 characters long")
        sys.exit(1)
    
    # Create user
    success = create_user(
        username=args.username,
        password=args.password,
        full_name=args.full_name,
        role=args.role,
        shift_id=args.shift
    )
    
    if success:
        print(f"\n💡 User can now login with username '{args.username}' and the provided password")
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == '__main__':
    main()