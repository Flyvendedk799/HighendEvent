"""Add weekend discount field to products table."""

import sys
import os

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def migrate():
    """Add weekend_discount_dkk field for full weekend pricing."""
    try:
        # Import and create app
        from app import create_app
        from config import Config
        
        app = create_app(Config)
        with app.app_context():
            from app import db
            from sqlalchemy import text, inspect
            
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
                    
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        print("Trying alternative approach...")
        
        # Alternative: Direct database connection
        try:
            from sqlalchemy import create_engine, text, inspect
            
            # Try to get database URI from environment or use default
            import os
            database_url = os.environ.get('DATABASE_URL', 'sqlite:///instance/app.db')
            
            engine = create_engine(database_url)
            
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
                    
        except Exception as e2:
            print(f"❌ Alternative approach also failed: {e2}")
            raise

if __name__ == '__main__':
    try:
        migrate()
        print("\n🎉 Migration completed successfully!")
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        sys.exit(1)