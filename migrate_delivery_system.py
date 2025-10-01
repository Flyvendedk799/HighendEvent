#!/usr/bin/env python3
"""
Database migration script for delivery system enhancements.
Adds company locations table and enhances delivery settings.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models import CompanyLocation, DeliverySetting
from decimal import Decimal

def migrate_delivery_system():
    """Run the delivery system migration."""
    app = create_app()
    
    with app.app_context():
        print("🚀 Starting delivery system migration...")
        
        try:
            # Create new tables
            print("📋 Creating company_locations table...")
            db.create_all()
            
            # Check if we need to add new columns to delivery_settings
            print("🔍 Checking delivery_settings table structure...")
            
            # Add new columns to delivery_settings if they don't exist
            try:
                # Try to add the new columns using text() for SQLAlchemy 2.0 compatibility
                from sqlalchemy import text
                db.session.execute(text("""
                    ALTER TABLE delivery_settings 
                    ADD COLUMN free_delivery_km INT DEFAULT 0 NOT NULL,
                    ADD COLUMN max_delivery_km INT NULL,
                    ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                """))
                db.session.commit()
                print("✅ Added new columns to delivery_settings table")
            except Exception as e:
                if "Duplicate column name" in str(e):
                    print("ℹ️  New columns already exist in delivery_settings table")
                else:
                    print(f"⚠️  Warning adding columns to delivery_settings: {e}")
                    db.session.rollback()
            
            # Create default company location if none exists
            existing_locations = CompanyLocation.query.count()
            if existing_locations == 0:
                print("🏢 Creating default company location...")
                default_location = CompanyLocation(
                    name="HighendEvent Hovedkontor",
                    address="Hovedgade 123",
                    zip_code="2100",
                    city="København Ø",
                    latitude=55.6761,  # Copenhagen coordinates
                    longitude=12.5683,
                    is_primary=True,
                    is_active=True
                )
                db.session.add(default_location)
                print("✅ Created default company location")
            else:
                print(f"ℹ️  Found {existing_locations} existing company locations")
            
            # Create default delivery settings if none exist
            # Use raw SQL to check count to avoid model column issues
            from sqlalchemy import text
            result = db.session.execute(text("SELECT COUNT(*) FROM delivery_settings"))
            existing_delivery_settings = result.scalar()
            if existing_delivery_settings == 0:
                print("🚚 Creating default delivery settings...")
                
                # Pickup setting
                pickup_setting = DeliverySetting(
                    type='pickup',
                    base_fee_dkk=Decimal('0.00'),
                    per_km_fee_dkk=Decimal('0.00'),
                    free_delivery_km=0,
                    max_delivery_km=None,
                    notes="Gratis afhentning",
                    is_active=True
                )
                db.session.add(pickup_setting)
                
                # Delivery setting
                delivery_setting = DeliverySetting(
                    type='delivery',
                    base_fee_dkk=Decimal('150.00'),
                    per_km_fee_dkk=Decimal('5.00'),
                    free_delivery_km=10,  # Free delivery within 10 km
                    max_delivery_km=50,   # Max delivery 50 km
                    notes="Levering i hovedstadsområdet",
                    is_active=True
                )
                db.session.add(delivery_setting)
                
                print("✅ Created default delivery settings")
            else:
                print(f"ℹ️  Found {existing_delivery_settings} existing delivery settings")
            
            # Commit all changes
            db.session.commit()
            print("✅ Migration completed successfully!")
            
            # Show summary
            locations = CompanyLocation.query.all()
            
            print("\n📊 Migration Summary:")
            print(f"   🏢 Company locations: {len(locations)}")
            for loc in locations:
                print(f"      - {loc.name} ({loc.city}) {'[PRIMARY]' if loc.is_primary else ''}")
            
            # Use raw SQL for delivery settings summary to avoid column issues
            delivery_result = db.session.execute(text("SELECT type, base_fee_dkk, per_km_fee_dkk, free_delivery_km, max_delivery_km FROM delivery_settings"))
            delivery_settings = delivery_result.fetchall()
            print(f"   🚚 Delivery settings: {len(delivery_settings)}")
            for setting in delivery_settings:
                print(f"      - {setting[0]}: {setting[1]} DKK + {setting[2]} DKK/km")
                if setting[3] and setting[3] > 0:
                    print(f"        Gratis inden for {setting[3]} km")
                if setting[4]:
                    print(f"        Maksimal afstand: {setting[4]} km")
            
        except Exception as e:
            print(f"❌ Migration failed: {e}")
            db.session.rollback()
            raise

if __name__ == "__main__":
    migrate_delivery_system()
