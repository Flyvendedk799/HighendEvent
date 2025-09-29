"""Tests for pricing service."""

import pytest
from datetime import date, timedelta
from decimal import Decimal

from app import create_app, db
from app.models import Product, Category, DeliverySetting, DeliveryType
from app.services.pricing import PricingService, BookingItemDTO


@pytest.fixture
def app():
    """Create test application."""
    app = create_app('testing')
    with app.app_context():
        db.create_all()
        yield app
        db.drop_all()


@pytest.fixture
def pricing_service(app):
    """Create pricing service."""
    return PricingService(db.session, Decimal('25'))


@pytest.fixture
def sample_product(app):
    """Create sample product for testing."""
    category = Category(
        name='Test Category',
        slug='test-category',
        is_active=True
    )
    db.session.add(category)
    db.session.flush()
    
    product = Product(
        name='Test Product',
        slug='test-product',
        category_id=category.id,
        daily_price_dkk=Decimal('100.00'),
        weekend_price_dkk=Decimal('150.00'),
        deposit_dkk=Decimal('200.00'),
        stock_qty=1,
        is_active=True
    )
    db.session.add(product)
    db.session.commit()
    
    return product


@pytest.fixture
def delivery_settings(app):
    """Create delivery settings for testing."""
    pickup_setting = DeliverySetting(
        type=DeliveryType.PICKUP,
        base_fee_dkk=Decimal('0.00'),
        per_km_fee_dkk=Decimal('0.00'),
        is_active=True
    )
    db.session.add(pickup_setting)
    
    delivery_setting = DeliverySetting(
        type=DeliveryType.DELIVERY,
        base_fee_dkk=Decimal('150.00'),
        per_km_fee_dkk=Decimal('5.00'),
        is_active=True
    )
    db.session.add(delivery_setting)
    db.session.commit()


def test_calculate_booking_pricing_weekday(pricing_service, sample_product, delivery_settings):
    """Test pricing calculation for weekday booking."""
    start_date = date(2024, 12, 2)  # Monday
    end_date = date(2024, 12, 4)    # Wednesday (3 days)
    
    booking_items = [
        BookingItemDTO(
            product_id=sample_product.id,
            product_name=sample_product.name,
            quantity=1,
            start_date=start_date,
            end_date=end_date,
            delivery_type=DeliveryType.PICKUP
        )
    ]
    
    pricing = pricing_service.calculate_booking_pricing(booking_items, DeliveryType.PICKUP)
    
    # 3 days * 100 DKK = 300 DKK
    assert pricing.subtotal == Decimal('300.00')
    # 25% VAT on 300 DKK = 75 DKK
    assert pricing.vat_amount == Decimal('75.00')
    # Deposit = 200 DKK
    assert pricing.deposit_amount == Decimal('200.00')
    # No delivery fee for pickup
    assert pricing.delivery_fee == Decimal('0.00')
    # Total = 300 + 75 + 200 + 0 = 575 DKK
    assert pricing.total == Decimal('575.00')


def test_calculate_booking_pricing_weekend(pricing_service, sample_product, delivery_settings):
    """Test pricing calculation for weekend booking."""
    start_date = date(2024, 12, 7)  # Saturday
    end_date = date(2024, 12, 8)    # Sunday (2 days)
    
    booking_items = [
        BookingItemDTO(
            product_id=sample_product.id,
            product_name=sample_product.name,
            quantity=1,
            start_date=start_date,
            end_date=end_date,
            delivery_type=DeliveryType.DELIVERY
        )
    ]
    
    pricing = pricing_service.calculate_booking_pricing(booking_items, DeliveryType.DELIVERY)
    
    # 2 days * 150 DKK (weekend price) = 300 DKK
    assert pricing.subtotal == Decimal('300.00')
    # 25% VAT on (300 + 150) = 112.50 DKK
    assert pricing.vat_amount == Decimal('112.50')
    # Deposit = 200 DKK
    assert pricing.deposit_amount == Decimal('200.00')
    # Delivery fee = 150 DKK
    assert pricing.delivery_fee == Decimal('150.00')
    # Total = 300 + 112.50 + 200 + 150 = 762.50 DKK
    assert pricing.total == Decimal('762.50')


def test_calculate_booking_pricing_mixed_weekdays_weekends(pricing_service, sample_product, delivery_settings):
    """Test pricing calculation for mixed weekdays and weekends."""
    start_date = date(2024, 12, 6)  # Friday
    end_date = date(2024, 12, 8)    # Sunday (3 days: Fri, Sat, Sun)
    
    booking_items = [
        BookingItemDTO(
            product_id=sample_product.id,
            product_name=sample_product.name,
            quantity=1,
            start_date=start_date,
            end_date=end_date,
            delivery_type=DeliveryType.PICKUP
        )
    ]
    
    pricing = pricing_service.calculate_booking_pricing(booking_items, DeliveryType.PICKUP)
    
    # 1 weekday * 100 DKK + 2 weekend days * 150 DKK = 400 DKK
    assert pricing.subtotal == Decimal('400.00')
    # 25% VAT on 400 DKK = 100 DKK
    assert pricing.vat_amount == Decimal('100.00')
    # Deposit = 200 DKK
    assert pricing.deposit_amount == Decimal('200.00')
    # No delivery fee for pickup
    assert pricing.delivery_fee == Decimal('0.00')
    # Total = 400 + 100 + 200 + 0 = 700 DKK
    assert pricing.total == Decimal('700.00')


def test_get_price_estimate(pricing_service, sample_product, delivery_settings):
    """Test price estimate generation."""
    start_date = date(2024, 12, 2)  # Monday
    end_date = date(2024, 12, 4)    # Wednesday (3 days)
    
    estimate = pricing_service.get_price_estimate(
        sample_product.id, start_date, end_date, 1, DeliveryType.PICKUP
    )
    
    assert 'subtotal' in estimate
    assert 'vat_amount' in estimate
    assert 'vat_percent' in estimate
    assert 'deposit_amount' in estimate
    assert 'delivery_fee' in estimate
    assert 'total' in estimate
    assert 'currency' in estimate
    assert 'line_items' in estimate
    
    assert estimate['currency'] == 'DKK'
    assert estimate['subtotal'] == 300.0  # 3 days * 100 DKK
    assert estimate['total'] == 575.0     # 300 + 75 + 200 + 0


def test_pricing_with_multiple_quantities(pricing_service, sample_product, delivery_settings):
    """Test pricing calculation with multiple quantities."""
    start_date = date(2024, 12, 2)  # Monday
    end_date = date(2024, 12, 2)    # Same day (1 day)
    
    booking_items = [
        BookingItemDTO(
            product_id=sample_product.id,
            product_name=sample_product.name,
            quantity=2,  # 2 units
            start_date=start_date,
            end_date=end_date,
            delivery_type=DeliveryType.PICKUP
        )
    ]
    
    pricing = pricing_service.calculate_booking_pricing(booking_items, DeliveryType.PICKUP)
    
    # 1 day * 100 DKK * 2 units = 200 DKK
    assert pricing.subtotal == Decimal('200.00')
    # 25% VAT on 200 DKK = 50 DKK
    assert pricing.vat_amount == Decimal('50.00')
    # Deposit = 200 DKK * 2 units = 400 DKK
    assert pricing.deposit_amount == Decimal('400.00')
    # No delivery fee for pickup
    assert pricing.delivery_fee == Decimal('0.00')
    # Total = 200 + 50 + 400 + 0 = 650 DKK
    assert pricing.total == Decimal('650.00')



