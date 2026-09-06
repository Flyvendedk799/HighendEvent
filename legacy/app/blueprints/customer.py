"""Customer blueprint for customer portal and authentication."""

from flask import Blueprint, render_template, request, redirect, url_for, flash, session, current_app, jsonify
from flask_login import login_user, logout_user, login_required, current_user
from flask_wtf.csrf import validate_csrf
from werkzeug.exceptions import BadRequest
from datetime import datetime
from decimal import Decimal

from app.models import Customer, Booking, BookingStatus, BookingItem, db
from sqlalchemy.orm import joinedload
from app.forms import CustomerRegistrationForm, CustomerLoginForm, ProfileCompletionForm
from app.services.pricing import PricingService

bp = Blueprint('customer', __name__)


@bp.route('/register', methods=['GET', 'POST'])
def register():
    """Customer registration."""
    if current_user.is_authenticated:
        return redirect(url_for('customer.dashboard'))
    
    form = CustomerRegistrationForm()
    
    if form.validate_on_submit():
        # Check if customer already exists
        existing_customer = Customer.query.filter_by(email=form.email.data).first()
        if existing_customer:
            flash('En kunde med denne e-mail adresse eksisterer allerede', 'error')
            return render_template('customer/register.html', form=form)
        
        # Create new customer
        customer = Customer(
            first_name=form.first_name.data,
            last_name=form.last_name.data,
            email=form.email.data,
            phone=form.phone.data,
            address=form.address.data,
            zip_code=form.zip_code.data,
            city=form.city.data,
            email_verified=True  # Auto-verify for now
        )
        customer.set_password(form.password.data)
        
        db.session.add(customer)
        db.session.commit()
        
        # Send welcome email
        try:
            from app.services.email_service import email_service
            email_service.send_welcome_email(customer.email, customer.first_name)
        except Exception as e:
            print(f"Failed to send welcome email: {e}")
            # Don't fail registration if email fails
        
        flash('Din konto er oprettet! Du kan nu logge ind.', 'success')
        return redirect(url_for('customer.login'))
    
    return render_template('customer/register.html', form=form)


@bp.route('/login', methods=['GET', 'POST'])
def login():
    """Customer login."""
    if current_user.is_authenticated:
        return redirect(url_for('customer.dashboard'))
    
    form = CustomerLoginForm()
    
    if form.validate_on_submit():
        customer = Customer.query.filter_by(email=form.email.data).first()
        
        if customer and customer.check_password(form.password.data) and customer.is_active:
            login_user(customer, remember=form.remember_me.data)
            session['user_type'] = 'customer'
            customer.last_login = datetime.utcnow()
            db.session.commit()
            
            next_page = request.args.get('next')
            if not next_page or not next_page.startswith('/'):
                next_page = url_for('customer.dashboard')
            
            flash(f'Velkommen tilbage, {customer.first_name}!', 'success')
            return redirect(next_page)
        else:
            flash('Ugyldig e-mail eller adgangskode', 'error')
    
    return render_template('customer/login.html', form=form)


@bp.route('/complete-profile', methods=['GET', 'POST'])
def complete_profile():
    """Complete customer profile after order."""
    token = request.args.get('token')
    if not token:
        flash('Ugyldig link', 'error')
        return redirect(url_for('public.index'))
    
    # Find customer by email (token is the email)
    try:
        from urllib.parse import unquote
        email = unquote(token)
        customer = Customer.query.filter_by(email=email, password_hash='GUEST_ACCOUNT_PENDING').first()
        
        if not customer:
            flash('Ugyldig eller udløbet link', 'error')
            return redirect(url_for('public.index'))
        
        form = ProfileCompletionForm()
        
        if form.validate_on_submit():
            # Complete the customer profile
            customer.set_password(form.password.data)
            customer.email_verified = True
            db.session.commit()
            
            # Log the customer in
            login_user(customer)
            session['user_type'] = 'customer'
            customer.last_login = datetime.utcnow()
            db.session.commit()
            
            flash(f'Velkommen, {customer.first_name}! Din profil er nu komplet.', 'success')
            return redirect(url_for('customer.dashboard'))
        
        return render_template('customer/complete_profile.html', form=form, customer=customer)
        
    except Exception as e:
        flash('Der opstod en fejl', 'error')
        return redirect(url_for('public.index'))


@bp.route('/logout')
@login_required
def logout():
    """Customer logout."""
    logout_user()
    session.pop('user_type', None)
    flash('Du er nu logget ud', 'info')
    return redirect(url_for('public.index'))


@bp.route('/dashboard')
@login_required
def dashboard():
    """Customer dashboard showing bookings and outstanding payments."""
    # Get customer's bookings (exclude deleted bookings)
    bookings = Booking.query.options(
        joinedload(Booking.items).joinedload(BookingItem.upsell_items)
    ).filter(
        Booking.customer_id == current_user.id,
        Booking.is_deleted == False
    ).order_by(Booking.created_at.desc()).all()
    
    # Outstanding = damage fees only (deposit feature removed; everything else paid upfront)
    outstanding_bookings = []
    total_outstanding = Decimal('0.00')

    for booking in bookings:
        if booking.status == BookingStatus.RETURNED_DAMAGED and booking.damage_fee_dkk and booking.damage_fee_dkk > 0:
            outstanding_bookings.append({
                'booking': booking,
                'outstanding_amount': booking.damage_fee_dkk,
            })
            total_outstanding += booking.damage_fee_dkk

    # Calculate upsell totals for each booking
    booking_upsells = {}
    for booking in bookings:
        upsell_total = Decimal('0')
        for item in booking.items:
            for upsell in item.upsell_items:
                upsell_total += upsell.unit_price_dkk * upsell.quantity
        booking_upsells[booking.id] = upsell_total
    
    return render_template('customer/dashboard.html', 
                         bookings=bookings,
                         outstanding_bookings=outstanding_bookings,
                         total_outstanding=total_outstanding,
                         booking_upsells=booking_upsells)


@bp.route('/bookings/<int:booking_id>')
@login_required
def booking_detail(booking_id):
    """Customer booking detail view."""
    booking = Booking.query.options(
        joinedload(Booking.items).joinedload(BookingItem.upsell_items)
    ).filter(
        Booking.id == booking_id, 
        Booking.customer_id == current_user.id,
        Booking.is_deleted == False
    ).first_or_404()
    
    # Outstanding = damage fees only (everything else paid upfront)
    outstanding_amount = Decimal('0.00')
    if booking.status == BookingStatus.RETURNED_DAMAGED and booking.damage_fee_dkk:
        outstanding_amount = booking.damage_fee_dkk

    # Calculate upsell total
    upsell_total = Decimal('0')
    for item in booking.items:
        for upsell in item.upsell_items:
            upsell_total += upsell.unit_price_dkk * upsell.quantity
    
    return render_template('customer/booking_detail.html', 
                         booking=booking,
                         outstanding_amount=outstanding_amount,
                         upsell_total=upsell_total)
