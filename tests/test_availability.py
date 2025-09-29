"""Tests for availability service."""

import pytest
from datetime import date, timedelta
from decimal import Decimal

from app import create_app, db
from app.models import Product, Category, Booking, BookingItem, BookingStatus, BlackoutDate
from app.services.availability import AvailabilityService


@pytest.fixture
def app():
    """Create test application."""
    app = create_app('testing')
    with app.app_context():
        db.create_all()
        yield app
        db.drop_all()


@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()


@pytest.fixture
def availability_service(app):
    """Create availability service."""
    return AvailabilityService(db.session)


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
        stock_qty=2,
        prep_buffer_days=1,
        cleanup_buffer_days=1,
        is_active=True
    )
    db.session.add(product)
    db.session.commit()
    
    return product


def test_available_quantity_no_bookings(availability_service, sample_product):
    """Test available quantity when no bookings exist."""
    start_date = date.today() + timedelta(days=7)
    end_date = start_date
    
    available_qty = availability_service.available_quantity(
        sample_product.id, start_date, end_date
    )
    
    assert available_qty == sample_product.stock_qty


def test_available_quantity_with_booking(availability_service, sample_product):
    """Test available quantity with existing booking."""
    start_date = date.today() + timedelta(days=7)
    end_date = start_date
    
    # Create a booking
    booking = Booking(
        booking_no='TEST-001',
        customer_name='Test Customer',
        email='test@example.com',
        phone='12345678',
        address='Test Address',
        zip_code='1234',
        city='Test City',
        start_date=start_date,
        end_date=end_date,
        subtotal_dkk=Decimal('100.00'),
        vat_dkk=Decimal('25.00'),
        deposit_dkk=Decimal('0.00'),
        delivery_fee_dkk=Decimal('0.00'),
        total_dkk=Decimal('125.00'),
        status=BookingStatus.PAID
    )
    db.session.add(booking)
    db.session.flush()
    
    # Add booking item
    booking_item = BookingItem(
        booking_id=booking.id,
        product_id=sample_product.id,
        quantity=1,
        unit_price_dkk=Decimal('100.00'),
        name_snapshot='Test Product'
    )
    db.session.add(booking_item)
    db.session.commit()
    
    # Check availability
    available_qty = availability_service.available_quantity(
        sample_product.id, start_date, end_date
    )
    
    assert available_qty == sample_product.stock_qty - 1


def test_available_quantity_with_buffer_days(availability_service, sample_product):
    """Test available quantity with buffer days."""
    start_date = date.today() + timedelta(days=7)
    end_date = start_date
    
    # Create a booking that overlaps with buffer days
    booking_start = start_date - timedelta(days=1)  # Within prep buffer
    booking = Booking(
        booking_no='TEST-002',
        customer_name='Test Customer',
        email='test@example.com',
        phone='12345678',
        address='Test Address',
        zip_code='1234',
        city='Test City',
        start_date=booking_start,
        end_date=booking_start,
        subtotal_dkk=Decimal('100.00'),
        vat_dkk=Decimal('25.00'),
        deposit_dkk=Decimal('0.00'),
        delivery_fee_dkk=Decimal('0.00'),
        total_dkk=Decimal('125.00'),
        status=BookingStatus.PAID
    )
    db.session.add(booking)
    db.session.flush()
    
    # Add booking item
    booking_item = BookingItem(
        booking_id=booking.id,
        product_id=sample_product.id,
        quantity=1,
        unit_price_dkk=Decimal('100.00'),
        name_snapshot='Test Product'
    )
    db.session.add(booking_item)
    db.session.commit()
    
    # Check availability - should be reduced due to buffer overlap
    available_qty = availability_service.available_quantity(
        sample_product.id, start_date, end_date
    )
    
    assert available_qty == sample_product.stock_qty - 1


def test_available_quantity_with_blackout_date(availability_service, sample_product):
    """Test available quantity with blackout date."""
    start_date = date.today() + timedelta(days=7)
    end_date = start_date
    
    # Create blackout date
    blackout = BlackoutDate(
        product_id=sample_product.id,
        start_date=start_date,
        end_date=end_date,
        reason='Maintenance'
    )
    db.session.add(blackout)
    db.session.commit()
    
    # Check availability - should be 0 due to blackout
    available_qty = availability_service.available_quantity(
        sample_product.id, start_date, end_date
    )
    
    assert available_qty == 0


def test_is_available(availability_service, sample_product):
    """Test is_available method."""
    start_date = date.today() + timedelta(days=7)
    end_date = start_date
    
    # Should be available initially
    assert availability_service.is_available(
        sample_product.id, start_date, end_date, 1
    ) is True
    
    # Should not be available for more than stock
    assert availability_service.is_available(
        sample_product.id, start_date, end_date, sample_product.stock_qty + 1
    ) is False


def test_get_availability_calendar(availability_service, sample_product):
    """Test availability calendar generation."""
    start_date = date.today() + timedelta(days=7)
    end_date = start_date + timedelta(days=2)
    
    calendar_data = availability_service.get_availability_calendar(
        sample_product.id, start_date, end_date
    )
    
    assert len(calendar_data) == 3  # 3 days
    assert all('date' in day for day in calendar_data)
    assert all('available_quantity' in day for day in calendar_data)
    assert all('is_available' in day for day in calendar_data)
    assert all('is_blacked_out' in day for day in calendar_data)



