"""Add weekend discount field to products table."""

import sys
from sqlalchemy import create_engine, text, inspect
from config import Config

def migrate():
    """Add weekend_discount_dkk field for full weekend pricing."""
    engine = create_engine(Config.SQLALCHEMY_DATABASE_URI)
    
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

