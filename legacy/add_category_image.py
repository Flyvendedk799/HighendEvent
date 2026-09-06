"""
Migration script to add image_url column to categories table.
Run this once to update the database schema.
"""
from app import create_app, db
from sqlalchemy import text

def add_category_image_column():
    """Add image_url column to categories table."""
    app = create_app()
    
    with app.app_context():
        try:
            # Check if column already exists
            inspector = db.inspect(db.engine)
            columns = [col['name'] for col in inspector.get_columns('categories')]
            
            if 'image_url' in columns:
                print("✅ Column 'image_url' already exists in categories table")
                return
            
            # Add the column
            with db.engine.connect() as conn:
                conn.execute(text("""
                    ALTER TABLE categories 
                    ADD COLUMN image_url VARCHAR(500) NULL
                """))
                conn.commit()
            
            print("✅ Successfully added 'image_url' column to categories table")
            
        except Exception as e:
            print(f"❌ Error adding column: {e}")
            raise

if __name__ == '__main__':
    add_category_image_column()

