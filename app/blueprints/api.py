"""API blueprint for HTMX and AJAX endpoints."""

from flask import Blueprint, request, jsonify, current_app
from flask_login import login_required
from sqlalchemy.orm import Session
from datetime import datetime, date, timedelta
from decimal import Decimal

from app.models import Product, Booking, BookingItem, BookingStatus
from app.services.availability import AvailabilityService
from app.services.pricing import PricingService, BookingItemDTO, DeliveryType

bp = Blueprint('api', __name__)


@bp.route('/test')
def test_endpoint():
    """Test endpoint to check basic functionality."""
    try:
        db_session = current_app.extensions['sqlalchemy'].session
        from app.models import Product
        product_count = db_session.query(Product).count()
        return jsonify({'status': 'ok', 'product_count': product_count})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/test-calendar/<int:product_id>')
def test_calendar_endpoint(product_id):
    """Test calendar endpoint with basic data."""
    try:
        from app import db
        from datetime import date, timedelta
        
        # Get product
        product = db.session.query(Product).filter(Product.id == product_id, Product.is_active == True).first()
        if not product:
            return jsonify({'error': 'Product not found'}), 404
        
        # Return simple test data
        today = date.today()
        test_data = []
        for i in range(7):
            test_date = today + timedelta(days=i)
            test_data.append({
                'date': test_date.isoformat(),
                'available_quantity': product.stock_qty,
                'is_available': True,
                'is_blacked_out': False
            })
        
        return jsonify(test_data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/simple-calendar-data/<int:product_id>')
def simple_calendar_data(product_id):
    """Simple calendar data endpoint for debugging."""
    try:
        # Get query parameters
        start_str = request.args.get('start', '')
        end_str = request.args.get('end', '')
        
        print(f"DEBUG: Product ID: {product_id}")
        print(f"DEBUG: Start: {start_str}")
        print(f"DEBUG: End: {end_str}")
        
        # Return simple test data regardless of input
        from datetime import date, timedelta
        today = date.today()
        test_data = []
        for i in range(30):  # 30 days of test data
            test_date = today + timedelta(days=i)
            test_data.append({
                'date': test_date.isoformat(),
                'available_quantity': 5,
                'is_available': True,
                'is_blacked_out': False
            })
        
        print(f"DEBUG: Returning {len(test_data)} test records")
        return jsonify(test_data)
    except Exception as e:
        print(f"DEBUG: Error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@bp.route('/availability/<int:product_id>')
def check_availability(product_id):
    """Check product availability for given dates."""
    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')
    quantity = request.args.get('quantity', 1, type=int)
    exclude_booking_id = request.args.get('exclude_booking_id', type=int)
    
    if not start_date_str or not end_date_str:
        return jsonify({'error': 'Start and end dates required'}), 400
    
    try:
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Invalid date format'}), 400
    
    # Check availability
    db_session = current_app.extensions['sqlalchemy'].session
    availability_service = AvailabilityService(db_session)
    
    available_qty = availability_service.available_quantity(
        product_id, start_date, end_date, exclude_booking_id
    )
    
    is_available = available_qty >= quantity
    
    # Get conflicting bookings if not available
    conflicts = []
    if not is_available:
        conflicts = availability_service.get_conflicting_bookings(
            product_id, start_date, end_date, exclude_booking_id
        )
    
    return jsonify({
        'available_quantity': available_qty,
        'is_available': is_available,
        'requested_quantity': quantity,
        'conflicts': conflicts
    })


@bp.route('/price-estimate/<int:product_id>')
def get_price_estimate(product_id):
    """Get price estimate for product and dates."""
    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')
    quantity = request.args.get('quantity', 1, type=int)
    delivery_type = request.args.get('delivery_type', 'pickup')
    
    if not start_date_str or not end_date_str:
        return jsonify({'error': 'Start and end dates required'}), 400
    
    try:
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Invalid date format'}), 400
    
    # Get product
    product = Product.query.filter_by(id=product_id, is_active=True).first()
    if not product:
        return jsonify({'error': 'Product not found'}), 404
    
    # Calculate pricing
    db_session = current_app.extensions['sqlalchemy'].session
    pricing_service = PricingService(db_session, current_app.config['VAT_PERCENT'])
    
    delivery_type_enum = DeliveryType.PICKUP if delivery_type == 'pickup' else DeliveryType.DELIVERY
    
    price_estimate = pricing_service.get_price_estimate(
        product_id, start_date, end_date, quantity, delivery_type_enum
    )
    
    return jsonify(price_estimate)


@bp.route('/calendar-data/<int:product_id>')
def get_calendar_data(product_id):
    """Get calendar availability data for FullCalendar."""
    try:
        start_str = request.args.get('start')
        end_str = request.args.get('end')
        
        # Debug logging
        current_app.logger.info(f'Calendar data request - Product ID: {product_id}, Start: {start_str}, End: {end_str}')
        
        if not start_str or not end_str:
            return jsonify({'error': 'Start and end dates required'}), 400
        
        try:
            # Handle both simple date format and ISO format with timezone
            if 'T' in start_str:
                # ISO format with timezone: 2025-08-31T00:00:00+02:00
                # Remove timezone info and extract just the date part
                start_date_str = start_str.split('T')[0]
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            else:
                # Simple date format: 2025-08-31
                start_date = datetime.strptime(start_str, '%Y-%m-%d').date()
                
            if 'T' in end_str:
                # ISO format with timezone: 2025-10-12T00:00:00+02:00
                # Remove timezone info and extract just the date part
                end_date_str = end_str.split('T')[0]
                end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
            else:
                # Simple date format: 2025-10-12
                end_date = datetime.strptime(end_str, '%Y-%m-%d').date()
                
            current_app.logger.info(f'Parsed dates - Start: {start_date}, End: {end_date}')
        except ValueError as e:
            current_app.logger.error(f'Date parsing error: {str(e)}')
            return jsonify({'error': f'Invalid date format: {str(e)}'}), 400
        
        # Test database access and get availability data
        from app import db
        product = db.session.query(Product).filter(Product.id == product_id, Product.is_active == True).first()
        if not product:
            return jsonify({'error': 'Product not found or inactive'}), 404
        
        current_app.logger.info(f'Product found: {product.name}, Stock: {product.stock_qty}')
        
        # Get availability data using AvailabilityService
        try:
            availability_service = AvailabilityService(db.session)
            
            calendar_data = availability_service.get_availability_calendar(
                product_id, start_date, end_date
            )
            
            current_app.logger.info(f'Calendar data generated: {len(calendar_data)} days')
            return jsonify(calendar_data)
        except Exception as e:
            current_app.logger.error(f'Availability service error: {str(e)}')
            # Return simple test data if availability service fails
            from datetime import timedelta
            test_data = []
            current_date = start_date
            while current_date <= end_date:
                test_data.append({
                    'date': current_date.isoformat(),
                    'available_quantity': product.stock_qty,
                    'is_available': True,
                    'is_blacked_out': False
                })
                current_date += timedelta(days=1)
            return jsonify(test_data)
    except Exception as e:
        current_app.logger.error(f'Error in get_calendar_data: {str(e)}')
        import traceback
        current_app.logger.error(f'Traceback: {traceback.format_exc()}')
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500


@bp.route('/availability-check/<int:product_id>', methods=['POST'])
def check_availability_post(product_id):
    """Check availability for a specific product and date range."""
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    start_date_str = data.get('start_date')
    end_date_str = data.get('end_date')
    quantity = data.get('quantity', 1)
    
    if not start_date_str or not end_date_str:
        return jsonify({'error': 'Start and end dates required'}), 400
    
    try:
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Invalid date format'}), 400
    
    if start_date < date.today():
        return jsonify({
            'available': False,
            'message': 'Startdatoen skal være i dag eller senere'
        }), 400
    
    if end_date < start_date:
        return jsonify({
            'available': False,
            'message': 'Slutdatoen skal være efter startdatoen'
        }), 400
    
    # Get availability data
    db_session = current_app.extensions['sqlalchemy'].session
    availability_service = AvailabilityService(db_session)
    
    # Check if product exists and is active
    from app.models import Product
    product = db_session.query(Product).filter(
        Product.id == product_id,
        Product.is_active == True
    ).first()
    
    if not product:
        return jsonify({
            'available': False,
            'message': 'Produktet findes ikke eller er ikke aktivt'
        }), 404
    
    # Check availability
    is_available = availability_service.is_available(
        product_id, start_date, end_date, quantity
    )
    
    if is_available:
        available_quantity = availability_service.available_quantity(
            product_id, start_date, end_date
        )
        return jsonify({
            'available': True,
            'message': f'Produktet er tilgængeligt! {available_quantity} enheder tilgængelige.',
            'available_quantity': available_quantity,
            'product_name': product.name
        })
    else:
        # Get conflicting bookings for more detailed message
        conflicts = availability_service.get_conflicting_bookings(
            product_id, start_date, end_date
        )
        
        if conflicts:
            return jsonify({
                'available': False,
                'message': f'Produktet er ikke tilgængeligt i den valgte periode. Der er {len(conflicts)} konfliktende bookinger.',
                'conflicts': len(conflicts)
            })
        else:
            return jsonify({
                'available': False,
                'message': 'Produktet er ikke tilgængeligt i den valgte periode.'
            })


@bp.route('/products/search')
def search_products():
    """Search products for autocomplete."""
    query = request.args.get('q', '')
    limit = request.args.get('limit', 10, type=int)
    
    if not query or len(query) < 2:
        return jsonify([])
    
    products = Product.query.filter(
        Product.is_active == True,
        Product.name.contains(query)
    ).limit(limit).all()
    
    results = []
    for product in products:
        results.append({
            'id': product.id,
            'name': product.name,
            'slug': product.slug,
            'daily_price': float(product.daily_price_dkk),
            'category': product.category.name if product.category else None
        })
    
    return jsonify(results)


@bp.route('/bookings/search')
@login_required
def search_bookings():
    """Search bookings for admin."""
    query = request.args.get('q', '')
    limit = request.args.get('limit', 20, type=int)
    
    if not query or len(query) < 2:
        return jsonify([])
    
    bookings = Booking.query.filter(
        Booking.booking_no.contains(query) |
        Booking.customer_name.contains(query) |
        Booking.email.contains(query)
    ).order_by(Booking.created_at.desc()).limit(limit).all()
    
    results = []
    for booking in bookings:
        results.append({
            'id': booking.id,
            'booking_no': booking.booking_no,
            'customer_name': booking.customer_name,
            'email': booking.email,
            'status': booking.status.value,
            'total': float(booking.total_dkk),
            'created_at': booking.created_at.isoformat()
        })
    
    return jsonify(results)


@bp.route('/booking/<int:booking_id>/items')
@login_required
def get_booking_items(booking_id):
    """Get booking items for admin."""
    booking = Booking.query.get_or_404(booking_id)
    
    items = []
    for item in booking.items:
        items.append({
            'id': item.id,
            'product_name': item.name_snapshot,
            'quantity': item.quantity,
            'unit_price': float(item.unit_price_dkk),
            'total_price': float(item.unit_price_dkk * item.quantity)
        })
    
    return jsonify({
        'booking': {
            'id': booking.id,
            'booking_no': booking.booking_no,
            'customer_name': booking.customer_name,
            'status': booking.status.value,
            'total': float(booking.total_dkk)
        },
        'items': items
    })


@bp.route('/booking/<int:booking_id>/update-status', methods=['POST'])
@login_required
def update_booking_status(booking_id):
    """Update booking status via API."""
    booking = Booking.query.get_or_404(booking_id)
    new_status = request.json.get('status')
    
    if new_status not in [status.value for status in BookingStatus]:
        return jsonify({'error': 'Invalid status'}), 400
    
    booking.status = BookingStatus(new_status)
    
    db_session = current_app.extensions['sqlalchemy'].session
    db_session.commit()
    
    return jsonify({
        'success': True,
        'message': 'Status opdateret',
        'new_status': new_status
    })


@bp.route('/products/<int:product_id>/availability-calendar')
def get_product_availability_calendar(product_id):
    """Get detailed availability calendar for a product."""
    start_str = request.args.get('start')
    end_str = request.args.get('end')
    
    if not start_str or not end_str:
        return jsonify({'error': 'Start and end dates required'}), 400
    
    try:
        start_date = datetime.strptime(start_str, '%Y-%m-%d').date()
        end_date = datetime.strptime(end_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Invalid date format'}), 400
    
    # Get product
    product = Product.query.filter_by(id=product_id, is_active=True).first()
    if not product:
        return jsonify({'error': 'Product not found'}), 404
    
    # Get availability data
    db_session = current_app.extensions['sqlalchemy'].session
    availability_service = AvailabilityService(db_session)
    
    calendar_data = availability_service.get_availability_calendar(
        product_id, start_date, end_date
    )
    
    # Get conflicting bookings for unavailable dates
    conflicts = {}
    for day_data in calendar_data:
        if not day_data['is_available']:
            day_date = datetime.strptime(day_data['date'], '%Y-%m-%d').date()
            day_conflicts = availability_service.get_conflicting_bookings(
                product_id, day_date, day_date
            )
            if day_conflicts:
                conflicts[day_data['date']] = day_conflicts
    
    return jsonify({
        'product': {
            'id': product.id,
            'name': product.name,
            'stock_qty': product.stock_qty
        },
        'calendar_data': calendar_data,
        'conflicts': conflicts
    })


@bp.route('/dashboard/stats')
@login_required
def get_dashboard_stats():
    """Get dashboard statistics for admin."""
    from datetime import timedelta
    from sqlalchemy import func
    
    today = date.today()
    week_start = today - timedelta(days=today.weekday())
    month_start = today.replace(day=1)
    
    # Bookings this week
    bookings_this_week = Booking.query.filter(
        Booking.created_at >= week_start,
        Booking.status != BookingStatus.CANCELLED
    ).count()
    
    # Bookings this month
    bookings_this_month = Booking.query.filter(
        Booking.created_at >= month_start,
        Booking.status != BookingStatus.CANCELLED
    ).count()
    
    # Revenue this month
    revenue_this_month = Booking.query.filter(
        Booking.created_at >= month_start,
        Booking.status == BookingStatus.PAID
    ).with_entities(func.sum(Booking.total_dkk)).scalar() or Decimal('0')
    
    # Upcoming pickups (next 7 days)
    upcoming_pickups = Booking.query.filter(
        Booking.start_date <= today + timedelta(days=7),
        Booking.start_date >= today,
        Booking.status.in_([BookingStatus.PAID, BookingStatus.FULFILLED])
    ).count()
    
    return jsonify({
        'bookings_this_week': bookings_this_week,
        'bookings_this_month': bookings_this_month,
        'revenue_this_month': float(revenue_this_month),
        'upcoming_pickups': upcoming_pickups
    })
