#!/usr/bin/env python3
"""
Add delivery settings to production database.
Run this script on PythonAnywhere to add missing delivery settings.
"""

import os
from decimal import Decimal
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Set production environment
os.environ['FLASK_ENV'] = 'production'

from app import create_app, db
from app.models import DeliverySetting, DeliveryType

def add_delivery_settings():
    """Add delivery settings to the database."""
    app = create_app()
    
    with app.app_context():
        # Check if delivery settings already exist
        existing_pickup = DeliverySetting.query.filter_by(type=DeliveryType.PICKUP).first()
        existing_delivery = DeliverySetting.query.filter_by(type=DeliveryType.DELIVERY).first()
        
        if existing_pickup and existing_delivery:
            print("✅ Delivery settings already exist:")
            print(f"   📦 Pickup: {existing_pickup.base_fee_dkk} DKK base fee")
            print(f"   🚚 Delivery: {existing_delivery.base_fee_dkk} DKK base fee + {existing_delivery.per_km_fee_dkk} DKK/km")
            return
        
        # Create delivery settings
        delivery_settings = []
        
        if not existing_pickup:
            pickup_setting = DeliverySetting(
                type=DeliveryType.PICKUP,
                base_fee_dkk=Decimal('0.00'),
                per_km_fee_dkk=Decimal('0.00'),
                notes='Gratis afhentning i vores lokaler',
                is_active=True
            )
            delivery_settings.append(pickup_setting)
            print("✅ Created pickup setting (0 DKK)")
        
        if not existing_delivery:
            delivery_setting = DeliverySetting(
                type=DeliveryType.DELIVERY,
                base_fee_dkk=Decimal('150.00'),
                per_km_fee_dkk=Decimal('5.00'),
                notes='Levering inden for 20 km radius',
                is_active=True
            )
            delivery_settings.append(delivery_setting)
            print("✅ Created delivery setting (150 DKK base + 5 DKK/km)")
        
        # Add to database
        for setting in delivery_settings:
            db.session.add(setting)
        
        db.session.commit()
        print("🎉 Delivery settings added successfully!")
        
        # Verify
        pickup = DeliverySetting.query.filter_by(type=DeliveryType.PICKUP).first()
        delivery = DeliverySetting.query.filter_by(type=DeliveryType.DELIVERY).first()
        
        print("\n📋 Current delivery settings:")
        print(f"   📦 Pickup: {pickup.base_fee_dkk} DKK (Active: {pickup.is_active})")
        print(f"   🚚 Delivery: {delivery.base_fee_dkk} DKK base + {delivery.per_km_fee_dkk} DKK/km (Active: {delivery.is_active})")

if __name__ == '__main__':
    add_delivery_settings()
