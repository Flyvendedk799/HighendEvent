"""Shop blueprint for booking and checkout functionality."""

from flask import Blueprint, render_template, request, jsonify, redirect, url_for, flash, session, current_app
from flask_wtf.csrf import validate_csrf
from werkzeug.exceptions import BadRequest
from datetime import datetime, date
from decimal import Decimal
from typing import List, Dict, Any

from app.models import Product, Booking, BookingItem, BookingUpsellItem, BookingStatus, DeliveryType, CartItem, CartUpsellItem, UpsellProduct, db
from app.services.availability import AvailabilityService
from app.services.pricing import PricingService, BookingItemDTO
from app.forms import CheckoutForm

try:
    import stripe
    # Handle different Stripe versions
    try:
        version = getattr(stripe, '__version__', None) or getattr(stripe, '_version', 'unknown version')
        if hasattr(version, '__name__'):  # It's a module, not a string
            version = 'latest'
    except:
        version = 'unknown version'
    print(f'Stripe imported successfully: {version}')
except ImportError as e:
    print(f'Failed to import stripe: {e}')
    stripe = None

bp = Blueprint('shop', __name__)


@bp.route('/cart')
def cart():
    """Shopping cart/booking cart page."""
    from flask_login import current_user
    
    if current_user.is_authenticated and hasattr(current_user, 'cart_items'):
        # User-based cart
        cart_items = current_user.cart_items
        cart_data = []
        for item in cart_items:
            # Collect upsell items
            upsells = {}
            for upsell_item in item.upsell_items:
                upsells[str(upsell_item.upsell_product_id)] = upsell_item.quantity
            
            cart_data.append({
                'product_id': item.product_id,
                'quantity': item.quantity,
                'delivery_type': item.delivery_type,
                'start_date': item.start_date,
                'end_date': item.end_date,
                'upsells': upsells
            })
    else:
        # Fallback to session-based cart for non-authenticated users
        cart_data = session.get('cart', [])

    # Get product details for cart items
    cart_products = []
    booking_items = []
    delivery_type = DeliveryType.PICKUP  # Default, will be overridden if any item has delivery

    for item in cart_data:
        try:
            product = Product.query.filter_by(id=item['product_id'], is_active=True).first()
            if not product:
                continue
                
            # For user-based cart, get dates from the database cart item
            if current_user.is_authenticated and hasattr(current_user, 'cart_items'):
                # User-based cart - get dates from the cart item
                start_date = item.get('start_date')
                end_date = item.get('end_date')
                item_delivery_type = DeliveryType.PICKUP if item.get('delivery_type') == 'pickup' else DeliveryType.DELIVERY
            else:
                # Session-based cart - dates are stored in the item
                try:
                    start_date = datetime.strptime(item['start_date'], '%Y-%m-%d').date()
                    end_date = datetime.strptime(item['end_date'], '%Y-%m-%d').date()
                except (ValueError, KeyError):
                    start_date = None
                    end_date = None
                item_delivery_type = DeliveryType.PICKUP if item.get('delivery_type') == 'pickup' else DeliveryType.DELIVERY

            # If any item has delivery, set the overall delivery type
            if item_delivery_type == DeliveryType.DELIVERY:
                delivery_type = DeliveryType.DELIVERY

            # Only calculate pricing if we have dates
            price_estimate = None
            if start_date and end_date:
                # Calculate individual item pricing (without delivery fee)
                db_session = current_app.extensions['sqlalchemy'].session
                pricing_service = PricingService(db_session, current_app.config['VAT_PERCENT'])

                price_estimate = pricing_service.get_price_estimate(
                    product.id, start_date, end_date, item['quantity'], item_delivery_type
                )

                # Create booking item DTO for total calculation
                booking_items.append(BookingItemDTO(
                    product_id=product.id,
                    product_name=product.name,
                    quantity=item['quantity'],
                    start_date=start_date,
                    end_date=end_date,
                    delivery_type=item_delivery_type
                ))

            # Load upsell products
            upsell_products = {}
            upsells = item.get('upsells', {})
            for upsell_id, quantity in upsells.items():
                upsell_product = UpsellProduct.query.filter_by(id=int(upsell_id), is_active=True).first()
                if upsell_product:
                    upsell_products[upsell_id] = upsell_product

            cart_products.append({
                'product': product,
                'quantity': item['quantity'],
                'start_date': start_date,
                'end_date': end_date,
                'delivery_type': item_delivery_type,
                'price_estimate': price_estimate,
                'upsells': upsells,
                'upsell_products': upsell_products
            })

        except (ValueError, KeyError) as e:
            flash(f'Fejl i vare: {product.name if product else "Unknown"}', 'error')
            continue

    # Calculate total pricing with delivery fees and upsells
    total_estimate = Decimal('0')
    delivery_fee = Decimal('0')
    upsell_total = Decimal('0')
    
    if booking_items:
        db_session = current_app.extensions['sqlalchemy'].session
        pricing_service = PricingService(db_session, current_app.config['VAT_PERCENT'])
        total_pricing = pricing_service.calculate_booking_pricing(booking_items, delivery_type)
        total_estimate = total_pricing.total
        delivery_fee = total_pricing.delivery_fee
    
    # Add upsell pricing
    for cart_item in cart_products:
        for upsell_id, quantity in cart_item.get('upsells', {}).items():
            upsell_product = cart_item['upsell_products'].get(upsell_id)
            if upsell_product:
                upsell_total += upsell_product.price_dkk * int(quantity)
    
    total_estimate += upsell_total

    return render_template('shop/cart.html',
                         cart_products=cart_products,
                         total_estimate=total_estimate,
                         delivery_fee=delivery_fee,
                         upsell_total=upsell_total)


@bp.route('/add-to-cart', methods=['POST'])
def add_to_cart():
    """Add product to cart."""
    from flask_login import current_user
    import json
    
    try:
        validate_csrf(request.form.get('csrf_token'))
    except BadRequest:
        return jsonify({'error': 'Invalid CSRF token'}), 400
    
    product_id = request.form.get('product_id', type=int)
    quantity = request.form.get('quantity', 1, type=int)
    start_date_str = request.form.get('start_date')
    end_date_str = request.form.get('end_date')
    delivery_type = request.form.get('delivery_type', 'pickup')
    upsells_json = request.form.get('upsells')
    
    if not all([product_id, start_date_str, end_date_str]):
        return jsonify({'error': 'Missing required fields'}), 400
    
    try:
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Invalid date format'}), 400
    
    # Parse upsell data
    upsells = {}
    if upsells_json:
        try:
            upsells = json.loads(upsells_json)
        except (json.JSONDecodeError, ValueError):
            return jsonify({'error': 'Invalid upsell data format'}), 400
    
    # Check availability
    db_session = current_app.extensions['sqlalchemy'].session
    availability_service = AvailabilityService(db_session)
    
    if not availability_service.is_available(product_id, start_date, end_date, quantity):
        return jsonify({'error': 'Produktet er ikke tilgængeligt for de valgte datoer'}), 400
    
    # Check upsell product availability
    for upsell_id, upsell_qty in upsells.items():
        upsell_product = UpsellProduct.query.filter_by(id=int(upsell_id), is_active=True).first()
        if not upsell_product:
            return jsonify({'error': f'Upsell produkt {upsell_id} findes ikke'}), 400
        if upsell_product.stock_qty < int(upsell_qty):
            return jsonify({'error': f'Ikke nok lager for {upsell_product.name}'}), 400
    
    if current_user.is_authenticated and hasattr(current_user, 'cart_items'):
        # User-based cart
        # Check if item already exists in cart
        existing_item = CartItem.query.filter_by(
            customer_id=current_user.id,
            product_id=product_id,
            delivery_type=delivery_type
        ).first()
        
        if existing_item:
            existing_item.quantity += quantity
            existing_item.start_date = start_date
            existing_item.end_date = end_date
            existing_item.updated_at = datetime.utcnow()
            
            # Clear existing upsell items and add new ones
            CartUpsellItem.query.filter_by(cart_item_id=existing_item.id).delete()
        else:
            cart_item = CartItem(
                customer_id=current_user.id,
                product_id=product_id,
                quantity=quantity,
                delivery_type=delivery_type,
                start_date=start_date,
                end_date=end_date
            )
            db.session.add(cart_item)
            db.session.flush()  # Get cart_item.id
            existing_item = cart_item
        
        # Add upsell items
        for upsell_id, upsell_qty in upsells.items():
            cart_upsell = CartUpsellItem(
                cart_item_id=existing_item.id,
                upsell_product_id=int(upsell_id),
                quantity=int(upsell_qty)
            )
            db.session.add(cart_upsell)
        
        db.session.commit()
        
        # Calculate total quantity for cart count (include upsells)
        total_count = sum(item.quantity for item in current_user.cart_items)
        total_count += sum(sum(upsell.quantity for upsell in item.upsell_items) for item in current_user.cart_items)
    else:
        # Fallback to session-based cart for non-authenticated users
        cart = session.get('cart', [])
        
        # Check if item already exists in cart
        for item in cart:
            if (item['product_id'] == product_id and 
                item['start_date'] == start_date_str and 
                item['end_date'] == end_date_str and
                item.get('delivery_type') == delivery_type):
                item['quantity'] += quantity
                item['upsells'] = upsells  # Replace upsells
                break
        else:
            cart.append({
                'product_id': product_id,
                'quantity': quantity,
                'start_date': start_date_str,
                'end_date': end_date_str,
                'delivery_type': delivery_type,
                'upsells': upsells
            })
        
        session['cart'] = cart
        
        # Calculate total quantity for cart count (include upsells)
        total_count = sum(item.get('quantity', 1) for item in cart)
        total_count += sum(sum(int(qty) for qty in item.get('upsells', {}).values()) for item in cart)
    
    return jsonify({
        'success': True,
        'message': 'Vare tilføjet til kurv',
        'cart_count': total_count
    })


@bp.route('/cart-count', methods=['GET'])
def get_cart_count():
    """Get current cart item count."""
    from flask_login import current_user
    
    if current_user.is_authenticated and hasattr(current_user, 'cart_items'):
        # User-based cart
        total_count = sum(item.quantity for item in current_user.cart_items)
    else:
        # Fallback to session-based cart for non-authenticated users
        cart = session.get('cart', [])
        total_count = sum(item.get('quantity', 1) for item in cart)
    
    return jsonify({'cart_count': total_count})


@bp.route('/remove-from-cart', methods=['POST'])
def remove_from_cart():
    """Remove item from cart."""
    from flask_login import current_user
    
    try:
        validate_csrf(request.form.get('csrf_token'))
    except BadRequest:
        return jsonify({'error': 'Invalid CSRF token'}), 400
    
    product_id = request.form.get('product_id', type=int)
    delivery_type = request.form.get('delivery_type', 'pickup')
    
    if current_user.is_authenticated and hasattr(current_user, 'cart_items'):
        # User-based cart
        cart_item = CartItem.query.filter_by(
            customer_id=current_user.id,
            product_id=product_id,
            delivery_type=delivery_type
        ).first()
        
        if cart_item:
            db.session.delete(cart_item)
            db.session.commit()
    else:
        # Fallback to session-based cart for non-authenticated users
        start_date_str = request.form.get('start_date')
        end_date_str = request.form.get('end_date')
        
        cart = session.get('cart', [])
        cart = [item for item in cart if not (
            item['product_id'] == product_id and 
            item['start_date'] == start_date_str and 
            item['end_date'] == end_date_str and
            item.get('delivery_type') == delivery_type
        )]
        
        session['cart'] = cart
    
    return jsonify({'success': True, 'message': 'Vare fjernet fra kurv'})


@bp.route('/update-cart-quantity', methods=['POST'])
def update_cart_quantity():
    """Update quantity of item in cart."""
    try:
        validate_csrf(request.form.get('csrf_token'))
    except BadRequest:
        return jsonify({'error': 'Invalid CSRF token'}), 400
    
    product_id = request.form.get('product_id', type=int)
    quantity = request.form.get('quantity', 1, type=int)
    start_date_str = request.form.get('start_date')
    end_date_str = request.form.get('end_date')
    delivery_type = request.form.get('delivery_type', 'pickup')
    
    if quantity <= 0:
        return remove_from_cart()
    
    cart = session.get('cart', [])
    for item in cart:
        if (item['product_id'] == product_id and 
            item['start_date'] == start_date_str and 
            item['end_date'] == end_date_str and
            item.get('delivery_type') == delivery_type):
            item['quantity'] = quantity
            break
    
    session['cart'] = cart
    
    return jsonify({'success': True, 'message': 'Antal opdateret'})


@bp.route('/checkout')
def checkout():
    """Checkout page."""
    from flask_login import current_user
    
    if current_user.is_authenticated and hasattr(current_user, 'cart_items'):
        # User-based cart
        cart_items = current_user.cart_items
        cart_data = []
        for item in cart_items:
            # Collect upsell items
            upsells = {}
            for upsell_item in item.upsell_items:
                upsells[str(upsell_item.upsell_product_id)] = upsell_item.quantity
            
            cart_data.append({
                'product_id': item.product_id,
                'quantity': item.quantity,
                'delivery_type': item.delivery_type,
                'start_date': item.start_date,
                'end_date': item.end_date,
                'upsells': upsells
            })
    else:
        # Fallback to session-based cart for non-authenticated users
        cart_data = session.get('cart', [])
    
    if not cart_data:
        flash('Din kurv er tom', 'warning')
        return redirect(url_for('shop.cart'))

    form = CheckoutForm()

    # Pre-populate form if user data exists in session
    if 'customer_email' in session:
        form.email.data = session['customer_email']
        form.customer_name.data = session.get('customer_name', '')
        form.phone.data = session.get('phone', '')
        form.address.data = session.get('address', '')
        form.zip_code.data = session.get('zip_code', '')
        form.city.data = session.get('city', '')

    # Process cart products for pricing display (same as cart route)
    cart_products = []
    booking_items = []
    # Use form delivery type if available, otherwise default to PICKUP
    delivery_type = DeliveryType.DELIVERY if form.delivery_type.data == 'delivery' else DeliveryType.PICKUP

    for item in cart_data:
        product = Product.query.filter_by(id=item['product_id'], is_active=True).first()
        if product:
            try:
                # Handle both date objects (from database) and date strings (from session)
                if isinstance(item['start_date'], str):
                    start_date = datetime.strptime(item['start_date'], '%Y-%m-%d').date()
                else:
                    start_date = item['start_date']
                    
                if isinstance(item['end_date'], str):
                    end_date = datetime.strptime(item['end_date'], '%Y-%m-%d').date()
                else:
                    end_date = item['end_date']
                    
                # Use form delivery type for all items
                item_delivery_type = delivery_type

                # Calculate individual item pricing (without delivery fee)
                db_session = current_app.extensions['sqlalchemy'].session
                pricing_service = PricingService(db_session, current_app.config['VAT_PERCENT'])

                price_estimate = pricing_service.get_price_estimate(
                    product.id, start_date, end_date, item['quantity'], item_delivery_type
                )

                # Load upsell products
                upsell_products = {}
                upsells = item.get('upsells', {})
                for upsell_id, quantity in upsells.items():
                    upsell_product = UpsellProduct.query.filter_by(id=int(upsell_id), is_active=True).first()
                    if upsell_product:
                        upsell_products[upsell_id] = upsell_product

                cart_products.append({
                    'product': product,
                    'quantity': item['quantity'],
                    'start_date': start_date,
                    'end_date': end_date,
                    'delivery_type': item_delivery_type,
                    'price_estimate': price_estimate,
                    'upsells': upsells,
                    'upsell_products': upsell_products
                })

                # Create booking item DTO for total calculation
                booking_items.append(BookingItemDTO(
                    product_id=product.id,
                    product_name=product.name,
                    quantity=item['quantity'],
                    start_date=start_date,
                    end_date=end_date,
                    delivery_type=item_delivery_type
                ))

            except (ValueError, KeyError) as e:
                flash(f'Fejl i vare: {product.name}', 'error')
                continue

    # Calculate total pricing with delivery fees and upsells
    total_estimate = Decimal('0')
    delivery_fee = Decimal('0')
    upsell_total = Decimal('0')
    
    if booking_items:
        db_session = current_app.extensions['sqlalchemy'].session
        pricing_service = PricingService(db_session, current_app.config['VAT_PERCENT'])
        
        # Get customer address for distance-based delivery pricing
        # For checkout page, we need to get the address from the form fields
        customer_address = form.address.data if form and form.address.data else None
        customer_zip = form.zip_code.data if form and form.zip_code.data else None
        customer_city = form.city.data if form and form.city.data else None
        
        total_pricing = pricing_service.calculate_booking_pricing(
            booking_items, 
            delivery_type,
            customer_address,
            customer_zip,
            customer_city
        )
        total_estimate = total_pricing.total
        delivery_fee = total_pricing.delivery_fee
    
    # Add upsell pricing
    for cart_item in cart_products:
        for upsell_id, quantity in cart_item.get('upsells', {}).items():
            upsell_product = cart_item['upsell_products'].get(upsell_id)
            if upsell_product:
                upsell_total += upsell_product.price_dkk * int(quantity)
    
    total_estimate += upsell_total

    return render_template('shop/checkout.html',
                         form=form,
                         cart_products=cart_products,
                         total_estimate=total_estimate,
                         delivery_fee=delivery_fee,
                         upsell_total=upsell_total)


@bp.route('/process-checkout', methods=['POST'])
def process_checkout():
    """Process checkout and create Stripe session."""
    from flask_login import current_user
    
    form = CheckoutForm()
    
    if not form.validate():
        # Recalculate cart data for display
        if current_user.is_authenticated and hasattr(current_user, 'cart_items'):
            cart_items = current_user.cart_items
            cart_data = []
            for item in cart_items:
                # Collect upsell items
                upsells = {}
                for upsell_item in item.upsell_items:
                    upsells[str(upsell_item.upsell_product_id)] = upsell_item.quantity
                
                cart_data.append({
                    'product_id': item.product_id,
                    'quantity': item.quantity,
                    'delivery_type': item.delivery_type,
                    'start_date': item.start_date,
                    'end_date': item.end_date,
                    'upsells': upsells
                })
        else:
            cart_data = session.get('cart', [])
        
        # Recalculate pricing for display
        cart_products = []
        booking_items = []
        # Use form delivery type if available, otherwise default to PICKUP
        delivery_type = DeliveryType.DELIVERY if form.delivery_type.data == 'delivery' else DeliveryType.PICKUP
        
        for item in cart_data:
            product = Product.query.filter_by(id=item['product_id'], is_active=True).first()
            if product:
                try:
                    if isinstance(item['start_date'], str):
                        start_date = datetime.strptime(item['start_date'], '%Y-%m-%d').date()
                    else:
                        start_date = item['start_date']
                        
                    if isinstance(item['end_date'], str):
                        end_date = datetime.strptime(item['end_date'], '%Y-%m-%d').date()
                    else:
                        end_date = item['end_date']
                        
                    item_delivery_type = DeliveryType.PICKUP if item.get('delivery_type') == 'pickup' else DeliveryType.DELIVERY
                    if item_delivery_type == DeliveryType.DELIVERY:
                        delivery_type = DeliveryType.DELIVERY

                    if start_date and end_date:
                        db_session = current_app.extensions['sqlalchemy'].session
                        pricing_service = PricingService(db_session, Decimal(str(current_app.config['VAT_PERCENT'])))
                        price_estimate = pricing_service.get_price_estimate(
                            product.id, start_date, end_date, item['quantity'], item_delivery_type
                        )
                        booking_items.append(BookingItemDTO(
                            product_id=product.id,
                            product_name=product.name,
                            quantity=item['quantity'],
                            start_date=start_date,
                            end_date=end_date,
                            delivery_type=item_delivery_type
                        ))
                    else:
                        price_estimate = None

                    cart_products.append({
                        'product': product,
                        'quantity': item['quantity'],
                        'start_date': start_date,
                        'end_date': end_date,
                        'delivery_type': item_delivery_type,
                        'price_estimate': price_estimate
                    })
                except (ValueError, KeyError) as e:
                    continue

        total_estimate = Decimal('0')
        delivery_fee = Decimal('0')
        if booking_items:
            db_session = current_app.extensions['sqlalchemy'].session
            pricing_service = PricingService(db_session, current_app.config['VAT_PERCENT'])
            total_pricing = pricing_service.calculate_booking_pricing(booking_items, delivery_type)
            total_estimate = total_pricing.total
            delivery_fee = total_pricing.delivery_fee

        return render_template('shop/checkout.html', 
                             form=form, 
                             cart_products=cart_products, 
                             total_estimate=total_estimate, 
                             delivery_fee=delivery_fee)
    
    if current_user.is_authenticated and hasattr(current_user, 'cart_items'):
        # User-based cart
        cart_items = current_user.cart_items
        cart_data = []
        for item in cart_items:
            # Collect upsell items
            upsells = {}
            for upsell_item in item.upsell_items:
                upsells[str(upsell_item.upsell_product_id)] = upsell_item.quantity
            
            cart_data.append({
                'product_id': item.product_id,
                'quantity': item.quantity,
                'delivery_type': item.delivery_type,
                'start_date': item.start_date,
                'end_date': item.end_date,
                'upsells': upsells
            })
    else:
        # Fallback to session-based cart for non-authenticated users
        cart_data = session.get('cart', [])
    
    if not cart_data:
        flash('Din kurv er tom', 'warning')
        return redirect(url_for('shop.cart'))
    
    # Validate availability one more time
    db_session = current_app.extensions['sqlalchemy'].session
    availability_service = AvailabilityService(db_session)
    
    for item in cart_data:
        try:
            # Handle both date objects (from database) and date strings (from session)
            if isinstance(item['start_date'], str):
                start_date = datetime.strptime(item['start_date'], '%Y-%m-%d').date()
            else:
                start_date = item['start_date']
                
            if isinstance(item['end_date'], str):
                end_date = datetime.strptime(item['end_date'], '%Y-%m-%d').date()
            else:
                end_date = item['end_date']
        except (ValueError, TypeError):
            flash('Ugyldig dato i kurv', 'error')
            return redirect(url_for('shop.cart'))
        
        if not availability_service.is_available(
            item['product_id'], start_date, end_date, item['quantity']
        ):
            product = Product.query.get(item['product_id'])
            flash(f'{product.name} er ikke længere tilgængelig for de valgte datoer', 'error')
            return redirect(url_for('shop.cart'))
    
    # Store cart data and form data in session for webhook to use
    try:
        # Calculate total pricing for Stripe
        total_estimate = Decimal('0')
        delivery_fee = Decimal('0')
        
        # Create booking items for pricing calculation
        booking_items = []
        # Use form delivery type for pricing calculation
        delivery_type = DeliveryType.DELIVERY if form.delivery_type.data == 'delivery' else DeliveryType.PICKUP
        current_app.logger.info(f'Process checkout - Form delivery type: {form.delivery_type.data}, Calculated delivery_type: {delivery_type}')
        for item in cart_data:
            product = Product.query.filter_by(id=item['product_id'], is_active=True).first()
            if product:
                try:
                    if isinstance(item['start_date'], str):
                        start_date = datetime.strptime(item['start_date'], '%Y-%m-%d').date()
                    else:
                        start_date = item['start_date']
                        
                    if isinstance(item['end_date'], str):
                        end_date = datetime.strptime(item['end_date'], '%Y-%m-%d').date()
                    else:
                        end_date = item['end_date']
                        
                    # Use form delivery type for all items
                    item_delivery_type = delivery_type

                    if start_date and end_date:
                        booking_items.append(BookingItemDTO(
                            product_id=product.id,
                            product_name=product.name,
                            quantity=item['quantity'],
                            start_date=start_date,
                            end_date=end_date,
                            delivery_type=item_delivery_type
                        ))
                except (ValueError, KeyError) as e:
                    continue
        
        if booking_items:
            db_session = current_app.extensions['sqlalchemy'].session
            pricing_service = PricingService(db_session, current_app.config['VAT_PERCENT'])
            
            # Get customer address for distance-based delivery pricing
            customer_address = form.address.data if form else None
            customer_zip = form.zip_code.data if form else None
            customer_city = form.city.data if form else None
            
            total_pricing = pricing_service.calculate_booking_pricing(
                booking_items, 
                delivery_type,
                customer_address,
                customer_zip,
                customer_city
            )
            total_estimate = total_pricing.total
            delivery_fee = total_pricing.delivery_fee
            current_app.logger.info(f'Process checkout - Total pricing: {total_estimate} DKK, Delivery fee: {delivery_fee} DKK, Delivery type: {delivery_type}')
        
        # Add upsell pricing to total
        upsell_total = Decimal('0')
        for item in cart_data:
            upsells = item.get('upsells', {})
            for upsell_id, quantity in upsells.items():
                upsell_product = UpsellProduct.query.filter_by(id=int(upsell_id), is_active=True).first()
                if upsell_product:
                    upsell_total += upsell_product.price_dkk * int(quantity)
        
        total_estimate += upsell_total
        current_app.logger.info(f'Process checkout - Added upsells: {upsell_total} DKK, Final total: {total_estimate} DKK')
        
        # Store checkout data in session for webhook
        session['checkout_data'] = {
            'cart_data': cart_data,
            'form_data': {
                'customer_name': form.customer_name.data,
                'email': form.email.data,
                'phone': form.phone.data,
                'address': form.address.data,
                'zip_code': form.zip_code.data,
                'city': form.city.data,
                'delivery_type': form.delivery_type.data,
                'notes': form.notes.data,
                'account_number': form.account_number.data or '',
                'registration_number': form.registration_number.data or ''
            },
            'total_estimate': float(total_estimate),
            'delivery_fee': float(delivery_fee),
            'delivery_type': delivery_type.value
        }
        
        current_app.logger.info(f'Stored checkout data in session for {len(cart_data)} items')
        current_app.logger.info(f'Total estimate: {total_estimate} DKK')
        
    except Exception as e:
        import traceback
        current_app.logger.error(f'Error preparing checkout data: {str(e)}')
        current_app.logger.error(f'Traceback: {traceback.format_exc()}')
        flash(f'Der opstod en fejl under forberedelse af checkout: {str(e)}', 'error')
        return render_checkout_with_cart_data(form, cart_data)
    
    # Create Stripe checkout session
    try:
        current_app.logger.info(f'Creating Stripe session for total: {total_estimate} DKK')
        
        checkout_session = create_stripe_session_from_cart(
            total_estimate, 
            form.customer_name.data, 
            form.email.data
        )
        
        current_app.logger.info(f'Stripe session created: {checkout_session.id}')
        
        
        return redirect(checkout_session.url, code=303)
        
    except Exception as e:
        import traceback
        current_app.logger.error(f'Error creating Stripe session: {str(e)}')
        current_app.logger.error(f'Traceback: {traceback.format_exc()}')
        flash(f'Der opstod en fejl under oprettelse af Stripe session: {str(e)}', 'error')
        return render_checkout_with_cart_data(form, cart_data)


@bp.route('/api/calculate-pricing', methods=['POST'])
def calculate_pricing():
    """Calculate pricing for cart items with given delivery type."""
    from flask_login import current_user
    import traceback
    
    try:
        data = request.get_json()
        delivery_type = data.get('delivery_type', 'pickup')
        customer_address = data.get('address', '').strip()
        customer_zip = data.get('zip_code', '').strip()
        customer_city = data.get('city', '').strip()
        
        current_app.logger.info(f'Calculate pricing request: delivery_type={delivery_type}, address={customer_address}, zip={customer_zip}, city={customer_city}, user_authenticated={current_user.is_authenticated}')
        current_app.logger.info(f'Full request data: {data}')
        
        if current_user.is_authenticated and hasattr(current_user, 'cart_items'):
            # User-based cart
            cart_items = current_user.cart_items
            cart_data = []
            for item in cart_items:
                cart_data.append({
                    'product_id': item.product_id,
                    'quantity': item.quantity,
                    'delivery_type': item.delivery_type,
                    'start_date': item.start_date,
                    'end_date': item.end_date
                })
            current_app.logger.info(f'User cart data: {cart_data}')
            current_app.logger.info(f'User cart items count: {len(cart_items)}')
        else:
            # Fallback to session-based cart for non-authenticated users
            cart_data = session.get('cart', [])
            current_app.logger.info(f'Session cart data: {cart_data}')
            current_app.logger.info(f'Session cart count: {len(cart_data)}')
            current_app.logger.info(f'Full session: {dict(session)}')
        
        if not cart_data:
            current_app.logger.error('Cart is empty - returning 400 error')
            return jsonify({'error': 'Cart is empty'}), 400
        
        # Validate cart data format
        for i, item in enumerate(cart_data):
            current_app.logger.info(f'Cart item {i}: {item}')
            if not all(key in item for key in ['product_id', 'quantity', 'start_date', 'end_date']):
                current_app.logger.error(f'Invalid cart item format: {item}')
                return jsonify({'error': 'Invalid cart item format'}), 400
        
        current_app.logger.info(f'Cart validation passed for {len(cart_data)} items')
        
        # Update delivery type in session cart items for non-authenticated users
        if not (current_user.is_authenticated and hasattr(current_user, 'cart_items')):
            for item in cart_data:
                item['delivery_type'] = delivery_type
            session['cart'] = cart_data
            current_app.logger.info(f'Updated session cart with delivery_type: {delivery_type}')
        
        # Calculate pricing
        cart_products = []
        booking_items = []
        delivery_type_enum = DeliveryType.PICKUP if delivery_type == 'pickup' else DeliveryType.DELIVERY
        current_app.logger.info(f'Delivery type enum: {delivery_type_enum}')
        
        for item in cart_data:
            product = Product.query.filter_by(id=item['product_id'], is_active=True).first()
            current_app.logger.info(f'Processing item: {item}')
            current_app.logger.info(f'Product found: {product.name if product else "None"}')
            
            if product:
                try:
                    # Handle both date objects (from database) and date strings (from session)
                    if isinstance(item['start_date'], str):
                        start_date = datetime.strptime(item['start_date'], '%Y-%m-%d').date()
                    else:
                        start_date = item['start_date']
                    
                    if isinstance(item['end_date'], str):
                        end_date = datetime.strptime(item['end_date'], '%Y-%m-%d').date()
                    else:
                        end_date = item['end_date']
                    
                    current_app.logger.info(f'Parsed dates: start={start_date}, end={end_date}')
                    
                    if start_date and end_date:
                        db_session = current_app.extensions['sqlalchemy'].session
                        pricing_service = PricingService(db_session, Decimal(str(current_app.config['VAT_PERCENT'])))
                        price_estimate = pricing_service.get_price_estimate(
                            product.id, start_date, end_date, item['quantity'], delivery_type_enum
                        )
                        booking_items.append(BookingItemDTO(
                            product_id=product.id,
                            product_name=product.name,
                            quantity=item['quantity'],
                            start_date=start_date,
                            end_date=end_date,
                            delivery_type=delivery_type_enum
                        ))
                    else:
                        price_estimate = None

                    cart_products.append({
                        'product': product,
                        'quantity': item['quantity'],
                        'start_date': start_date,
                        'end_date': end_date,
                        'delivery_type': delivery_type_enum,
                        'price_estimate': price_estimate
                    })
                except (ValueError, KeyError) as e:
                    continue

        total_estimate = Decimal('0')
        delivery_fee = Decimal('0')
        if booking_items:
            db_session = current_app.extensions['sqlalchemy'].session
            pricing_service = PricingService(db_session, current_app.config['VAT_PERCENT'])
            
            # Use distance-based pricing if address is provided
            total_pricing = pricing_service.calculate_booking_pricing(
                booking_items, 
                delivery_type_enum,
                customer_address if customer_address else None,
                customer_zip if customer_zip else None,
                customer_city if customer_city else None
            )
            total_estimate = total_pricing.total
            delivery_fee = total_pricing.delivery_fee
        
        # Calculate breakdown
        total_rental = Decimal('0')
        total_deposit = Decimal('0')
        for item in cart_products:
            if item['price_estimate']:
                total_rental += Decimal(str(item['price_estimate']['subtotal'])) * item['quantity']
                if item['price_estimate']['deposit_amount'] > 0:
                    total_deposit += Decimal(str(item['price_estimate']['deposit_amount'])) * item['quantity']
        
        # Calculate upsell total from cart data
        upsell_total = Decimal('0')
        for item in cart_data:
            upsells = item.get('upsells', {})
            for upsell_id, quantity in upsells.items():
                upsell_product = UpsellProduct.query.filter_by(id=int(upsell_id), is_active=True).first()
                if upsell_product:
                    upsell_total += upsell_product.price_dkk * int(quantity)
        
        # Add upsells to total estimate
        total_estimate += upsell_total
        current_app.logger.info(f'Calculate pricing - Upsell total: {upsell_total} DKK, Final total: {total_estimate} DKK')
        
        # Get detailed delivery fee breakdown
        delivery_breakdown = None
        current_app.logger.info(f'Delivery fee calculation: fee={delivery_fee}, type={delivery_type_enum}, address={customer_address}, zip={customer_zip}, city={customer_city}')
        
        if delivery_fee > 0 and booking_items:
            # Get delivery setting details
            from app.models import DeliverySetting, CompanyLocation
            delivery_setting = DeliverySetting.query.filter(
                DeliverySetting.type == delivery_type_enum,
                DeliverySetting.is_active == True
            ).first()
            
            current_app.logger.info(f'Delivery setting found: {delivery_setting}')
            
            if delivery_setting:
                # Calculate distance if we have customer address
                distance_km = None
                if customer_address and customer_zip and customer_city:
                    company_location = CompanyLocation.query.filter(
                        CompanyLocation.is_primary == True,
                        CompanyLocation.is_active == True
                    ).first()
                    
                    current_app.logger.info(f'Company location: {company_location}')
                    
                    if company_location and company_location.latitude and company_location.longitude:
                        from app.services.distance import DistanceService
                        distance_km = DistanceService.calculate_delivery_distance(
                            company_location.latitude,
                            company_location.longitude,
                            customer_address,
                            customer_zip,
                            customer_city
                        )
                        current_app.logger.info(f'Calculated distance: {distance_km} km')
                
                delivery_breakdown = {
                    'base_fee': float(delivery_setting.base_fee_dkk),
                    'per_km_fee': float(delivery_setting.per_km_fee_dkk),
                    'free_delivery_km': delivery_setting.free_delivery_km,
                    'distance_km': round(distance_km, 2) if distance_km else None,
                    'chargeable_km': max(0, (distance_km or 0) - delivery_setting.free_delivery_km) if distance_km else None,
                    'km_fee': float(delivery_setting.per_km_fee_dkk) * max(0, (distance_km or 0) - delivery_setting.free_delivery_km) if distance_km else 0
                }
                current_app.logger.info(f'Delivery breakdown: {delivery_breakdown}')
        
        return jsonify({
            'total_estimate': float(total_estimate),
            'delivery_fee': float(delivery_fee),
            'delivery_breakdown': delivery_breakdown,
            'total_rental': float(total_rental),
            'total_deposit': float(total_deposit),
            'upsell_total': float(upsell_total),
            'currency': 'DKK'
        })
    
    except Exception as e:
        current_app.logger.error(f'Error in calculate_pricing: {str(e)}')
        current_app.logger.error(f'Traceback: {traceback.format_exc()}')
        return jsonify({'error': f'Failed to calculate pricing: {str(e)}'}), 500



@bp.route('/debug-add-to-cart')
def debug_add_to_cart():
    """Debug route to add a test product to cart."""
    from flask import session
    from datetime import date, timedelta
    from flask_login import current_user
    from app.models import CartItem, db
    
    # Add a test product to cart
    test_item = {
        'product_id': 2,  # Popcorn Maskine
        'quantity': 1,
        'delivery_type': 'pickup',
        'start_date': (date.today() + timedelta(days=7)).strftime('%Y-%m-%d'),
        'end_date': (date.today() + timedelta(days=9)).strftime('%Y-%m-%d')
    }
    
    if current_user.is_authenticated and hasattr(current_user, 'cart_items'):
        # Add to user's database cart
        cart_item = CartItem(
            customer_id=current_user.id,
            product_id=test_item['product_id'],
            quantity=test_item['quantity'],
            delivery_type=test_item['delivery_type'],
            start_date=date.today() + timedelta(days=7),
            end_date=date.today() + timedelta(days=9)
        )
        db.session.add(cart_item)
        db.session.commit()
        return f"Added test item to user cart: {test_item}. <a href='/shop/checkout'>Go to checkout</a>"
    else:
        # Add to session cart
        if 'cart' not in session:
            session['cart'] = []
        
        session['cart'].append(test_item)
        session.modified = True
        return f"Added test item to session cart: {test_item}. <a href='/shop/checkout'>Go to checkout</a>"


@bp.route('/debug-cart-data')
def debug_cart_data():
    """Debug route to show cart data."""
    from flask_login import current_user
    
    result = []
    result.append(f"User authenticated: {current_user.is_authenticated}")
    
    if current_user.is_authenticated and hasattr(current_user, 'cart_items'):
        # User-based cart
        cart_items = current_user.cart_items
        cart_data = []
        for item in cart_items:
            cart_data.append({
                'product_id': item.product_id,
                'quantity': item.quantity,
                'delivery_type': item.delivery_type,
                'start_date': str(item.start_date),
                'end_date': str(item.end_date)
            })
        result.append(f"User cart data: {cart_data}")
        result.append(f"User cart items count: {len(cart_items)}")
    else:
        # Session-based cart
        cart_data = session.get('cart', [])
        result.append(f"Session cart data: {cart_data}")
        result.append(f"Session cart count: {len(cart_data)}")
    
    return "<br>".join(result)

@bp.route('/debug-cart-pricing')
def debug_cart_pricing():
    """Debug route to check cart pricing structure."""
    from flask_login import current_user
    
    if current_user.is_authenticated and hasattr(current_user, 'cart_items'):
        cart_items = current_user.cart_items
        cart_data = []
        for item in cart_items:
            cart_data.append({
                'product_id': item.product_id,
                'quantity': item.quantity,
                'delivery_type': item.delivery_type,
                'start_date': item.start_date,
                'end_date': item.end_date
            })
    else:
        cart_data = session.get('cart', [])
    
    if not cart_data:
        return "No cart data found"
    
    # Process cart products for pricing display (same as cart route)
    cart_products = []
    booking_items = []
    delivery_type = DeliveryType.PICKUP
    
    for item in cart_data:
        product = Product.query.filter_by(id=item['product_id'], is_active=True).first()
        if product:
            try:
                if isinstance(item['start_date'], str):
                    start_date = datetime.strptime(item['start_date'], '%Y-%m-%d').date()
                else:
                    start_date = item['start_date']
                    
                if isinstance(item['end_date'], str):
                    end_date = datetime.strptime(item['end_date'], '%Y-%m-%d').date()
                else:
                    end_date = item['end_date']
                    
                item_delivery_type = DeliveryType.PICKUP if item.get('delivery_type') == 'pickup' else DeliveryType.DELIVERY
                if item_delivery_type == DeliveryType.DELIVERY:
                    delivery_type = DeliveryType.DELIVERY

                if start_date and end_date:
                    db_session = current_app.extensions['sqlalchemy'].session
                    pricing_service = PricingService(db_session, current_app.config['VAT_PERCENT'])
                    price_estimate = pricing_service.get_price_estimate(
                        product.id, start_date, end_date, item['quantity'], item_delivery_type
                    )
                    booking_items.append(BookingItemDTO(
                        product_id=product.id,
                        product_name=product.name,
                        quantity=item['quantity'],
                        start_date=start_date,
                        end_date=end_date,
                        delivery_type=item_delivery_type
                    ))
                else:
                    price_estimate = None

                cart_products.append({
                    'product': product,
                    'quantity': item['quantity'],
                    'start_date': start_date,
                    'end_date': end_date,
                    'delivery_type': item_delivery_type,
                    'price_estimate': price_estimate
                })
            except (ValueError, KeyError) as e:
                continue

    # Debug output
    result = f"<h2>Cart Pricing Debug</h2>"
    result += f"<p>Cart items: {len(cart_data)}</p>"
    result += f"<p>Cart products: {len(cart_products)}</p>"
    
    for i, item in enumerate(cart_products):
        result += f"<h3>Item {i+1}: {item['product'].name}</h3>"
        result += f"<p>Quantity: {item['quantity']}</p>"
        result += f"<p>Price estimate: {item['price_estimate']}</p>"
        if item['price_estimate']:
            result += f"<p>Price estimate type: {type(item['price_estimate'])}</p>"
            if hasattr(item['price_estimate'], 'subtotal'):
                result += f"<p>Subtotal: {item['price_estimate'].subtotal}</p>"
            if hasattr(item['price_estimate'], 'deposit_amount'):
                result += f"<p>Deposit: {item['price_estimate'].deposit_amount}</p>"
            if isinstance(item['price_estimate'], dict):
                result += f"<p>Subtotal (dict): {item['price_estimate'].get('subtotal', 'NOT FOUND')}</p>"
                result += f"<p>Deposit (dict): {item['price_estimate'].get('deposit_amount', 'NOT FOUND')}</p>"
    
    return result






@bp.route('/update-booking-status/<booking_no>')
def update_booking_status(booking_no):
    """Manually update booking status to FULLY_PAID (for testing)."""
    booking = Booking.query.filter_by(booking_no=booking_no).first()
    if not booking:
        return f"Booking {booking_no} not found", 404
    
    booking.status = BookingStatus.FULLY_PAID
    db.session.commit()
    
    return f"Booking {booking_no} status updated to FULLY_PAID"


@bp.route('/debug-stripe')
def debug_stripe():
    """Debug route to test Stripe import."""
    try:
        import stripe as test_stripe
        stripe_info = {
            'stripe_imported': True,
            'stripe_object': str(test_stripe),
            'has_checkout': hasattr(test_stripe, 'checkout'),
            'checkout_object': str(test_stripe.checkout) if hasattr(test_stripe, 'checkout') else 'No checkout',
            'config_key': bool(current_app.config.get('STRIPE_SECRET_KEY')),
            'key_start': current_app.config.get('STRIPE_SECRET_KEY', 'NOT SET')[:10] + '...'
        }
        return f"<pre>{stripe_info}</pre>"
    except Exception as e:
        return f"<pre>Stripe import error: {e}</pre>"


@bp.route('/debug-session')
def debug_session():
    """Debug route to check session and login status."""
    from flask_login import current_user
    
    debug_info = {
        'current_user_authenticated': current_user.is_authenticated,
        'current_user_id': getattr(current_user, 'id', 'N/A'),
        'current_user_email': getattr(current_user, 'email', 'N/A'),
        'current_user_password_hash': getattr(current_user, 'password_hash', 'N/A'),
        'current_user_first_name': getattr(current_user, 'first_name', 'N/A'),
        'session_user_type': session.get('user_type'),
        'session_keys': list(session.keys()),
        'flask_env': current_app.config.get('FLASK_ENV'),
        'session_permanent': session.permanent,
        'session_id': session.get('_id', 'No session ID'),
    }
    
    # Also check if there are any recent guest customers
    from app.models import Customer
    recent_guests = Customer.query.filter_by(password_hash='GUEST_ACCOUNT_PENDING').order_by(Customer.id.desc()).limit(5).all()
    
    guest_info = []
    for guest in recent_guests:
        guest_info.append({
            'id': guest.id,
            'email': guest.email,
            'first_name': guest.first_name,
            'password_hash': guest.password_hash
        })
    
    debug_info['recent_guest_customers'] = guest_info
    
    return f"<pre>{debug_info}</pre>"


@bp.route('/order/<booking_no>')
@bp.route('/order')
def order_confirmation(booking_no=None):
    """Order confirmation page."""
    # Check if we have a session_id parameter (from Stripe redirect)
    session_id = request.args.get('session_id')
    
    if session_id:
        # Find booking by Stripe session ID
        booking = Booking.query.filter_by(stripe_session_id=session_id).first()
        
        if not booking:
            # Try to create booking from session data (for both dev and production)
            # This handles cases where webhooks haven't processed yet
            if True:  # Always try this approach
                current_app.logger.info('Creating booking from session data after Stripe return')
                try:
                    checkout_data = session.get('checkout_data')
                    if checkout_data:
                        # Create form object from stored data
                        form = CheckoutForm()
                        form.customer_name.data = checkout_data['form_data']['customer_name']
                        form.email.data = checkout_data['form_data']['email']
                        form.phone.data = checkout_data['form_data']['phone']
                        form.address.data = checkout_data['form_data']['address']
                        form.zip_code.data = checkout_data['form_data']['zip_code']
                        form.city.data = checkout_data['form_data']['city']
                        form.delivery_type.data = checkout_data['form_data']['delivery_type']
                        form.notes.data = checkout_data['form_data']['notes']
                        form.account_number.data = checkout_data['form_data'].get('account_number', '')
                        form.registration_number.data = checkout_data['form_data'].get('registration_number', '')
                        
                        # Create booking from cart data
                        booking = create_booking_from_cart(checkout_data['cart_data'], form)
                        
                        if booking:
                            # Update booking with Stripe session info
                            booking.stripe_session_id = session_id
                            booking.status = BookingStatus.FULLY_PAID
                            db.session.commit()
                            
                            # Clear checkout data from session
                            session.pop('checkout_data', None)
                            
                            current_app.logger.info(f'Production mode: Booking {booking.booking_no} created and marked as paid')
                            
                            # Only do guest user flow if current user is not already authenticated
                            from flask_login import current_user as flask_current_user
                            if not flask_current_user.is_authenticated:
                                # Log in the guest customer if they were just created
                                if booking.customer and booking.customer.password_hash == 'GUEST_ACCOUNT_PENDING':
                                    from flask_login import login_user
                                    login_user(booking.customer)
                                    session['user_type'] = 'customer'
                                    session.permanent = True  # Make session persistent
                                    current_app.logger.info(f'🔐 Guest customer {booking.customer.email} logged in successfully')
                                    current_app.logger.info(f'🔐 Customer ID: {booking.customer.id}, First name: {booking.customer.first_name}')
                                    current_app.logger.info(f'🔐 Session user_type set to: {session.get("user_type")}')
                                    current_app.logger.info(f'🔐 Current user authenticated: {booking.customer.is_authenticated}')
                                    
                                    # Send profile completion email for guest customers
                                    try:
                                        from app.services.email_service import email_service
                                        current_app.logger.info(f'📧 Checking guest customer for profile email: {booking.customer.email}')
                                        current_app.logger.info(f'📧 Customer password_hash: {booking.customer.password_hash}')
                                        current_app.logger.info(f'📧 Customer first_name: {booking.customer.first_name}')
                                        current_app.logger.info(f'📧 About to send profile completion email to {booking.customer.email}')
                                        
                                        result = email_service.send_profile_completion_email(
                                            booking.customer.email,
                                            booking.customer.first_name
                                        )
                                        current_app.logger.info(f'📧 Profile completion email sent successfully to {booking.customer.email}: {result}')
                                    except Exception as e:
                                        current_app.logger.error(f'❌ Failed to send profile completion email: {str(e)}')
                                        import traceback
                                        current_app.logger.error(f'❌ Full traceback: {traceback.format_exc()}')
                            else:
                                current_app.logger.info(f'🔐 User already authenticated: {flask_current_user.email}, skipping guest login flow')
                            
                            # Send order confirmation email (always send this)
                            try:
                                from app.services.email_service import email_service
                                result = email_service.send_order_confirmation(
                                    booking.email,
                                    booking.customer_name,
                                    booking
                                )
                                current_app.logger.info(f'Order confirmation email sent to {booking.email}: {result}')
                            except Exception as e:
                                current_app.logger.error(f'Failed to send order confirmation email: {str(e)}')
                        else:
                            current_app.logger.error('Development mode: Failed to create booking from session data')
                    else:
                        current_app.logger.error('Development mode: No checkout data found in session')
                except Exception as e:
                    current_app.logger.error(f'Development mode: Error creating booking: {str(e)}')
            
            # Check again if booking was created
            booking = Booking.query.filter_by(stripe_session_id=session_id).first()
            if not booking:
                flash('Booking not found. Please contact support if you were charged.', 'error')
                return redirect(url_for('public.catalog'))
    elif booking_no:
        # Find booking by booking number
        from sqlalchemy.orm import joinedload
        booking = Booking.query.options(
            joinedload(Booking.items).joinedload(BookingItem.upsell_items)
        ).filter_by(booking_no=booking_no).first_or_404()
    else:
        # No parameters - in development mode, try to create booking from session data
        if current_app.config.get('ENV') == 'development' or current_app.debug:
            current_app.logger.info('Development mode: Creating booking from session data (no session_id)')
            try:
                checkout_data = session.get('checkout_data')
                current_app.logger.info(f'Development mode: Raw checkout_data: {checkout_data}')
                if checkout_data:
                    # Create form object from stored data
                    form = CheckoutForm()
                    form.customer_name.data = checkout_data['form_data']['customer_name']
                    form.email.data = checkout_data['form_data']['email']
                    form.phone.data = checkout_data['form_data']['phone']
                    form.address.data = checkout_data['form_data']['address']
                    form.zip_code.data = checkout_data['form_data']['zip_code']
                    form.city.data = checkout_data['form_data']['city']
                    form.delivery_type.data = checkout_data['form_data']['delivery_type']
                    form.notes.data = checkout_data['form_data']['notes']
                    form.account_number.data = checkout_data['form_data'].get('account_number', '')
                    form.registration_number.data = checkout_data['form_data'].get('registration_number', '')
                    
                    # Debug cart data
                    # Debug information - show in browser
                    debug_info = f"""
                    <h2>Debug Information</h2>
                    <h3>Cart Data:</h3>
                    <pre>{checkout_data['cart_data']}</pre>
                    <h3>Form Data:</h3>
                    <pre>{checkout_data['form_data']}</pre>
                    """
                    
                    current_app.logger.info(f'Development mode: Cart data: {checkout_data["cart_data"]}')
                    current_app.logger.info(f'Development mode: Form data: {checkout_data["form_data"]}')
                    
                    # Create booking from cart data
                    booking = create_booking_from_cart(checkout_data['cart_data'], form)
                    
                    debug_info += f"<h3>Booking Creation Result:</h3><pre>{booking}</pre>"
                    
                    current_app.logger.info(f'Booking creation result: {booking}')
                    
                    if booking:
                        # Update booking status
                        booking.status = BookingStatus.FULLY_PAID
                        db.session.commit()
                        
                        # Reload booking with eager loading for template
                        from sqlalchemy.orm import joinedload
                        booking = Booking.query.options(
                            joinedload(Booking.items).joinedload(BookingItem.upsell_items)
                        ).filter_by(id=booking.id).first()
                        
                        # Clear checkout data from session
                        session.pop('checkout_data', None)
                        
                        current_app.logger.info(f'Booking {booking.booking_no} created and marked as paid')
                        
                        # Only do guest user flow if current user is not already authenticated
                        from flask_login import current_user as flask_current_user
                        if not flask_current_user.is_authenticated:
                            # Log in the guest customer if they were just created
                            if booking.customer and booking.customer.password_hash == 'GUEST_ACCOUNT_PENDING':
                                from flask_login import login_user
                                login_user(booking.customer)
                                session['user_type'] = 'customer'
                                session.permanent = True  # Make session persistent
                                current_app.logger.info(f'🔐 Guest customer {booking.customer.email} logged in successfully')
                                current_app.logger.info(f'🔐 Customer ID: {booking.customer.id}, First name: {booking.customer.first_name}')
                                current_app.logger.info(f'🔐 Session user_type set to: {session.get("user_type")}')
                                current_app.logger.info(f'🔐 Current user authenticated: {booking.customer.is_authenticated}')
                                
                                # Send profile completion email for guest customers
                                try:
                                    from app.services.email_service import email_service
                                    current_app.logger.info(f'📧 Checking guest customer for profile email: {booking.customer.email}')
                                    current_app.logger.info(f'📧 Customer password_hash: {booking.customer.password_hash}')
                                    current_app.logger.info(f'📧 Customer first_name: {booking.customer.first_name}')
                                    current_app.logger.info(f'📧 About to send profile completion email to {booking.customer.email}')
                                    
                                    result = email_service.send_profile_completion_email(
                                        booking.customer.email,
                                        booking.customer.first_name
                                    )
                                    current_app.logger.info(f'📧 Profile completion email sent successfully to {booking.customer.email}: {result}')
                                except Exception as e:
                                    current_app.logger.error(f'❌ Failed to send profile completion email: {str(e)}')
                                    import traceback
                                    current_app.logger.error(f'❌ Full traceback: {traceback.format_exc()}')
                        else:
                            current_app.logger.info(f'🔐 User already authenticated: {flask_current_user.email}, skipping guest login flow')
                        
                        # Send order confirmation email (always send this)
                        try:
                            from app.services.email_service import email_service
                            result = email_service.send_order_confirmation(
                                booking.email,
                                booking.customer_name,
                                booking
                            )
                            current_app.logger.info(f'Order confirmation email sent to {booking.email}: {result}')
                        except Exception as e:
                            current_app.logger.error(f'Failed to send order confirmation email: {str(e)}')
                    else:
                        current_app.logger.error('Development mode: Failed to create booking from session data')
                        return f"""
                        <h1>Booking Creation Failed</h1>
                        {debug_info}
                        <p><strong>Error:</strong> create_booking_from_cart returned None</p>
                        <p><a href="/catalog">Back to Catalog</a></p>
                        """
                else:
                    current_app.logger.error('Development mode: No checkout data found in session')
                    return f"""
                    <h1>No Checkout Data Found</h1>
                    <p><strong>Error:</strong> No checkout_data found in session</p>
                    <h3>Session Contents:</h3>
                    <pre>{dict(session)}</pre>
                    <p><a href="/catalog">Back to Catalog</a></p>
                    """
            except Exception as e:
                import traceback
                current_app.logger.error(f'Development mode: Error creating booking: {str(e)}')
                return f"""
                <h1>Booking Creation Exception</h1>
                <p><strong>Error:</strong> {str(e)}</p>
                <h3>Traceback:</h3>
                <pre>{traceback.format_exc()}</pre>
                <h3>Session Contents:</h3>
                <pre>{dict(session)}</pre>
                <p><a href="/catalog">Back to Catalog</a></p>
                """
        else:
            # Production mode - find booking by session_id
            if session_id:
                booking = Booking.query.filter_by(stripe_session_id=session_id).first()
                if booking:
                    # Log in the guest customer if they were just created
                    if booking.customer and booking.customer.password_hash == 'GUEST_ACCOUNT_PENDING':
                        from flask_login import login_user
                        login_user(booking.customer)
                        session['user_type'] = 'customer'
                        current_app.logger.info(f'🔐 Production: Guest customer {booking.customer.email} logged in successfully')
                        current_app.logger.info(f'🔐 Production: Customer ID: {booking.customer.id}, First name: {booking.customer.first_name}')
                    
                    # Send profile completion email for guest customers
                    if booking.customer and booking.customer.password_hash == 'GUEST_ACCOUNT_PENDING':
                        try:
                            from app.services.email_service import email_service
                            current_app.logger.info(f'📧 Production: Attempting to send profile completion email to {booking.customer.email}')
                            result = email_service.send_profile_completion_email(
                                booking.customer.email,
                                booking.customer.first_name
                            )
                            current_app.logger.info(f'📧 Production: Profile completion email sent to {booking.customer.email}: {result}')
                        except Exception as e:
                            current_app.logger.error(f'❌ Production: Failed to send profile completion email: {str(e)}')
                            import traceback
                            current_app.logger.error(f'❌ Production: Traceback: {traceback.format_exc()}')
            else:
                # No session_id - find most recent booking for current user
                from flask_login import current_user
                if current_user.is_authenticated:
                    booking = Booking.query.filter_by(customer_id=current_user.id).order_by(Booking.created_at.desc()).first()
                    if not booking:
                        flash('No bookings found.', 'error')
                        return redirect(url_for('public.catalog'))
                else:
                    flash('Please log in to view your bookings.', 'error')
                    return redirect(url_for('customer.login'))
    
    # Calculate upsell total
    upsell_total = Decimal('0')
    if booking:
        for item in booking.items:
            for upsell in item.upsell_items:
                upsell_total += upsell.unit_price_dkk * upsell.quantity
    
    return render_template('shop/order_confirmation.html', booking=booking, upsell_total=upsell_total)


@bp.route('/order/<booking_no>/invoice')
def download_invoice(booking_no):
    """Download invoice PDF."""
    booking = Booking.query.filter_by(booking_no=booking_no).first_or_404()
    
    # Generate PDF invoice
    from app.utils.pdf import generate_invoice_pdf
    pdf_data = generate_invoice_pdf(booking)
    
    from flask import make_response
    response = make_response(pdf_data)
    response.headers['Content-Type'] = 'application/pdf'
    response.headers['Content-Disposition'] = f'attachment; filename=faktura_{booking_no}.pdf'
    
    return response


def render_checkout_with_cart_data(form, cart_data):
    """Helper function to render checkout page with cart data."""
    # Process cart products for pricing display
    cart_products = []
    booking_items = []
    delivery_type = DeliveryType.PICKUP
    
    for item in cart_data:
        product = Product.query.filter_by(id=item['product_id'], is_active=True).first()
        if product:
            try:
                if isinstance(item['start_date'], str):
                    start_date = datetime.strptime(item['start_date'], '%Y-%m-%d').date()
                else:
                    start_date = item['start_date']
                    
                if isinstance(item['end_date'], str):
                    end_date = datetime.strptime(item['end_date'], '%Y-%m-%d').date()
                else:
                    end_date = item['end_date']
                    
                item_delivery_type = DeliveryType.PICKUP if item.get('delivery_type') == 'pickup' else DeliveryType.DELIVERY
                if item_delivery_type == DeliveryType.DELIVERY:
                    delivery_type = DeliveryType.DELIVERY

                if start_date and end_date:
                    db_session = current_app.extensions['sqlalchemy'].session
                    pricing_service = PricingService(db_session, current_app.config['VAT_PERCENT'])
                    price_estimate = pricing_service.get_price_estimate(
                        product.id, start_date, end_date, item['quantity'], item_delivery_type
                    )
                    booking_items.append(BookingItemDTO(
                        product_id=product.id,
                        product_name=product.name,
                        quantity=item['quantity'],
                        start_date=start_date,
                        end_date=end_date,
                        delivery_type=item_delivery_type
                    ))
                else:
                    price_estimate = None

                cart_products.append({
                    'product': product,
                    'quantity': item['quantity'],
                    'start_date': start_date,
                    'end_date': end_date,
                    'delivery_type': item_delivery_type,
                    'price_estimate': price_estimate
                })
            except (ValueError, KeyError) as e:
                continue

    total_estimate = Decimal('0')
    delivery_fee = Decimal('0')
    if booking_items:
        db_session = current_app.extensions['sqlalchemy'].session
        pricing_service = PricingService(db_session, current_app.config['VAT_PERCENT'])
        total_pricing = pricing_service.calculate_booking_pricing(booking_items, delivery_type)
        total_estimate = total_pricing.total
        delivery_fee = total_pricing.delivery_fee

    # Calculate upsell total
    upsell_total = Decimal('0')
    for item in cart_data:
        upsells = item.get('upsells', {})
        for upsell_id, quantity in upsells.items():
            upsell_product = UpsellProduct.query.filter_by(id=int(upsell_id), is_active=True).first()
            if upsell_product:
                upsell_total += upsell_product.price_dkk * int(quantity)
    
    total_estimate += upsell_total

    return render_template('shop/checkout.html', 
                         form=form, 
                         cart_products=cart_products, 
                         total_estimate=total_estimate, 
                         delivery_fee=delivery_fee,
                         upsell_total=upsell_total)


def create_booking_from_cart(cart_items: List[Dict], form: CheckoutForm) -> Booking:
    """Create booking from cart items."""
    from app.models import db, Customer
    from app.utils.booking import generate_booking_number
    from flask_login import current_user
    
    try:
        current_app.logger.info(f'Starting booking creation with {len(cart_items)} cart items')
        
        if not cart_items:
            current_app.logger.error('No cart items provided')
            return None
        
        # Generate booking number
        booking_no = generate_booking_number()
        current_app.logger.info(f'Generated booking number: {booking_no}')
        
        # Calculate pricing
        pricing_service = PricingService(db.session, current_app.config['VAT_PERCENT'])
        current_app.logger.info('Pricing service created')
        
        booking_items_dto = []
        current_app.logger.info('Processing cart items...')
        for i, item in enumerate(cart_items):
            current_app.logger.info(f'Processing item {i+1}: product_id={item.get("product_id")}, quantity={item.get("quantity")}')
            
            product = Product.query.get(item['product_id'])
            if not product:
                current_app.logger.warning(f'Product not found for ID: {item.get("product_id")}')
                continue
                
            # Handle both date objects (from database) and date strings (from session)
            if isinstance(item['start_date'], str):
                try:
                    # Try the expected format first
                    start_date = datetime.strptime(item['start_date'], '%Y-%m-%d').date()
                except ValueError:
                    try:
                        # Try parsing as ISO format with timezone
                        start_date = datetime.fromisoformat(item['start_date'].replace('Z', '+00:00')).date()
                    except ValueError:
                        try:
                            # Try parsing as GMT format
                            start_date = datetime.strptime(item['start_date'], '%a, %d %b %Y %H:%M:%S %Z').date()
                        except ValueError:
                            current_app.logger.error(f'Could not parse start_date: {item["start_date"]}')
                            continue
            else:
                start_date = item['start_date']
                
            if isinstance(item['end_date'], str):
                try:
                    # Try the expected format first
                    end_date = datetime.strptime(item['end_date'], '%Y-%m-%d').date()
                except ValueError:
                    try:
                        # Try parsing as ISO format with timezone
                        end_date = datetime.fromisoformat(item['end_date'].replace('Z', '+00:00')).date()
                    except ValueError:
                        try:
                            # Try parsing as GMT format
                            end_date = datetime.strptime(item['end_date'], '%a, %d %b %Y %H:%M:%S %Z').date()
                        except ValueError:
                            current_app.logger.error(f'Could not parse end_date: {item["end_date"]}')
                            continue
            else:
                end_date = item['end_date']
                
            # Use form delivery type for all items
            delivery_type = DeliveryType.PICKUP if form.delivery_type.data == 'pickup' else DeliveryType.DELIVERY
            current_app.logger.info(f'Item dates: {start_date} to {end_date}, delivery: {delivery_type}')
            
            booking_items_dto.append(BookingItemDTO(
                product_id=product.id,
                product_name=product.name,
                quantity=item['quantity'],
                start_date=start_date,
                end_date=end_date,
                delivery_type=delivery_type
            ))
        
        if not booking_items_dto:
            current_app.logger.error('No valid booking items after processing cart')
            return None
            
        current_app.logger.info(f'Calculating pricing for {len(booking_items_dto)} items')
        # Use the same delivery type that was set for all items
        delivery_type_for_pricing = DeliveryType.PICKUP if form.delivery_type.data == 'pickup' else DeliveryType.DELIVERY
        current_app.logger.info(f'Delivery type for pricing: {delivery_type_for_pricing}')
        
        # Calculate pricing with address for delivery breakdown
        customer_address = form.address.data if form.address.data else None
        customer_zip = form.zip_code.data if form.zip_code.data else None
        customer_city = form.city.data if form.city.data else None
        
        pricing = pricing_service.calculate_booking_pricing(
            booking_items_dto, 
            delivery_type_for_pricing,
            customer_address,
            customer_zip,
            customer_city
        )
        current_app.logger.info(f'Pricing calculated: total={pricing.total}, deposit={pricing.deposit_amount}, delivery={pricing.delivery_fee}')
        
        # Calculate delivery breakdown if delivery fee > 0
        delivery_breakdown = None
        if pricing.delivery_fee > 0 and delivery_type_for_pricing == DeliveryType.DELIVERY:
            from app.models import DeliverySetting, CompanyLocation
            from app.services.distance import DistanceService
            
            delivery_setting = DeliverySetting.query.filter_by(type=DeliveryType.DELIVERY).first()
            if delivery_setting:
                distance_km = None
                if customer_address and customer_zip and customer_city:
                    company_location = CompanyLocation.query.first()
                    if company_location:
                        distance_service = DistanceService()
                        distance_km = distance_service.calculate_distance(
                            company_location.latitude, company_location.longitude,
                            customer_address, customer_zip, customer_city
                        )
                
                delivery_breakdown = {
                    'base_fee': float(delivery_setting.base_fee_dkk),
                    'per_km_fee': float(delivery_setting.per_km_fee_dkk),
                    'free_delivery_km': delivery_setting.free_delivery_km,
                    'distance_km': round(distance_km, 2) if distance_km else None,
                    'chargeable_km': max(0, (distance_km or 0) - delivery_setting.free_delivery_km) if distance_km else None,
                    'km_fee': float(delivery_setting.per_km_fee_dkk) * max(0, (distance_km or 0) - delivery_setting.free_delivery_km) if distance_km else 0
                }
                current_app.logger.info(f'Delivery breakdown calculated: {delivery_breakdown}')
        
        # Find or create customer
        current_app.logger.info('Finding or creating customer...')
        customer = None
        if current_user.is_authenticated:
            customer = current_user
            current_app.logger.info(f'Using authenticated customer: {customer.id}')
        else:
            # Try to find existing customer by email
            customer = Customer.query.filter_by(email=form.email.data).first()
            if not customer:
                current_app.logger.info('Creating new customer...')
                # Split customer name into first and last name
                name_parts = form.customer_name.data.strip().split(' ', 1)
                first_name = name_parts[0] if name_parts else 'Guest'
                last_name = name_parts[1] if len(name_parts) > 1 else 'Customer'
                
                # Create new guest customer (without password initially)
                customer = Customer(
                    first_name=first_name,
                    last_name=last_name,
                    email=form.email.data,
                    phone=form.phone.data,
                    address=form.address.data,
                    zip_code=form.zip_code.data,
                    city=form.city.data,
                    email_verified=False,  # Will be verified when they complete profile
                    password_hash='GUEST_ACCOUNT_PENDING'  # Placeholder for guest accounts
                )
                db.session.add(customer)
                db.session.flush()  # Get customer ID
                current_app.logger.info(f'New customer created with ID: {customer.id}')
            else:
                current_app.logger.info(f'Found existing customer: {customer.id}')
        
        if not customer:
            current_app.logger.error('Failed to create or find customer')
            return None
        
        # Create booking
        current_app.logger.info('Creating booking object...')
        booking = Booking(
            booking_no=booking_no,
            customer_id=customer.id,
            customer_name=form.customer_name.data,
            email=form.email.data,
            phone=form.phone.data,
            address=form.address.data,
            zip_code=form.zip_code.data,
            city=form.city.data,
            start_date=booking_items_dto[0].start_date,  # Use first item's dates
            end_date=booking_items_dto[0].end_date,
            subtotal_dkk=pricing.subtotal,
            vat_dkk=pricing.vat_amount,
            deposit_dkk=pricing.deposit_amount,
            delivery_fee_dkk=pricing.delivery_fee,
            delivery_breakdown=delivery_breakdown,
            total_dkk=pricing.total,
            upfront_payment_dkk=pricing.upfront_payment,  # What customer pays now
            remaining_payment_dkk=pricing.remaining_payment,  # What customer pays after return
            status=BookingStatus.PENDING,
            notes=form.notes.data,
            account_number=getattr(form.account_number, 'data', None),
            registration_number=getattr(form.registration_number, 'data', None)
        )
        
        current_app.logger.info('Adding booking to database...')
        db.session.add(booking)
        db.session.flush()  # Get booking ID
        current_app.logger.info(f'Booking added to database with ID: {booking.id}')
        
        # Create booking items and their upsells
        for i, item_dto in enumerate(booking_items_dto):
            product = Product.query.get(item_dto.product_id)
            unit_price = pricing.line_items[i].unit_price if i < len(pricing.line_items) else product.daily_price_dkk
            
            booking_item = BookingItem(
                booking_id=booking.id,
                product_id=item_dto.product_id,
                quantity=item_dto.quantity,
                unit_price_dkk=unit_price,
                name_snapshot=item_dto.product_name
            )
            db.session.add(booking_item)
            db.session.flush()  # Get booking_item.id
            
            # Find corresponding cart item and create upsell items
            cart_item = cart_items[i] if i < len(cart_items) else None
            if cart_item:
                upsells = cart_item.get('upsells', {})
                for upsell_id, quantity in upsells.items():
                    upsell_product = UpsellProduct.query.filter_by(id=int(upsell_id), is_active=True).first()
                    if upsell_product:
                        booking_upsell = BookingUpsellItem(
                            booking_item_id=booking_item.id,
                            upsell_product_id=int(upsell_id),
                            quantity=int(quantity),
                            unit_price_dkk=upsell_product.price_dkk,
                            name_snapshot=upsell_product.name
                        )
                        db.session.add(booking_upsell)
                        current_app.logger.info(f'Added upsell: {upsell_product.name} x{quantity} for {upsell_product.price_dkk} DKK')
        
        current_app.logger.info('Committing booking to database...')
        db.session.commit()
        current_app.logger.info('Booking successfully committed to database')
        
        # Clear cart
        session.pop('cart', None)
        
        # Store customer info for future use
        session['customer_email'] = form.email.data
        session['customer_name'] = form.customer_name.data
        session['phone'] = form.phone.data
        session['address'] = form.address.data
        session['zip_code'] = form.zip_code.data
        session['city'] = form.city.data
        
        current_app.logger.info(f'Booking creation completed successfully: {booking.booking_no}')
        return booking
        
    except Exception as e:
        import traceback
        current_app.logger.error(f'Error creating booking: {str(e)}')
        current_app.logger.error(f'Traceback: {traceback.format_exc()}')
        db.session.rollback()
        return None


def create_stripe_session_from_cart(total_amount: Decimal, customer_name: str, customer_email: str):
    """Create Stripe checkout session from cart data (before booking creation)."""
    if stripe is None:
        raise Exception("Stripe module is not available")
    
    try:
        # Test if stripe module is properly imported
        current_app.logger.info(f'Stripe module type: {type(stripe)}')
        current_app.logger.info(f'Stripe module attributes: {dir(stripe)}')
        
        stripe_secret_key = current_app.config.get('STRIPE_SECRET_KEY')
        if not stripe_secret_key:
            raise Exception("Stripe secret key is not configured")
        
        stripe.api_key = stripe_secret_key
        current_app.logger.info(f'Stripe API key set successfully')
    except Exception as e:
        current_app.logger.error(f'Error in Stripe setup: {e}')
        raise
    
    # Charge the full amount upfront (rental + deposit + delivery)
    unit_amount = int(total_amount * 100)
    current_app.logger.info(f'Stripe line item: {unit_amount} øre (DKK {total_amount})')
    
    if unit_amount <= 0:
        raise ValueError(f'Invalid amount for Stripe: {total_amount} DKK')
    
    line_items = [{
        'price_data': {
            'currency': 'dkk',
            'product_data': {
                'name': f'HighendEvent Booking - {customer_name}',
            },
            'unit_amount': unit_amount,
        },
        'quantity': 1,
    }]
    
    # Create the session first
    try:
        current_app.logger.info(f'About to create Stripe session with line_items: {line_items}')
        
        # Import stripe dynamically to ensure it's properly loaded
        import stripe as local_stripe
        local_stripe.api_key = stripe_secret_key
        
        # Debug stripe checkout module
        current_app.logger.info(f'Stripe version: {getattr(local_stripe, "__version__", "unknown")}')
        current_app.logger.info(f'Stripe checkout object: {local_stripe.checkout}')
        current_app.logger.info(f'Stripe checkout type: {type(local_stripe.checkout)}')
        
        # Try different ways to access the Session class
        try:
            if hasattr(local_stripe.checkout, 'Session'):
                session_class = local_stripe.checkout.Session
            else:
                # Fallback: try importing directly
                from stripe.checkout import Session as StripeSession
                session_class = StripeSession
            current_app.logger.info(f'Using session class: {session_class}')
        except (ImportError, AttributeError) as e:
            current_app.logger.error(f'Could not import Stripe Session class: {e}')
            # Try yet another fallback - use the old stripe module approach
            try:
                if hasattr(stripe, 'checkout') and hasattr(stripe.checkout, 'Session'):
                    session_class = stripe.checkout.Session
                    current_app.logger.info('Using global stripe.checkout.Session')
                else:
                    raise Exception('Stripe Session class not available in any form')
            except Exception as e2:
                current_app.logger.error(f'All Stripe Session import methods failed: {e2}')
                raise Exception('Stripe Session class not available')
        
        # Try to create the session with multiple fallback approaches
        checkout_session = None
        session_id = None
        
        # Approach 1: Try standard creation
        try:
            checkout_session = session_class.create(
                payment_method_types=['card'],
                line_items=line_items,
                mode='payment',
                success_url=url_for('shop.order_confirmation', _external=True),
                cancel_url=url_for('shop.checkout', _external=True),
                customer_email=customer_email,
                metadata={
                    'checkout_type': 'cart_based'
                }
            )
            current_app.logger.info('Stripe session created successfully with full parameters')
        except Exception as e1:
            current_app.logger.error(f'Full parameter Stripe session failed: {e1}')
            
            # Approach 2: Try with minimal parameters
            try:
                checkout_session = session_class.create(
                    payment_method_types=['card'],
                    line_items=line_items,
                    mode='payment',
                    success_url=url_for('shop.order_confirmation', _external=True),
                    cancel_url=url_for('shop.checkout', _external=True)
                )
                current_app.logger.info('Stripe session created with minimal parameters')
            except Exception as e2:
                current_app.logger.error(f'Minimal parameter Stripe session failed: {e2}')
                
                # Approach 3: Use raw API request as last resort
                try:
                    import requests
                    
                    stripe_secret_key = current_app.config.get('STRIPE_SECRET_KEY')
                    
                    # Create session via direct API call
                    headers = {
                        'Authorization': f'Bearer {stripe_secret_key}',
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                    
                    data = {
                        'payment_method_types[]': 'card',
                        'line_items[0][price_data][currency]': 'dkk',
                        'line_items[0][price_data][product_data][name]': f'HighendEvent Booking - {customer_name}',
                        'line_items[0][price_data][unit_amount]': int(total_amount * 100),
                        'line_items[0][quantity]': 1,
                        'mode': 'payment',
                        'success_url': url_for('shop.order_confirmation', _external=True) + '?session_id={CHECKOUT_SESSION_ID}',
                        'cancel_url': url_for('shop.checkout', _external=True),
                        'metadata[checkout_type]': 'cart_based'
                    }
                    
                    response = requests.post('https://api.stripe.com/v1/checkout/sessions', headers=headers, data=data)
                    
                    if response.status_code == 200:
                        session_data = response.json()
                        session_id = session_data.get('id')
                        session_url = session_data.get('url')
                        current_app.logger.info(f'Created Stripe session via direct API: {session_id}')
                        
                        # Create a minimal session object for compatibility
                        class MockSession:
                            def __init__(self, session_id, url):
                                self.id = session_id
                                self.url = url
                        
                        checkout_session = MockSession(session_id, session_url)
                    else:
                        current_app.logger.error(f'Direct API call failed: {response.status_code} - {response.text}')
                        raise Exception(f'All Stripe session creation methods failed')
                        
                except Exception as e3:
                    current_app.logger.error(f'Direct API approach failed: {e3}')
                    raise Exception(f'All Stripe session creation methods failed: {e3}')
        current_app.logger.info(f'Stripe session created successfully: {checkout_session.id}')
    except Exception as e:
        current_app.logger.error(f'Error creating Stripe session: {e}')
        current_app.logger.error(f'Error type: {type(e)}')
        raise
    
    return checkout_session


def create_stripe_session(booking: Booking):
    """Create Stripe checkout session."""
    stripe_secret_key = current_app.config.get('STRIPE_SECRET_KEY')
    if not stripe_secret_key:
        raise Exception("Stripe secret key is not configured")
    
    stripe.api_key = stripe_secret_key
    
    # Refresh booking to ensure items are loaded
    db.session.refresh(booking)
    
    # Check if booking has items
    if not booking.items:
        raise Exception("Booking has no items")
    
    # Create line items for Stripe - only deposit and delivery fee
    line_items = []
    # Note: Rental items are paid separately after return
    
    # Charge the full amount upfront (rental + deposit + delivery)
    unit_amount = int(booking.total_dkk * 100)
    current_app.logger.info(f'Stripe line item: {unit_amount} øre (DKK {booking.total_dkk})')
    
    if unit_amount <= 0:
        raise ValueError(f'Invalid amount for Stripe: {booking.total_dkk} DKK')
    
    line_items.append({
        'price_data': {
            'currency': 'dkk',
            'product_data': {
                'name': f'Booking #{booking.booking_no} - {booking.customer_name}',
            },
            'unit_amount': unit_amount,
        },
        'quantity': 1,
    })
    
    # Note: VAT is already included in prices, so no separate VAT line item needed
    
    checkout_session = stripe.checkout.Session.create(
        payment_method_types=['card'],
        line_items=line_items,
        mode='payment',
        success_url=url_for('shop.order_confirmation', booking_no=booking.booking_no, _external=True),
        cancel_url=url_for('shop.checkout', _external=True),
        customer_email=booking.email,
        metadata={
            'booking_id': str(booking.id),
            'booking_no': booking.booking_no
        }
    )
    
    # Update booking with Stripe session ID
    booking.stripe_session_id = checkout_session.id
    db.session.commit()
    
    return checkout_session

@bp.route('/debug-test-pricing')
def debug_test_pricing():
    """Debug route to test pricing calculation with hardcoded data."""
    from flask import jsonify
    from app.services.pricing import PricingService
    from app.models import Product, DeliveryType
    from datetime import date, timedelta
    
    try:
        # Create test cart data
        test_cart_data = [{
            'product_id': 2,  # Popcorn Maskine
            'quantity': 1,
            'delivery_type': 'delivery',
            'start_date': (date.today() + timedelta(days=7)).strftime('%Y-%m-%d'),
            'end_date': (date.today() + timedelta(days=9)).strftime('%Y-%m-%d')
        }]
        
        # Get product
        product = Product.query.get(2)
        if not product:
            return jsonify({'error': 'Product not found'}), 400
        
        # Calculate pricing
        pricing_service = PricingService(db.session, Decimal(str(current_app.config['VAT_PERCENT'])))
        delivery_type_enum = DeliveryType.DELIVERY
        
        # Calculate for each item
        total_rental = Decimal('0')
        total_deposit = Decimal('0')
        delivery_fee = Decimal('0')
        
        for item in test_cart_data:
            start_date = date.fromisoformat(item['start_date'])
            end_date = date.fromisoformat(item['end_date'])
            
            price_estimate = pricing_service.get_price_estimate(
                product_id=item['product_id'],
                start_date=start_date,
                end_date=end_date,
                quantity=item['quantity'],
                delivery_type=delivery_type_enum
            )
            
            total_rental += Decimal(str(price_estimate['subtotal']))
            total_deposit += Decimal(str(price_estimate['deposit_amount']))
            delivery_fee = Decimal(str(price_estimate['delivery_fee']))
        
        total_estimate = total_rental + total_deposit + delivery_fee
        
        return jsonify({
            'total_rental': float(total_rental),
            'total_deposit': float(total_deposit),
            'delivery_fee': float(delivery_fee),
            'total_estimate': float(total_estimate)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/api/address-search', methods=['POST'])
def address_search():
    """Search for addresses using Danish address API."""
    try:
        data = request.get_json()
        query = data.get('query', '').strip()
        
        if len(query) < 3:
            return jsonify({'addresses': []})
        
        # Use Danish address API (DAWA - Danmarks Adressers Web API)
        import requests
        
        # Search for addresses using a different approach
        search_url = "https://api.dataforsyningen.dk/adresser"
        params = {
            'q': query,
            'limit': 10,
            'struktur': 'mini',
            'fuzzy': 'true'
        }
        
        response = requests.get(search_url, params=params, timeout=5)
        response.raise_for_status()
        
        addresses = response.json()
        current_app.logger.info(f'Address search for "{query}" returned {len(addresses)} results')
        current_app.logger.info(f'Raw API response: {addresses[:2] if addresses else "No results"}')
        
        # Format addresses for frontend
        formatted_addresses = []
        seen_addresses = set()  # To avoid duplicates
        
        for addr in addresses:
            # Extract address components
            street_name = addr.get('vejnavn', '')
            house_number = addr.get('husnr', '')
            floor = addr.get('etage', '')
            door = addr.get('dør', '')
            zip_code = addr.get('postnr', '')
            city = addr.get('postnrnavn', '')
            
            # Build full address
            address_parts = [street_name]
            if house_number:
                address_parts.append(house_number)
            if floor:
                address_parts.append(f'{floor}.')
            if door:
                address_parts.append(f'{door}.')
            
            full_address = ' '.join(address_parts)
            address_text = f"{full_address}, {zip_code} {city}"
            
            # Skip duplicates
            if address_text in seen_addresses:
                continue
            seen_addresses.add(address_text)
            
            formatted_addresses.append({
                'text': address_text,
                'address': full_address,
                'zip_code': zip_code,
                'city': city,
                'latitude': addr.get('y', 0),  # y is latitude in Danish API
                'longitude': addr.get('x', 0)  # x is longitude in Danish API
            })
            current_app.logger.info(f'Formatted address: {address_text}')
        
        return jsonify({'addresses': formatted_addresses})
        
    except Exception as e:
        current_app.logger.error(f'Address search error: {e}')
        return jsonify({'addresses': [], 'error': str(e)}), 500


@bp.route('/debug-calculate-pricing')
def debug_calculate_pricing():
    """Debug route to test the calculate_pricing endpoint logic."""
    from flask import request, jsonify
    from flask_login import current_user
    from app.models import Product, DeliveryType
    from datetime import datetime
    
    try:
        # Simulate the same logic as calculate_pricing endpoint
        delivery_type = request.args.get('delivery_type', 'pickup')
        
        current_app.logger.info(f'Debug calculate pricing: delivery_type={delivery_type}, user_authenticated={current_user.is_authenticated}')
        
        if current_user.is_authenticated and hasattr(current_user, 'cart_items'):
            # User-based cart
            cart_items = current_user.cart_items
            cart_data = []
            for item in cart_items:
                cart_data.append({
                    'product_id': item.product_id,
                    'quantity': item.quantity,
                    'delivery_type': item.delivery_type,
                    'start_date': item.start_date,
                    'end_date': item.end_date
                })
            current_app.logger.info(f'User cart data: {cart_data}')
        else:
            # Session-based cart
            cart_data = session.get('cart', [])
            current_app.logger.info(f'Session cart data: {cart_data}')
        
        if not cart_data:
            return jsonify({'error': 'Cart is empty'}), 400
        
        # Validate cart data format
        for i, item in enumerate(cart_data):
            current_app.logger.info(f'Cart item {i}: {item}')
            if not all(key in item for key in ['product_id', 'quantity', 'start_date', 'end_date']):
                current_app.logger.error(f'Invalid cart item format: {item}')
                return jsonify({'error': 'Invalid cart item format'}), 400
        
        # Calculate pricing
        total_rental = Decimal('0')
        total_deposit = Decimal('0')
        delivery_fee = Decimal('0')
        delivery_type_enum = DeliveryType.PICKUP if delivery_type == 'pickup' else DeliveryType.DELIVERY
        
        for item in cart_data:
            product = Product.query.filter_by(id=item['product_id'], is_active=True).first()
            if product:
                try:
                    # Handle both date objects (from database) and date strings (from session)
                    if isinstance(item['start_date'], str):
                        start_date = datetime.strptime(item['start_date'], '%Y-%m-%d').date()
                    else:
                        start_date = item['start_date']
                    
                    if isinstance(item['end_date'], str):
                        end_date = datetime.strptime(item['end_date'], '%Y-%m-%d').date()
                    else:
                        end_date = item['end_date']
                    
                    if start_date and end_date:
                        db_session = current_app.extensions['sqlalchemy'].session
                        pricing_service = PricingService(db_session, Decimal(str(current_app.config['VAT_PERCENT'])))
                        price_estimate = pricing_service.get_price_estimate(
                            product.id, start_date, end_date, item['quantity'], delivery_type_enum
                        )
                        
                        total_rental += Decimal(str(price_estimate['subtotal']))
                        total_deposit += Decimal(str(price_estimate['deposit_amount']))
                        delivery_fee = Decimal(str(price_estimate['delivery_fee']))
                        
                except Exception as e:
                    current_app.logger.error(f'Error calculating pricing for item {item}: {str(e)}')
                    return jsonify({'error': f'Pricing calculation error: {str(e)}'}), 500
        
        total_estimate = total_rental + total_deposit + delivery_fee
        
        return jsonify({
            'total_rental': float(total_rental),
            'total_deposit': float(total_deposit),
            'delivery_fee': float(delivery_fee),
            'total_estimate': float(total_estimate)
        })
        
    except Exception as e:
        current_app.logger.error(f'Debug calculate pricing error: {str(e)}')
        return jsonify({'error': str(e)}), 500
