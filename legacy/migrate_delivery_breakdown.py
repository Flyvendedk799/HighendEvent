#!/usr/bin/env python3
"""Migration script to add delivery_breakdown field to bookings table."""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.models import db
from sqlalchemy import text

def migrate_delivery_breakdown():
    """Add delivery_breakdown field to bookings table."""
    app = create_app()
    
    with app.app_context():
        try:
            print("🔍 Checking if delivery_breakdown column exists...")
            
            # Check if column already exists
            result = db.session.execute(text("""
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'bookings' 
                AND COLUMN_NAME = 'delivery_breakdown'
            """))
            
            if result.fetchone():
                print("✅ delivery_breakdown column already exists, skipping migration")
                return
            
            print("📝 Adding delivery_breakdown column to bookings table...")
            
            # Add the new column
            db.session.execute(text("""
                ALTER TABLE bookings 
                ADD COLUMN delivery_breakdown JSON NULL 
                AFTER delivery_fee_dkk
            """))
            
            db.session.commit()
            print("✅ Successfully added delivery_breakdown column to bookings table")
            
        except Exception as e:
            print(f"❌ Error during migration: {e}")
            db.session.rollback()
            raise

if __name__ == "__main__":
    migrate_delivery_breakdown()
