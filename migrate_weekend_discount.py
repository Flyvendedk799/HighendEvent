"""Add weekend discount field to products table."""

import sys
import os
from sqlalchemy import create_engine, text, inspect

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from config import Config

def migrate():
    """Add weekend_discount_dkk field for full weekend pricing."""
    # Create app context to get database URI
    app = create_app(Config)
    with app.app_context():
        from app import db
        engine = db.engine
    
        with engine.connect() as conn:
            inspector = inspect(engine)
            columns = [col['name'] for col in inspector.get_columns('products')]
            
            # Add weekend_discount_dkk column if it doesn't exist
            if 'weekend_discount_dkk' not in columns:
                print("Adding weekend_discount_dkk column...")
                conn.execute(text("""
                    ALTER TABLE products 
                    ADD COLUMN weekend_discount_dkk DECIMAL(10, 2) DEFAULT NULL
                """))
                conn.commit()
                print("✅ weekend_discount_dkk column added")
            else:
                print("✅ weekend_discount_dkk column already exists")

if __name__ == '__main__':
    try:
        migrate()
        print("\n🎉 Migration completed successfully!")
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        sys.exit(1)

