"""Admin blueprint for backoffice functionality."""

from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify, current_app, session
from flask_login import login_required, current_user, login_user, logout_user
from flask_wtf.csrf import validate_csrf
from werkzeug.exceptions import BadRequest
from werkzeug.utils import secure_filename
from sqlalchemy import desc, func, and_, or_
from sqlalchemy.orm import Session
from datetime import datetime, date, timedelta
from decimal import Decimal
import os
import uuid

from app import db, csrf

from app.models import (
    User, Product, Category, Booking, BookingItem, BookingStatus, 
    BlackoutDate, DeliverySetting, CompanyLocation, CMSBlock, UserRole, UpsellProduct, ProductUpsell, NewsletterSubscription, ProductImage
)
from app.forms import (
    LoginForm, ProductForm, CategoryForm, BlackoutDateForm, 
    CMSBlockForm, DeliverySettingForm, CompanyLocationForm, UpsellProductForm, ProductImageForm, BulkImageUploadForm
)
from app.services.availability import AvailabilityService
from app.services.pricing import PricingService
from app.services.distance import DistanceService

bp = Blueprint('admin', __name__)

def allowed_file(filename):
    """Check if file extension is allowed."""
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def save_uploaded_file(file, upload_folder=None):
    """Save uploaded file and return the filename."""
    if file and allowed_file(file.filename):
        # Generate unique filename
        filename = secure_filename(file.filename)
        name, ext = os.path.splitext(filename)
        unique_filename = f"{name}_{uuid.uuid4().hex[:8]}{ext}"
        
        # Set upload folder - use absolute path based on current app instance
        if upload_folder is None:
            from flask import current_app
            upload_folder = os.path.join(current_app.root_path, 'static', 'images')
        
        # Ensure upload directory exists
        os.makedirs(upload_folder, exist_ok=True)
        
        # Save file
        file_path = os.path.join(upload_folder, unique_filename)
        file.save(file_path)
        
        # Log the successful upload
        current_app.logger.info(f'File uploaded successfully to: {file_path}')
        
        # Return just the filename (image filter will handle the /static/images/ part)
        return unique_filename
    return None


@bp.route('/login', methods=['GET', 'POST'])
def login():
    """Admin login page."""
    if current_user.is_authenticated:
        return redirect(url_for('admin.dashboard'))
    
    form = LoginForm()
    if form.validate_on_submit():
        user = User.query.filter_by(email=form.email.data).first()
        if user and user.check_password(form.password.data) and user.is_active:
            login_user(user, remember=form.remember_me.data)
            session['user_type'] = 'admin'
            next_page = request.args.get('next')
            return redirect(next_page) if next_page else redirect(url_for('admin.dashboard'))
        else:
            flash('Ugyldig e-mail eller adgangskode', 'error')
    
    return render_template('admin/login.html', form=form)


@bp.route('/logout')
@login_required
def logout():
    """Admin logout."""
    logout_user()
    session.pop('user_type', None)
    flash('Du er nu logget ud', 'info')
    return redirect(url_for('public.index'))


@bp.route('/')
@login_required
def dashboard():
    """Admin dashboard with KPIs."""
    # Get date ranges
    today = date.today()
    week_start = today - timedelta(days=today.weekday())
    month_start = today.replace(day=1)
    
    # Bookings this week
    bookings_this_week = Booking.query.filter(
        Booking.created_at >= week_start,
        Booking.status != BookingStatus.CANCELLED,
        Booking.is_deleted == False
    ).count()
    
    # Bookings this month
    bookings_this_month = Booking.query.filter(
        Booking.created_at >= month_start,
        Booking.status != BookingStatus.CANCELLED,
        Booking.is_deleted == False
    ).count()
    
    # Revenue this month
    revenue_this_month = Booking.query.filter(
        Booking.created_at >= month_start,
        Booking.status.in_([BookingStatus.DEPOSIT_PAID, BookingStatus.DEPOSIT_REFUNDED, BookingStatus.FULLY_PAID]),
        Booking.is_deleted == False
    ).with_entities(func.sum(Booking.total_dkk)).scalar() or Decimal('0')
    
    # Upcoming pickups (next 7 days)
    upcoming_pickups = Booking.query.filter(
        Booking.start_date <= today + timedelta(days=7),
        Booking.start_date >= today,
        Booking.status.in_([BookingStatus.DEPOSIT_PAID, BookingStatus.OUT_FOR_DELIVERY]),
        Booking.is_deleted == False
    ).order_by(Booking.start_date).all()
    
    # Recent bookings (exclude deleted)
    recent_bookings = Booking.query.filter(
        Booking.is_deleted == False
    ).order_by(desc(Booking.created_at)).limit(10).all()
    
    # Deposit refund management
    pending_deposit_refunds = Booking.query.filter(
        Booking.status == BookingStatus.RETURNED_GOOD,
        Booking.deposit_refunded == False,
        Booking.is_deleted == False
    ).order_by(Booking.end_date).all()
    
    # Bookings awaiting return
    awaiting_return = Booking.query.filter(
        Booking.status == BookingStatus.OUT_FOR_DELIVERY,
        Booking.end_date <= today,
        Booking.is_deleted == False
    ).order_by(Booking.end_date).all()
    
    # Product utilization (simplified)
    product_stats = []
    products = Product.query.filter(Product.is_active == True).all()
    for product in products:
        # Count bookings for this product in the last 30 days
        bookings_count = Booking.query.join(BookingItem).filter(
            BookingItem.product_id == product.id,
            Booking.created_at >= today - timedelta(days=30),
            Booking.status != BookingStatus.CANCELLED,
            Booking.is_deleted == False
        ).count()
        
        product_stats.append({
            'product': product,
            'bookings_count': bookings_count
        })
    
    return render_template('admin/dashboard.html',
                         bookings_this_week=bookings_this_week,
                         bookings_this_month=bookings_this_month,
                         revenue_this_month=revenue_this_month,
                         upcoming_pickups=upcoming_pickups,
                         recent_bookings=recent_bookings,
                         pending_deposit_refunds=pending_deposit_refunds,
                         awaiting_return=awaiting_return,
                         product_stats=product_stats)


@bp.route('/products')
@login_required
def products():
    """Products management page."""
    page = request.args.get('page', 1, type=int)
    search = request.args.get('search', '')
    category_id = request.args.get('category', type=int)
    show_inactive = request.args.get('show_inactive', 'false').lower() == 'true'
    
    query = Product.query
    
    # Filter by active status (show active by default)
    if not show_inactive:
        query = query.filter(Product.is_active == True)
    
    if search:
        query = query.filter(
            Product.name.contains(search) | 
            Product.description.contains(search)
        )
    
    if category_id:
        query = query.filter(Product.category_id == category_id)
    
    products = query.order_by(Product.name).paginate(
        page=page, per_page=20, error_out=False
    )
    
    categories = Category.query.filter(Category.is_active == True).order_by(Category.name).all()
    
    return render_template('admin/products.html',
                         products=products,
                         categories=categories,
                         search=search,
                         current_category=category_id,
                         show_inactive=show_inactive)


@bp.route('/products/create', methods=['GET', 'POST'])
@login_required
def create_product():
    """Create new product."""
    form = ProductForm()
    form.category_id.choices = [(c.id, c.name) for c in Category.query.filter(Category.is_active == True).order_by(Category.name).all()]
    
    if form.validate_on_submit():
        # Handle image upload
        hero_image_url = form.hero_image_url.data
        if form.hero_image_file.data:
            uploaded_file = save_uploaded_file(form.hero_image_file.data)
            if uploaded_file:
                hero_image_url = uploaded_file
        
        product = Product(
            name=form.name.data,
            slug=form.slug.data,
            category_id=form.category_id.data,
            description=form.description.data,
            daily_price_dkk=Decimal(str(form.daily_price_dkk.data)),
            weekend_price_dkk=Decimal(str(form.weekend_price_dkk.data)) if form.weekend_price_dkk.data else None,
            weekend_discount_dkk=Decimal(str(form.weekend_discount_dkk.data)) if form.weekend_discount_dkk.data else None,
            deposit_dkk=Decimal(str(form.deposit_dkk.data)) if form.deposit_dkk.data else None,
            stock_qty=form.stock_qty.data,
            prep_buffer_days=form.prep_buffer_days.data,
            cleanup_buffer_days=form.cleanup_buffer_days.data,
            is_active=form.is_active.data,
            hero_image_url=hero_image_url
        )
        
        from app import db, csrf
        db.session.add(product)
        db.session.flush()  # Get the product ID
        
        # Create ProductImage entry for hero image if provided
        if hero_image_url:
            hero_image = ProductImage(
                product_id=product.id,
                url=hero_image_url,
                alt=product.name,
                sort_order=1  # Hero image is always #1
            )
            db.session.add(hero_image)
        
        db.session.commit()
        
        flash('Produkt oprettet', 'success')
        return redirect(url_for('admin.products'))
    
    return render_template('admin/product_form.html', form=form, title='Opret produkt')


@bp.route('/products/<int:id>/edit', methods=['GET', 'POST'])
@login_required
def edit_product(id):
    """Edit product."""
    product = Product.query.get_or_404(id)
    form = ProductForm(obj=product)
    form.category_id.choices = [(c.id, c.name) for c in Category.query.filter(Category.is_active == True).order_by(Category.name).all()]
    
    if form.validate_on_submit():
        # Handle image upload
        new_hero_image_url = None
        if form.hero_image_file.data:
            uploaded_file = save_uploaded_file(form.hero_image_file.data)
            if uploaded_file:
                new_hero_image_url = uploaded_file
        elif form.hero_image_url.data:
            new_hero_image_url = form.hero_image_url.data
        
        # Update hero image if changed
        if new_hero_image_url and new_hero_image_url != product.hero_image_url:
            product.hero_image_url = new_hero_image_url
            
            # Update or create ProductImage entry for hero image
            hero_image = ProductImage.query.filter_by(product_id=product.id, sort_order=1).first()
            if hero_image:
                hero_image.url = new_hero_image_url
                hero_image.alt = form.name.data
            else:
                hero_image = ProductImage(
                    product_id=product.id,
                    url=new_hero_image_url,
                    alt=form.name.data,
                    sort_order=1
                )
                db.session.add(hero_image)
        
        product.name = form.name.data
        product.slug = form.slug.data
        product.category_id = form.category_id.data
        product.description = form.description.data
        product.daily_price_dkk = Decimal(str(form.daily_price_dkk.data))
        product.weekend_price_dkk = Decimal(str(form.weekend_price_dkk.data)) if form.weekend_price_dkk.data else None
        product.weekend_discount_dkk = Decimal(str(form.weekend_discount_dkk.data)) if form.weekend_discount_dkk.data else None
        product.deposit_dkk = Decimal(str(form.deposit_dkk.data)) if form.deposit_dkk.data else None
        product.stock_qty = form.stock_qty.data
        product.prep_buffer_days = form.prep_buffer_days.data
        product.cleanup_buffer_days = form.cleanup_buffer_days.data
        product.is_active = form.is_active.data
        
        from app import db, csrf
        db.session.commit()
        
        flash('Produkt opdateret', 'success')
        return redirect(url_for('admin.products'))
    
    return render_template('admin/product_form.html', form=form, title='Rediger produkt', product=product)


@bp.route('/products/<int:id>/delete', methods=['POST'])
@login_required
def delete_product(id):
    """Delete product."""
    try:
        validate_csrf(request.form.get('csrf_token'))
    except BadRequest:
        flash('Ugyldig anmodning', 'error')
        return redirect(url_for('admin.products'))
    
    product = Product.query.get_or_404(id)
    
    # Only check for ACTIVE/PENDING bookings (not finished ones)
    has_active_bookings = BookingItem.query.join(Booking).filter(
        BookingItem.product_id == id,
        Booking.is_deleted == False,
        Booking.status.in_([BookingStatus.PENDING, BookingStatus.DEPOSIT_PAID, BookingStatus.OUT_FOR_DELIVERY])
    ).first() is not None
    
    if has_active_bookings:
        flash('Kan ikke slette produkt med aktive bookinger', 'error')
        return redirect(url_for('admin.products'))
    
    # Check if product has any booking items from any booking (for historical tracking)
    has_booking_history = BookingItem.query.filter_by(product_id=id).first() is not None
    
    from app import db, csrf
    if has_booking_history:
        # If product has booking history, mark as inactive instead of deleting
        product.is_active = False
        product.name = f"[SLETTET] {product.name}"
        db.session.commit()
        flash('Produkt er markeret som inaktivt (har booking historik)', 'warning')
    else:
        # If product has never been used, we can safely delete it
        db.session.delete(product)
        db.session.commit()
        flash('Produkt slettet', 'success')
    
    return redirect(url_for('admin.products'))


@bp.route('/products/<int:product_id>/images')
@login_required
def product_images(product_id):
    """Manage product images."""
    product = Product.query.get_or_404(product_id)
    images = ProductImage.query.filter_by(product_id=product_id).order_by(ProductImage.sort_order.asc()).all()
    
    return render_template('admin/product_images.html', product=product, images=images)


@bp.route('/products/<int:product_id>/images/bulk-upload', methods=['GET', 'POST'])
@login_required
def bulk_upload_images(product_id):
    """Bulk upload multiple images for a product."""
    product = Product.query.get_or_404(product_id)
    form = BulkImageUploadForm()
    
    if form.validate_on_submit():
        uploaded_files = request.files.getlist('image_files')
        alt_prefix = form.alt_prefix.data or 'Produktbillede'
        
        if uploaded_files and any(f.filename for f in uploaded_files):
            # Get the next sort order
            max_sort_order = db.session.query(func.max(ProductImage.sort_order)).filter_by(product_id=product_id).scalar() or 0
            next_sort_order = max_sort_order + 1
            
            uploaded_count = 0
            for i, file in enumerate(uploaded_files):
                if file and file.filename:
                    uploaded_file = save_uploaded_file(file)
                    if uploaded_file:
                        image = ProductImage(
                            product_id=product_id,
                            url=uploaded_file,
                            alt=f"{alt_prefix} {next_sort_order + i}",
                            sort_order=next_sort_order + i
                        )
                        db.session.add(image)
                        uploaded_count += 1
            
            db.session.commit()
            flash(f'{uploaded_count} billeder tilføjet', 'success')
            return redirect(url_for('admin.product_images', product_id=product_id))
        else:
            flash('Ingen billeder valgt', 'error')
    
    return render_template('admin/bulk_image_upload.html', form=form, product=product, title='Tilføj flere billeder')


@bp.route('/products/<int:product_id>/images/add', methods=['GET', 'POST'])
@login_required
def add_product_image(product_id):
    """Add new product image."""
    product = Product.query.get_or_404(product_id)
    form = ProductImageForm()
    
    if form.validate_on_submit():
        # Handle image upload
        image_url = form.url.data
        if form.image_file.data:
            uploaded_file = save_uploaded_file(form.image_file.data)
            if uploaded_file:
                image_url = uploaded_file
        
        if not image_url:
            flash('Enten billede fil eller URL skal være udfyldt', 'error')
            return render_template('admin/product_image_form.html', form=form, product=product, title='Tilføj billede')
        
        # Get the next sort order
        max_sort_order = db.session.query(func.max(ProductImage.sort_order)).filter_by(product_id=product_id).scalar() or 0
        next_sort_order = max_sort_order + 1
        
        image = ProductImage(
            product_id=product_id,
            url=image_url,
            alt=form.alt.data,
            sort_order=form.sort_order.data or next_sort_order
        )
        
        db.session.add(image)
        db.session.commit()
        
        flash('Billede tilføjet', 'success')
        return redirect(url_for('admin.product_images', product_id=product_id))
    
    return render_template('admin/product_image_form.html', form=form, product=product, title='Tilføj billede')


@bp.route('/products/<int:product_id>/images/<int:image_id>/edit', methods=['GET', 'POST'])
@login_required
def edit_product_image(product_id, image_id):
    """Edit product image."""
    product = Product.query.get_or_404(product_id)
    image = ProductImage.query.filter_by(id=image_id, product_id=product_id).first_or_404()
    form = ProductImageForm(obj=image)
    
    if form.validate_on_submit():
        # Handle image upload
        if form.image_file.data:
            uploaded_file = save_uploaded_file(form.image_file.data)
            if uploaded_file:
                image.url = uploaded_file
        elif form.url.data:
            image.url = form.url.data
        
        image.alt = form.alt.data
        image.sort_order = form.sort_order.data
        
        db.session.commit()
        
        flash('Billede opdateret', 'success')
        return redirect(url_for('admin.product_images', product_id=product_id))
    
    return render_template('admin/product_image_form.html', form=form, product=product, image=image, title='Rediger billede')


@bp.route('/products/<int:product_id>/images/<int:image_id>/delete', methods=['POST'])
@login_required
def delete_product_image(product_id, image_id):
    """Delete product image."""
    try:
        validate_csrf(request.form.get('csrf_token'))
    except BadRequest:
        flash('Ugyldig anmodning', 'error')
        return redirect(url_for('admin.product_images', product_id=product_id))
    
    image = ProductImage.query.filter_by(id=image_id, product_id=product_id).first_or_404()
    
    db.session.delete(image)
    db.session.commit()
    
    flash('Billede slettet', 'success')
    return redirect(url_for('admin.product_images', product_id=product_id))


@bp.route('/products/<int:product_id>/images/reorder', methods=['POST'])
@login_required
def reorder_product_images(product_id):
    """Reorder product images."""
    print(f"🔄 Reorder endpoint called for product {product_id}")
    try:
        data = request.get_json()
        print(f"📦 Received data: {data}")
        
        if not data:
            print("❌ No JSON data received")
            return jsonify({'success': False, 'message': 'Ingen data modtaget'}), 400
        
        image_ids = data.get('image_ids', [])
        print(f"🖼️ Image IDs: {image_ids}")
        
        if not image_ids:
            return jsonify({'success': False, 'message': 'Ingen billeder at sortere'})
        
        product = Product.query.get_or_404(product_id)
        print(f"✅ Product found: {product.name}")
        
        # Update sort order for each image
        for index, image_id in enumerate(image_ids, 1):
            image = ProductImage.query.filter_by(id=image_id, product_id=product_id).first()
            if image:
                print(f"📝 Updating image {image_id} to sort order {index}")
                image.sort_order = index
            else:
                print(f"⚠️ Image {image_id} not found for product {product_id}")
        
        db.session.commit()
        print("✅ Changes committed to database")
        
        return jsonify({'success': True, 'message': 'Billeder sorteret'})
        
    except Exception as e:
        print(f"❌ Error in reorder_product_images: {e}")
        import traceback
        print(f"📋 Traceback: {traceback.format_exc()}")
        return jsonify({'success': False, 'message': f'Fejl ved sortering: {str(e)}'}), 500


@bp.route('/bookings')
@login_required
def bookings():
    """Bookings management page."""
    page = request.args.get('page', 1, type=int)
    status = request.args.get('status', '')
    search = request.args.get('search', '')
    show_deleted = request.args.get('show_deleted', 'false').lower() == 'true'
    tab = request.args.get('tab', 'active')  # 'active' or 'completed'

    from sqlalchemy.orm import joinedload
    from app.models import BookingItem
    from decimal import Decimal
    
    query = Booking.query.options(
        joinedload(Booking.items).joinedload(BookingItem.upsell_items)
    )

    # Filter by deletion status
    if show_deleted:
        query = query.filter(Booking.is_deleted == True)
    else:
        query = query.filter(Booking.is_deleted == False)
        
        # Filter by active/completed tab (only for non-deleted bookings)
        if tab == 'completed':
            # Completed bookings are those with deposit_refunded status
            query = query.filter(Booking.status == BookingStatus.DEPOSIT_REFUNDED)
        else:  # tab == 'active'
            # Active bookings are all except deposit_refunded
            query = query.filter(Booking.status != BookingStatus.DEPOSIT_REFUNDED)

    if status:
        query = query.filter(Booking.status == status)

    if search:
        query = query.filter(
            Booking.booking_no.contains(search) |
            Booking.customer_name.contains(search) |
            Booking.email.contains(search)
        )

    # Order by deletion status first, then by created_at
    if show_deleted:
        query = query.order_by(desc(Booking.deleted_at), desc(Booking.created_at))
    else:
        query = query.order_by(desc(Booking.created_at))

    bookings = query.paginate(
        page=page, per_page=20, error_out=False
    )

    # Calculate statistics for the cards (only for non-deleted bookings)
    pending_count = Booking.query.filter(Booking.status == BookingStatus.PENDING, Booking.is_deleted == False).count()
    deposit_paid_count = Booking.query.filter(Booking.status == BookingStatus.DEPOSIT_PAID, Booking.is_deleted == False).count()
    out_for_delivery_count = Booking.query.filter(Booking.status == BookingStatus.OUT_FOR_DELIVERY, Booking.is_deleted == False).count()
    returned_good_count = Booking.query.filter(Booking.status == BookingStatus.RETURNED_GOOD, Booking.is_deleted == False).count()
    returned_damaged_count = Booking.query.filter(Booking.status == BookingStatus.RETURNED_DAMAGED, Booking.is_deleted == False).count()
    fully_paid_count = Booking.query.filter(Booking.status == BookingStatus.FULLY_PAID, Booking.is_deleted == False).count()
    cancelled_count = Booking.query.filter(Booking.status == BookingStatus.CANCELLED, Booking.is_deleted == False).count()

    # Calculate total revenue from paid bookings (only non-deleted)
    total_revenue = Booking.query.filter(
        Booking.status.in_([BookingStatus.DEPOSIT_PAID, BookingStatus.DEPOSIT_REFUNDED, BookingStatus.FULLY_PAID]),
        Booking.is_deleted == False
    ).with_entities(func.sum(Booking.total_dkk)).scalar() or Decimal('0')

    # Calculate upsell totals for each booking
    booking_upsells = {}
    for booking in bookings.items:
        upsell_total = Decimal('0')
        for item in booking.items:
            for upsell in item.upsell_items:
                upsell_total += upsell.unit_price_dkk * upsell.quantity
        booking_upsells[booking.id] = upsell_total

    return render_template('admin/bookings.html',
                         bookings=bookings,
                         status=status,
                         search=search,
                         show_deleted=show_deleted,
                         tab=tab,
                         pending_count=pending_count,
                         deposit_paid_count=deposit_paid_count,
                         out_for_delivery_count=out_for_delivery_count,
                         returned_good_count=returned_good_count,
                         returned_damaged_count=returned_damaged_count,
                         fully_paid_count=fully_paid_count,
                         cancelled_count=cancelled_count,
                         total_revenue=total_revenue,
                         booking_upsells=booking_upsells)


@bp.route('/bookings/soft-delete', methods=['POST'])
@login_required
def soft_delete_bookings():
    """Soft delete multiple bookings with optional mass note."""
    try:
        validate_csrf(request.form.get('csrf_token'))
    except BadRequest:
        return jsonify({'error': 'Invalid CSRF token'}), 400
    
    booking_ids = request.form.getlist('booking_ids[]')
    deletion_reason = request.form.get('deletion_reason', '')
    mass_note = request.form.get('mass_note', '')
    
    if not booking_ids:
        return jsonify({'error': 'No bookings selected'}), 400
    
    if not deletion_reason and not mass_note:
        return jsonify({'error': 'Deletion reason or mass note is required'}), 400
    
    deleted_count = 0
    for booking_id in booking_ids:
        booking = Booking.query.get(booking_id)
        if booking and not booking.is_deleted:
            booking.is_deleted = True
            booking.deleted_at = datetime.utcnow()
            
            # Set deleted_by only if current_user is a User (from users table)
            from app.models import User
            if isinstance(current_user, User):
                booking.deleted_by = current_user.id
            else:
                # If current_user is a Customer or doesn't exist in users table, set to None
                booking.deleted_by = None
                
            booking.deletion_reason = mass_note if mass_note else deletion_reason
            deleted_count += 1
    
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': f'{deleted_count} bookinger slettet',
        'deleted_count': deleted_count
    })


@bp.route('/bookings/restore', methods=['POST'])
@login_required
def restore_bookings():
    """Restore soft deleted bookings."""
    try:
        validate_csrf(request.form.get('csrf_token'))
    except BadRequest:
        return jsonify({'error': 'Invalid CSRF token'}), 400
    
    booking_ids = request.form.getlist('booking_ids[]')
    
    if not booking_ids:
        return jsonify({'error': 'No bookings selected'}), 400
    
    restored_count = 0
    for booking_id in booking_ids:
        booking = Booking.query.get(booking_id)
        if booking and booking.is_deleted:
            booking.is_deleted = False
            booking.deleted_at = None
            booking.deleted_by = None
            booking.deletion_reason = None
            restored_count += 1
    
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': f'{restored_count} bookinger gendannet',
        'restored_count': restored_count
    })


@bp.route('/calendar-management')
@login_required
def calendar_management():
    """Calendar management dashboard."""
    # Get calendar statistics
    total_bookings = Booking.query.filter(Booking.is_deleted == False).count()
    confirmed_bookings = Booking.query.filter(
        Booking.status.in_([BookingStatus.DEPOSIT_PAID, BookingStatus.FULLY_PAID, BookingStatus.OUT_FOR_DELIVERY, BookingStatus.RETURNED_GOOD]),
        Booking.is_deleted == False
    ).count()
    
    # Get upcoming bookings for preview
    upcoming_bookings = Booking.query.filter(
        Booking.status.in_([BookingStatus.DEPOSIT_PAID, BookingStatus.FULLY_PAID, BookingStatus.OUT_FOR_DELIVERY]),
        Booking.is_deleted == False,
        Booking.start_date >= datetime.now().date()
    ).order_by(Booking.start_date).limit(10).all()
    
    return render_template('admin/calendar_management.html', 
                         total_bookings=total_bookings,
                         confirmed_bookings=confirmed_bookings,
                         upcoming_bookings=upcoming_bookings)

@bp.route('/email-management')
@login_required
def email_management():
    """Email management dashboard."""
    # Get newsletter subscribers
    subscribers = NewsletterSubscription.query.filter_by(is_active=True).order_by(NewsletterSubscription.subscribed_at.desc()).all()
    
    # Get customer emails
    customer_emails = db.session.query(Booking.email).distinct().all()
    customer_emails = [email[0] for email in customer_emails]
    
    return render_template('admin/email_management.html', 
                         subscribers=subscribers,
                         customer_emails=customer_emails)


@bp.route('/send-newsletter', methods=['POST'])
@login_required
def send_newsletter():
    """Send newsletter to all subscribers."""
    try:
        validate_csrf(request.form.get('csrf_token'))
    except BadRequest:
        return jsonify({'error': 'Invalid CSRF token'}), 400
    
    subject = request.form.get('subject', '').strip()
    title = request.form.get('title', '').strip()
    content = request.form.get('content', '').strip()
    
    if not all([subject, title, content]):
        return jsonify({'error': 'Alle felter skal udfyldes'}), 400
    
    # Get all active subscribers
    subscribers = NewsletterSubscription.query.filter_by(is_active=True).all()
    subscriber_emails = [sub.email for sub in subscribers]
    
    if not subscriber_emails:
        return jsonify({'error': 'Ingen aktive abonnenter fundet'}), 400
    
    # Send newsletter
    try:
        from app.services.email_service import email_service
        results = email_service.send_newsletter(subscriber_emails, subject, content, title)
        
        return jsonify({
            'success': True,
            'message': f'Nyhedsbrev sendt til {len(results["success"])} modtagere',
            'sent_count': len(results['success']),
            'failed_count': len(results['failed'])
        })
    except Exception as e:
        return jsonify({'error': f'Fejl ved afsendelse: {str(e)}'}), 500


@bp.route('/send-bulk-email', methods=['POST'])
@login_required
def send_bulk_email():
    """Send email to all customers."""
    try:
        validate_csrf(request.form.get('csrf_token'))
    except BadRequest:
        return jsonify({'error': 'Invalid CSRF token'}), 400
    
    subject = request.form.get('subject', '').strip()
    title = request.form.get('title', '').strip()
    content = request.form.get('content', '').strip()
    
    if not all([subject, title, content]):
        return jsonify({'error': 'Alle felter skal udfyldes'}), 400
    
    # Get all customer emails
    customer_emails = db.session.query(Booking.email).distinct().all()
    customer_emails = [email[0] for email in customer_emails]
    
    if not customer_emails:
        return jsonify({'error': 'Ingen kunde emails fundet'}), 400
    
    # Send bulk email
    try:
        from app.services.email_service import email_service
        results = email_service.send_bulk_email(customer_emails, subject, 'emails/newsletter.html', title=title, content=content)
        
        return jsonify({
            'success': True,
            'message': f'Email sendt til {len(results["success"])} modtagere',
            'sent_count': len(results['success']),
            'failed_count': len(results['failed'])
        })
    except Exception as e:
        return jsonify({'error': f'Fejl ved afsendelse: {str(e)}'}), 500


@bp.route('/newsletter/subscribe', methods=['POST'])
def newsletter_subscribe():
    """Subscribe to newsletter."""
    print(f"📧 Newsletter subscription request received")
    print(f"📧 Form data: {dict(request.form)}")
    print(f"📧 Request method: {request.method}")
    print(f"📧 Request URL: {request.url}")
    
    # Validate CSRF token
    try:
        validate_csrf(request.form.get('csrf_token'))
        print(f"📧 CSRF token validated successfully")
    except BadRequest:
        print(f"❌ CSRF token validation failed")
        return jsonify({'error': 'Invalid CSRF token'}), 400
    
    email = request.form.get('email', '').strip().lower()
    print(f"📧 Processed email: {email}")
    
    if not email:
        print(f"❌ No email provided")
        return jsonify({'error': 'Email er påkrævet'}), 400
    
    # Check if already subscribed
    existing = NewsletterSubscription.query.filter_by(email=email).first()
    print(f"📧 Existing subscription check: {existing}")
    
    if existing:
        if existing.is_active:
            print(f"❌ Email already subscribed and active")
            return jsonify({'error': 'Email er allerede tilmeldt'}), 400
        else:
            print(f"📧 Reactivating existing subscription")
            # Reactivate subscription
            existing.is_active = True
            existing.unsubscribed_at = None
            db.session.commit()
            
            # Send welcome email for reactivated subscription
            try:
                from app.services.email_service import email_service
                print(f"📧 Sending welcome email for reactivated subscription")
                result = email_service.send_newsletter_welcome_email(email)
                print(f"📧 Welcome email result: {result}")
            except Exception as e:
                # Don't fail subscription if email fails
                print(f"❌ Failed to send newsletter welcome email: {e}")
                import traceback
                traceback.print_exc()
            
            print(f"✅ Subscription reactivated successfully")
            return jsonify({'success': True, 'message': 'Tilmeldt nyhedsbrev'})
    
    # Create new subscription
    print(f"📧 Creating new subscription")
    subscription = NewsletterSubscription(email=email)
    db.session.add(subscription)
    db.session.commit()
    print(f"📧 New subscription saved with ID: {subscription.id}")
    
    # Send welcome email
    try:
        from app.services.email_service import email_service
        print(f"📧 Sending welcome email for new subscription")
        result = email_service.send_newsletter_welcome_email(email)
        print(f"📧 Welcome email result: {result}")
    except Exception as e:
        # Don't fail subscription if email fails
        print(f"❌ Failed to send newsletter welcome email: {e}")
        import traceback
        traceback.print_exc()
    
    print(f"✅ Newsletter subscription completed successfully")
    return jsonify({'success': True, 'message': 'Tilmeldt nyhedsbrev'})


@bp.route('/newsletter/unsubscribe/<email>')
def newsletter_unsubscribe(email):
    """Unsubscribe from newsletter."""
    subscription = NewsletterSubscription.query.filter_by(email=email).first()
    if subscription and subscription.is_active:
        subscription.is_active = False
        subscription.unsubscribed_at = datetime.utcnow()
        db.session.commit()
        flash('Du er nu afmeldt nyhedsbrevet', 'info')
    else:
        flash('Email var ikke tilmeldt', 'warning')
    
    return redirect(url_for('public.index'))


@bp.route('/bookings/<int:id>')
@login_required
def booking_detail(id):
    """Booking detail page."""
    from sqlalchemy.orm import joinedload
    from app.models import BookingItem
    booking = Booking.query.options(
        joinedload(Booking.items).joinedload(BookingItem.upsell_items)
    ).get_or_404(id)
    
    # Calculate upsell total
    from decimal import Decimal
    upsell_total = Decimal('0')
    for item in booking.items:
        for upsell in item.upsell_items:
            upsell_total += upsell.unit_price_dkk * upsell.quantity
    
    return render_template('admin/booking_detail.html', booking=booking, upsell_total=upsell_total)


@bp.route('/bookings/<int:id>/update-status', methods=['POST'])
@login_required
def update_booking_status(id):
    """Update booking status."""
    print(f"=== UPDATE BOOKING STATUS CALLED ===")
    print(f"Booking ID: {id}")
    print(f"Request method: {request.method}")
    print(f"Request form data: {dict(request.form)}")
    
    try:
        validate_csrf(request.form.get('csrf_token'))
    except BadRequest:
        print("CSRF validation failed")
        return jsonify({'error': 'Invalid CSRF token'}), 400
    
    booking = Booking.query.get_or_404(id)
    new_status = request.form.get('status')
    
    if new_status not in [status.value for status in BookingStatus]:
        return jsonify({'error': 'Invalid status'}), 400
    
    # Store old status for email notification
    old_status = booking.status.value
    
    # Update status
    booking.status = BookingStatus(new_status)
    
    # Handle special status changes
    if new_status == 'deposit_refunded':
        booking.deposit_refunded = True
        # After deposit is refunded, the booking is completed
        # No need to change status again as deposit_refunded IS the completed status
    
    from app import db, csrf
    db.session.commit()
    
    # Send email notification to customer
    try:
        from app.services.email_service import email_service
        print(f"Attempting to send email to {booking.email} for status change from {old_status} to {new_status}")
        print(f"Email service initialized: {email_service.mail is not None}")
        print(f"Current app context: {current_app}")
        print(f"MAIL_SERVER config: {current_app.config.get('MAIL_SERVER')}")
        
        result = email_service.send_booking_status_update(
            booking.email,
            booking.customer_name,
            booking,
            old_status,
            new_status
        )
        print(f"Email send result: {result}")
    except Exception as e:
        print(f"Failed to send status update email: {e}")
        import traceback
        traceback.print_exc()
        # Don't fail the status update if email fails
    
    return jsonify({'success': True, 'message': 'Status opdateret og email sendt'})


@bp.route('/bookings/<int:id>/sync-payment-status', methods=['POST'])
@login_required
def sync_payment_status(id):
    """Manually sync payment status with Stripe for development/troubleshooting."""
    try:
        validate_csrf(request.form.get('csrf_token'))
    except BadRequest:
        return jsonify({'error': 'Invalid CSRF token'}), 400
    
    booking = Booking.query.get_or_404(id)
    
    if not booking.stripe_session_id:
        return jsonify({'error': 'Ingen Stripe session ID fundet'}), 400
    
    try:
        import stripe
        stripe.api_key = current_app.config.get('STRIPE_SECRET_KEY')
        
        # Retrieve the checkout session to check payment status
        session = stripe.checkout.Session.retrieve(booking.stripe_session_id)
        
        if session.payment_status == 'paid':
            booking.status = BookingStatus.DEPOSIT_PAID
            booking.stripe_payment_intent_id = session.payment_intent
            
            from app import db, csrf
            db.session.commit()
            
            return jsonify({'success': True, 'message': 'Status opdateret til betalt'})
        else:
            return jsonify({'info': True, 'message': f'Stripe status: {session.payment_status}'})
            
    except Exception as e:
        current_app.logger.error(f'Error syncing payment status: {e}')
        return jsonify({'error': f'Fejl ved synkronisering: {str(e)}'}), 500


@bp.route('/bookings/<int:id>/update-return-condition', methods=['POST'])
@login_required
def update_return_condition(id):
    """Update return condition for a booking."""
    try:
        validate_csrf(request.form.get('csrf_token'))
    except BadRequest:
        return jsonify({'error': 'Invalid CSRF token'}), 400
    
    booking = Booking.query.get_or_404(id)
    return_condition = request.form.get('return_condition')
    
    if return_condition not in ['good', 'damaged', 'lost']:
        return jsonify({'error': 'Ugyldig returneringsstand'}), 400
    
    booking.return_condition = return_condition
    
    # If returned in good condition, set status to returned_good
    if return_condition == 'good' and booking.status == BookingStatus.OUT_FOR_DELIVERY:
        booking.status = BookingStatus.RETURNED_GOOD
        
        # Send return notification email
        try:
            from app.services.email_service import email_service
            email_service.send_return_notification(
                booking.email,
                booking.customer_name,
                booking
            )
        except Exception as e:
            print(f"Failed to send return notification email: {e}")
            # Don't fail the status update if email fails
            
    elif return_condition in ['damaged', 'lost'] and booking.status == BookingStatus.OUT_FOR_DELIVERY:
        booking.status = BookingStatus.RETURNED_DAMAGED
    
    from app import db, csrf
    db.session.commit()
    
    return jsonify({'success': True, 'message': 'Returneringsstand opdateret'})


@bp.route('/debug-config')
@login_required
def debug_config():
    """Debug email configuration."""
    return jsonify({
        'MAIL_SERVER': current_app.config.get('MAIL_SERVER'),
        'MAIL_PORT': current_app.config.get('MAIL_PORT'),
        'MAIL_USE_TLS': current_app.config.get('MAIL_USE_TLS'),
        'MAIL_USERNAME': current_app.config.get('MAIL_USERNAME'),
        'MAIL_PASSWORD': '***' if current_app.config.get('MAIL_PASSWORD') else None,
        'MAIL_DEFAULT_SENDER': current_app.config.get('MAIL_DEFAULT_SENDER'),
        'email_service_initialized': hasattr(current_app, 'extensions') and 'mail' in current_app.extensions
    })

@bp.route('/test-email')
@login_required
def test_email():
    """Test email sending functionality."""
    try:
        from app.services.email_service import email_service
        print("=== TEST EMAIL DEBUG ===")
        print("Testing email service...")
        print(f"Email service mail object: {email_service.mail}")
        print(f"Email service initialized: {email_service.mail is not None}")
        print(f"MAIL_SERVER: {current_app.config.get('MAIL_SERVER')}")
        print(f"MAIL_USERNAME: {current_app.config.get('MAIL_USERNAME')}")
        print(f"MAIL_DEFAULT_SENDER: {current_app.config.get('MAIL_DEFAULT_SENDER')}")
        print(f"Current app context: {current_app}")
        print(f"Request context: {request}")
        
        # Test direct email sending first
        print("Testing direct email sending...")
        from flask_mail import Message
        mail = current_app.extensions['mail']
        
        msg = Message(
            subject="Direct Test Email from HighendEvent Admin",
            recipients=["tobiaspreisler@gmail.com"],
            body="This is a direct test email to verify the email system is working correctly.",
            sender=current_app.config.get('MAIL_DEFAULT_SENDER')
        )
        
        try:
            mail.send(msg)
            print("✅ Direct email sent successfully!")
            direct_result = True
        except Exception as direct_error:
            print(f"❌ Direct email failed: {direct_error}")
            direct_result = False
        
        # Now test email service
        print("Testing email service method...")
        result = email_service.send_email(
            to="tobiaspreisler@gmail.com",
            subject="Test Email from HighendEvent Admin",
            template="emails/admin_notification.html",
            message="This is a test email to verify the email system is working correctly."
        )
        print(f"Email service result: {result}")
        print("=== END TEST EMAIL DEBUG ===")
        
        return jsonify({
            'success': True,
            'email_sent': result,
            'direct_email_sent': direct_result,
            'message': 'Test email sent successfully' if result else 'Test email failed'
        })
    except Exception as e:
        print(f"=== TEST EMAIL ERROR ===")
        print(f"Exception: {e}")
        import traceback
        traceback.print_exc()
        print("=== END TEST EMAIL ERROR ===")
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Test email failed'
        }), 500

@bp.route('/bookings/<int:id>/refund-deposit', methods=['POST'])
@login_required
def refund_deposit(id):
    """Mark deposit as refunded for a booking."""
    try:
        validate_csrf(request.form.get('csrf_token'))
    except BadRequest:
        return jsonify({'error': 'Invalid CSRF token'}), 400
    
    booking = Booking.query.get_or_404(id)
    
    if booking.deposit_refunded:
        return jsonify({'error': 'Depositum er allerede refunderet'}), 400
    
    if booking.status not in [BookingStatus.RETURNED_GOOD, BookingStatus.FULLY_PAID]:
        return jsonify({'error': 'Depositum kan kun refunderes efter returnering'}), 400
    
    booking.deposit_refunded = True
    
    from app import db, csrf
    db.session.commit()
    
    return jsonify({'success': True, 'message': 'Depositum markeret som refunderet'})


@bp.route('/bookings/calendar')
@login_required
def bookings_calendar():
    """Bookings calendar view."""
    return render_template('admin/bookings_calendar.html')


@bp.route('/api/bookings/calendar-data')
@login_required
def get_bookings_calendar_data():
    """Get bookings data for calendar."""
    start_str = request.args.get('start')
    end_str = request.args.get('end')
    
    if not start_str or not end_str:
        return jsonify({'error': 'Start and end dates required'}), 400
    
    try:
        start_date = datetime.strptime(start_str, '%Y-%m-%d').date()
        end_date = datetime.strptime(end_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Invalid date format'}), 400
    
    # Get bookings in date range (exclude deleted and cancelled)
    bookings = Booking.query.filter(
        Booking.start_date <= end_date,
        Booking.end_date >= start_date,
        Booking.status != BookingStatus.CANCELLED,
        Booking.is_deleted == False
    ).all()
    
    events = []
    for booking in bookings:
        events.append({
            'id': booking.id,
            'title': f"{booking.booking_no} - {booking.customer_name}",
            'start': booking.start_date.isoformat(),
            'end': (booking.end_date + timedelta(days=1)).isoformat(),  # FullCalendar exclusive end
            'backgroundColor': get_status_color(booking.status),
            'borderColor': get_status_color(booking.status),
            'url': url_for('admin.booking_detail', id=booking.id)
        })
    
    return jsonify(events)

def get_status_color(status: BookingStatus) -> str:
    """Get color for booking status."""
    colors = {
        BookingStatus.PENDING: '#fbbf24',  # yellow
        BookingStatus.DEPOSIT_PAID: '#3b82f6',  # blue
        BookingStatus.OUT_FOR_DELIVERY: '#8b5cf6',  # purple
        BookingStatus.RETURNED_GOOD: '#10b981',  # green
        BookingStatus.RETURNED_DAMAGED: '#f59e0b',  # orange
        BookingStatus.FULLY_PAID: '#10b981',  # green
        BookingStatus.CANCELLED: '#ef4444'  # red
    }
    return colors.get(status, '#6b7280')  # gray default


@bp.route('/categories')
@login_required
def categories():
    """Categories management page."""
    categories = Category.query.order_by(Category.sort_order, Category.name).all()
    return render_template('admin/categories.html', categories=categories)


@bp.route('/categories/create', methods=['GET', 'POST'])
@login_required
def create_category():
    """Create new category."""
    form = CategoryForm()
    
    if form.validate_on_submit():
        category = Category(
            name=form.name.data,
            slug=form.slug.data,
            description=form.description.data,
            sort_order=form.sort_order.data,
            is_active=form.is_active.data
        )
        
        from app import db, csrf
        db.session.add(category)
        db.session.commit()
        
        flash('Kategori oprettet', 'success')
        return redirect(url_for('admin.categories'))
    
    return render_template('admin/category_form.html', form=form, title='Opret kategori')


@bp.route('/categories/<int:id>/edit', methods=['GET', 'POST'])
@login_required
def edit_category(id):
    """Edit category."""
    category = Category.query.get_or_404(id)
    form = CategoryForm(obj=category)
    
    if form.validate_on_submit():
        category.name = form.name.data
        category.slug = form.slug.data
        category.description = form.description.data
        category.sort_order = form.sort_order.data
        category.is_active = form.is_active.data
        
        from app import db, csrf
        db.session.commit()
        
        flash('Kategori opdateret', 'success')
        return redirect(url_for('admin.categories'))
    
    return render_template('admin/category_form.html', form=form, title='Rediger kategori', category=category)


@bp.route('/blackout-dates')
@login_required
def blackout_dates():
    """Blackout dates management page."""
    blackout_dates = BlackoutDate.query.order_by(desc(BlackoutDate.date)).all()
    return render_template('admin/blackout_dates.html', blackout_dates=blackout_dates)


@bp.route('/blackout-dates/create', methods=['GET', 'POST'])
@login_required
def create_blackout_date():
    """Create new blackout date."""
    form = BlackoutDateForm()
    form.product_id.choices = [(p.id, p.name) for p in Product.query.filter(Product.is_active == True).order_by(Product.name).all()]
    
    if form.validate_on_submit():
        blackout_date = BlackoutDate(
            product_id=form.product_id.data,
            start_date=form.start_date.data,
            end_date=form.end_date.data,
            reason=form.reason.data
        )
        
        from app import db, csrf
        db.session.add(blackout_date)
        db.session.commit()
        
        flash('Sortdato oprettet', 'success')
        return redirect(url_for('admin.blackout_dates'))
    
    return render_template('admin/blackout_date_form.html', form=form, title='Opret sortdato')


@bp.route('/settings')
@login_required
def settings():
    """Settings page."""
    delivery_settings = DeliverySetting.query.all()
    company_locations = CompanyLocation.query.filter_by(is_active=True).order_by(CompanyLocation.is_primary.desc(), CompanyLocation.name).all()
    cms_blocks = CMSBlock.query.order_by(CMSBlock.key).all()
    
    return render_template('admin/settings.html',
                         delivery_settings=delivery_settings,
                         company_locations=company_locations,
                         cms_blocks=cms_blocks)


@bp.route('/settings/delivery/create', methods=['GET', 'POST'])
@login_required
def create_delivery_setting():
    """Create delivery setting."""
    form = DeliverySettingForm()
    
    if form.validate_on_submit():
        delivery_setting = DeliverySetting(
            type=form.type.data,
            base_fee_dkk=Decimal(str(form.base_fee_dkk.data)),
            per_km_fee_dkk=Decimal(str(form.per_km_fee_dkk.data)),
            free_delivery_km=form.free_delivery_km.data,
            max_delivery_km=form.max_delivery_km.data if form.max_delivery_km.data else None,
            notes=form.notes.data,
            is_active=form.is_active.data
        )
        
        from app import db, csrf
        db.session.add(delivery_setting)
        db.session.commit()
        
        flash('Leveringsindstilling oprettet', 'success')
        return redirect(url_for('admin.settings'))
    
    return render_template('admin/delivery_setting_form.html', form=form, title='Opret leveringsindstilling')


@bp.route('/settings/delivery/<int:id>/edit', methods=['GET', 'POST'])
@login_required
def edit_delivery_setting(id):
    """Edit delivery setting."""
    delivery_setting = DeliverySetting.query.get_or_404(id)
    form = DeliverySettingForm(obj=delivery_setting)
    
    if form.validate_on_submit():
        delivery_setting.type = form.type.data
        delivery_setting.base_fee_dkk = Decimal(str(form.base_fee_dkk.data))
        delivery_setting.per_km_fee_dkk = Decimal(str(form.per_km_fee_dkk.data))
        delivery_setting.free_delivery_km = form.free_delivery_km.data
        delivery_setting.max_delivery_km = form.max_delivery_km.data if form.max_delivery_km.data else None
        delivery_setting.notes = form.notes.data
        delivery_setting.is_active = form.is_active.data
        
        db.session.commit()
        flash('Leveringsindstilling opdateret', 'success')
        return redirect(url_for('admin.settings'))
    
    return render_template('admin/delivery_setting_form.html', form=form, delivery_setting=delivery_setting, title='Rediger leveringsindstilling')


@bp.route('/settings/delivery/<int:id>/delete', methods=['POST'])
@login_required
def delete_delivery_setting(id):
    """Delete delivery setting."""
    delivery_setting = DeliverySetting.query.get_or_404(id)
    db.session.delete(delivery_setting)
    db.session.commit()
    flash('Leveringsindstilling slettet', 'success')
    return redirect(url_for('admin.settings'))


@bp.route('/settings/location/create', methods=['GET', 'POST'])
@login_required
def create_company_location():
    """Create company location."""
    form = CompanyLocationForm()
    
    if form.validate_on_submit():
        # If this is set as primary, unset other primary locations
        if form.is_primary.data:
            CompanyLocation.query.update({'is_primary': False})
        
        company_location = CompanyLocation(
            name=form.name.data,
            address=form.address.data,
            zip_code=form.zip_code.data,
            city=form.city.data,
            latitude=float(form.latitude.data) if form.latitude.data else None,
            longitude=float(form.longitude.data) if form.longitude.data else None,
            is_primary=form.is_primary.data,
            is_active=form.is_active.data
        )
        
        db.session.add(company_location)
        db.session.commit()
        
        flash('Virksomhedslokation oprettet', 'success')
        return redirect(url_for('admin.settings'))
    
    return render_template('admin/company_location_form.html', form=form, title='Opret virksomhedslokation')


@bp.route('/settings/location/<int:id>/edit', methods=['GET', 'POST'])
@login_required
def edit_company_location(id):
    """Edit company location."""
    company_location = CompanyLocation.query.get_or_404(id)
    form = CompanyLocationForm(obj=company_location)
    
    if form.validate_on_submit():
        # If this is set as primary, unset other primary locations
        if form.is_primary.data:
            CompanyLocation.query.filter(CompanyLocation.id != id).update({'is_primary': False})
        
        company_location.name = form.name.data
        company_location.address = form.address.data
        company_location.zip_code = form.zip_code.data
        company_location.city = form.city.data
        company_location.latitude = float(form.latitude.data) if form.latitude.data else None
        company_location.longitude = float(form.longitude.data) if form.longitude.data else None
        company_location.is_primary = form.is_primary.data
        company_location.is_active = form.is_active.data
        
        db.session.commit()
        flash('Virksomhedslokation opdateret', 'success')
        return redirect(url_for('admin.settings'))
    
    return render_template('admin/company_location_form.html', form=form, company_location=company_location, title='Rediger virksomhedslokation')


@bp.route('/settings/location/<int:id>/delete', methods=['POST'])
@login_required
def delete_company_location(id):
    """Delete company location."""
    company_location = CompanyLocation.query.get_or_404(id)
    db.session.delete(company_location)
    db.session.commit()
    flash('Virksomhedslokation slettet', 'success')
    return redirect(url_for('admin.settings'))


@bp.route('/settings/cms/create', methods=['GET', 'POST'])
@login_required
def create_cms_block():
    """Create CMS block."""
    form = CMSBlockForm()
    
    if form.validate_on_submit():
        cms_block = CMSBlock(
            key=form.key.data,
            title=form.title.data,
            content_md=form.content_md.data,
            is_active=form.is_active.data
        )
        
        from app import db, csrf
        db.session.add(cms_block)
        db.session.commit()
        
        flash('CMS blok oprettet', 'success')
        return redirect(url_for('admin.settings'))
    
    return render_template('admin/cms_block_form.html', form=form, title='Opret CMS blok')


@bp.route('/categories/<int:id>/delete', methods=['POST'])
@login_required
def delete_category(id):
    """Delete category."""
    category = Category.query.get_or_404(id)
    
    # Check if category has products
    if category.products:
        flash('Kan ikke slette kategori der har produkter', 'error')
        return redirect(url_for('admin.categories'))
    
    from app import db, csrf
    db.session.delete(category)
    db.session.commit()
    
    flash('Kategori slettet', 'success')
    return redirect(url_for('admin.categories'))


@bp.route('/blackout-dates/<int:id>/edit', methods=['GET', 'POST'])
@login_required
def edit_blackout_date(id):
    """Edit blackout date."""
    blackout_date = BlackoutDate.query.get_or_404(id)
    form = BlackoutDateForm(obj=blackout_date)
    
    if form.validate_on_submit():
        blackout_date.date = form.date.data
        blackout_date.description = form.description.data
        blackout_date.is_active = form.is_active.data
        
        from app import db, csrf
        db.session.commit()
        
        flash('Sortdato opdateret', 'success')
        return redirect(url_for('admin.blackout_dates'))
    
    return render_template('admin/blackout_date_form.html', form=form, title='Rediger sortdato', blackout_date=blackout_date)


@bp.route('/blackout-dates/<int:id>/delete', methods=['POST'])
@login_required
def delete_blackout_date(id):
    """Delete blackout date."""
    blackout_date = BlackoutDate.query.get_or_404(id)
    
    from app import db, csrf
    db.session.delete(blackout_date)
    db.session.commit()
    
    flash('Sortdato slettet', 'success')
    return redirect(url_for('admin.blackout_dates'))


@bp.route('/settings/cms/<int:id>/delete', methods=['POST'])
@login_required
def delete_cms_block(id):
    """Delete CMS block."""
    cms_block = CMSBlock.query.get_or_404(id)
    
    from app import db, csrf
    db.session.delete(cms_block)
    db.session.commit()
    
    flash('CMS blok slettet', 'success')
    return redirect(url_for('admin.settings'))


@bp.route('/customers')
@login_required
def customers():
    """Customers management page."""
    from app.models import Customer
    from sqlalchemy import func
    
    page = request.args.get('page', 1, type=int)
    search = request.args.get('search', '')
    status = request.args.get('status', '')
    
    query = Customer.query
    
    # Search filter
    if search:
        query = query.filter(
            Customer.first_name.contains(search) |
            Customer.last_name.contains(search) |
            Customer.email.contains(search) |
            Customer.phone.contains(search)
        )
    
    # Status filter
    if status == 'active':
        query = query.filter(Customer.is_active == True)
    elif status == 'inactive':
        query = query.filter(Customer.is_active == False)
    
    # Order by creation date
    query = query.order_by(Customer.created_at.desc())
    
    # Paginate
    customers = query.paginate(
        page=page, per_page=20, error_out=False
    )
    
    # Calculate stats
    total_customers = Customer.query.count()
    active_customers = Customer.query.filter(Customer.is_active == True).count()
    
    return render_template('admin/customers.html', 
                         customers=customers,
                         search=search,
                         status=status,
                         total_customers=total_customers,
                         active_customers=active_customers)


@bp.route('/analytics')
@login_required
def analytics():
    """Analytics dashboard."""
    # Get basic stats
    total_bookings = Booking.query.filter(
        Booking.status != BookingStatus.CANCELLED,
        Booking.is_deleted == False
    ).count()
    total_revenue = db.session.query(func.sum(Booking.total_dkk)).filter(
        Booking.status != BookingStatus.CANCELLED,
        Booking.is_deleted == False
    ).scalar() or 0
    total_products = Product.query.count()
    active_products = Product.query.filter(Product.is_active == True).count()
    
    # Get monthly revenue data for chart
    # Use database-specific date formatting
    from sqlalchemy import text, literal_column
    if current_app.config.get('SQLALCHEMY_DATABASE_URI', '').startswith('mysql'):
        # MySQL uses DATE_FORMAT
        month_col = literal_column("DATE_FORMAT(created_at, '%Y-%m')").label('month')
        monthly_revenue = db.session.query(
            month_col,
            func.sum(Booking.total_dkk).label('revenue')
        ).select_from(Booking).filter(
            Booking.status != BookingStatus.CANCELLED,
            Booking.is_deleted == False
        ).group_by(month_col).order_by(month_col).all()
    else:
        # SQLite uses strftime
        monthly_revenue = db.session.query(
            func.strftime('%Y-%m', Booking.created_at).label('month'),
            func.sum(Booking.total_dkk).label('revenue')
        ).filter(
            Booking.status != BookingStatus.CANCELLED,
            Booking.is_deleted == False
        ).group_by(func.strftime('%Y-%m', Booking.created_at)).order_by('month').all()
    
    # Get top products
    top_products = db.session.query(
        Product.name,
        func.count(BookingItem.id).label('bookings_count')
    ).join(BookingItem, Product.id == BookingItem.product_id
    ).join(Booking, BookingItem.booking_id == Booking.id
    ).filter(
        Booking.status != BookingStatus.CANCELLED,
        Booking.is_deleted == False
    ).group_by(Product.id).order_by(func.count(BookingItem.id).desc()).limit(5).all()
    
    return render_template('admin/analytics.html', 
                         total_bookings=total_bookings,
                         total_revenue=total_revenue,
                         total_products=total_products,
                         active_products=active_products,
                         monthly_revenue=monthly_revenue,
                         top_products=top_products)


@bp.route('/api/stats/products')
@login_required
def api_stats_products():
    """API endpoint for product count."""
    count = Product.query.count()
    return jsonify({'count': count})


@bp.route('/api/stats/pending-bookings')
@login_required
def api_stats_pending_bookings():
    """API endpoint for pending bookings count."""
    count = Booking.query.filter(Booking.status == 'pending').count()
    return jsonify({'count': count})


@bp.route('/api/debug/images')
@login_required
def api_debug_images():
    """Debug endpoint to check product image paths."""
    products = Product.query.all()
    debug_info = []
    for product in products:
        debug_info.append({
            'id': product.id,
            'name': product.name,
            'hero_image_url': product.hero_image_url,
            'is_active': product.is_active
        })
    return jsonify({'products': debug_info})


@bp.route('/upsell-products')
@login_required
def upsell_products():
    """List all upsell products."""
    page = request.args.get('page', 1, type=int)
    per_page = 20
    
    upsell_products = UpsellProduct.query.order_by(UpsellProduct.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    return render_template('admin/upsell_products.html', upsell_products=upsell_products)


@bp.route('/upsell-products/new', methods=['GET', 'POST'])
@login_required
def create_upsell_product():
    """Create new upsell product."""
    form = UpsellProductForm()
    
    # Populate category choices
    categories = Category.query.filter_by(is_active=True).order_by(Category.name).all()
    form.category_id.choices = [(0, 'Ingen kategori')] + [(cat.id, cat.name) for cat in categories]
    
    if form.validate_on_submit():
        # Handle image upload
        image_url = None
        if form.image.data:
            image_url = save_uploaded_file(form.image.data)
        
        # Create upsell product
        upsell_product = UpsellProduct(
            name=form.name.data,
            description=form.description.data,
            price_dkk=float(form.price_dkk.data),
            stock_qty=form.stock_qty.data,
            image_url=image_url,
            category_id=form.category_id.data if form.category_id.data != 0 else None,
            is_active=form.is_active.data
        )
        
        db.session.add(upsell_product)
        db.session.commit()
        
        flash(f'Mersalgs produkt "{upsell_product.name}" er oprettet', 'success')
        return redirect(url_for('admin.upsell_products'))
    
    return render_template('admin/upsell_product_form.html', form=form, upsell_product=None)


@bp.route('/upsell-products/<int:upsell_product_id>/edit', methods=['GET', 'POST'])
@login_required
def edit_upsell_product(upsell_product_id):
    """Edit upsell product."""
    upsell_product = UpsellProduct.query.get_or_404(upsell_product_id)
    form = UpsellProductForm(obj=upsell_product)
    
    # Populate category choices
    categories = Category.query.filter_by(is_active=True).order_by(Category.name).all()
    form.category_id.choices = [(0, 'Ingen kategori')] + [(cat.id, cat.name) for cat in categories]
    
    # Convert price to string for form and set category
    if request.method == 'GET':
        form.price_dkk.data = str(upsell_product.price_dkk)
        form.category_id.data = upsell_product.category_id or 0
    
    if form.validate_on_submit():
        # Handle image upload
        if form.image.data:
            new_image_url = save_uploaded_file(form.image.data)
            if new_image_url:
                upsell_product.image_url = new_image_url
        
        # Update upsell product
        upsell_product.name = form.name.data
        upsell_product.description = form.description.data
        upsell_product.price_dkk = float(form.price_dkk.data)
        upsell_product.stock_qty = form.stock_qty.data
        upsell_product.category_id = form.category_id.data if form.category_id.data != 0 else None
        upsell_product.is_active = form.is_active.data
        
        db.session.commit()
        
        flash(f'Mersalgs produkt "{upsell_product.name}" er opdateret', 'success')
        return redirect(url_for('admin.upsell_products'))
    
    return render_template('admin/upsell_product_form.html', form=form, upsell_product=upsell_product)


@bp.route('/upsell-products/<int:upsell_product_id>/delete', methods=['POST'])
@login_required
def delete_upsell_product(upsell_product_id):
    """Delete upsell product."""
    try:
        validate_csrf(request.form.get('csrf_token'))
    except BadRequest:
        flash('Ugyldig CSRF token', 'error')
        return redirect(url_for('admin.upsell_products'))
    
    upsell_product = UpsellProduct.query.get_or_404(upsell_product_id)
    
    # Delete all product links first (cascade will handle this, but let's be explicit)
    ProductUpsell.query.filter_by(upsell_product_id=upsell_product_id).delete()
    
    # Now delete the upsell product
    db.session.delete(upsell_product)
    db.session.commit()
    
    flash(f'Mersalgs produkt "{upsell_product.name}" er slettet', 'success')
    return redirect(url_for('admin.upsell_products'))


@bp.route('/products/<int:product_id>/upsells')
@login_required
def product_upsells(product_id):
    """Manage upsells for a specific product."""
    product = Product.query.get_or_404(product_id)
    
    # Get current upsells
    current_upsells = db.session.query(ProductUpsell, UpsellProduct).join(
        UpsellProduct, ProductUpsell.upsell_product_id == UpsellProduct.id
    ).filter(ProductUpsell.product_id == product_id, ProductUpsell.is_active == True).order_by(ProductUpsell.sort_order).all()
    
    # Get available upsells (not already linked)
    linked_upsell_ids = [upsell.ProductUpsell.upsell_product_id for upsell in current_upsells]
    available_upsells = UpsellProduct.query.filter(
        UpsellProduct.is_active == True,
        ~UpsellProduct.id.in_(linked_upsell_ids) if linked_upsell_ids else True
    ).all()
    
    return render_template('admin/product_upsells.html', 
                         product=product, 
                         current_upsells=current_upsells,
                         available_upsells=available_upsells)


@bp.route('/products/<int:product_id>/upsells/add', methods=['POST'])
@login_required
def add_product_upsell(product_id):
    """Add upsell to product."""
    try:
        validate_csrf(request.form.get('csrf_token'))
    except BadRequest:
        flash('Ugyldig CSRF token', 'error')
        return redirect(url_for('admin.product_upsells', product_id=product_id))
    
    product = Product.query.get_or_404(product_id)
    upsell_product_id = request.form.get('upsell_product_id', type=int)
    
    if not upsell_product_id:
        flash('Vælg et mersalgs produkt', 'error')
        return redirect(url_for('admin.product_upsells', product_id=product_id))
    
    # Check if association already exists
    existing = ProductUpsell.query.filter_by(
        product_id=product_id, 
        upsell_product_id=upsell_product_id
    ).first()
    
    if existing:
        if existing.is_active:
            flash('Dette mersalgs produkt er allerede tilknyttet', 'warning')
        else:
            existing.is_active = True
            db.session.commit()
            flash('Mersalgs produkt er genaktiveret', 'success')
    else:
        # Get next sort order
        max_order = db.session.query(func.max(ProductUpsell.sort_order)).filter_by(product_id=product_id).scalar() or 0
        
        product_upsell = ProductUpsell(
            product_id=product_id,
            upsell_product_id=upsell_product_id,
            sort_order=max_order + 1,
            is_active=True
        )
        
        db.session.add(product_upsell)
        db.session.commit()
        
        flash('Mersalgs produkt er tilknyttet', 'success')
    
    return redirect(url_for('admin.product_upsells', product_id=product_id))


@bp.route('/products/<int:product_id>/upsells/<int:upsell_id>/remove', methods=['POST'])
@login_required
def remove_product_upsell(product_id, upsell_id):
    """Remove upsell from product."""
    try:
        validate_csrf(request.form.get('csrf_token'))
    except BadRequest:
        flash('Ugyldig CSRF token', 'error')
        return redirect(url_for('admin.product_upsells', product_id=product_id))
    
    product_upsell = ProductUpsell.query.filter_by(
        product_id=product_id,
        upsell_product_id=upsell_id
    ).first_or_404()
    
    product_upsell.is_active = False
    db.session.commit()
    
    flash('Mersalgs produkt er fjernet', 'success')
    return redirect(url_for('admin.product_upsells', product_id=product_id))


@bp.route('/overview-calendar')
@login_required
def overview_calendar():
    """Overview calendar showing all bookings."""
    # Get all products for filtering
    products = Product.query.filter_by(is_active=True).order_by(Product.name).all()
    
    return render_template('admin/overview_calendar.html', products=products)


@bp.route('/api/overview-calendar-data')
@login_required
def api_overview_calendar_data():
    """API endpoint for overview calendar data."""
    start_date_str = request.args.get('start')
    end_date_str = request.args.get('end')
    product_id = request.args.get('product_id', type=int)
    
    if not start_date_str or not end_date_str:
        return jsonify({'error': 'Missing start or end date'}), 400
    
    try:
        from datetime import datetime
        start_date = datetime.fromisoformat(start_date_str.replace('Z', '')).date()
        end_date = datetime.fromisoformat(end_date_str.replace('Z', '')).date()
    except ValueError:
        return jsonify({'error': 'Invalid date format'}), 400
    
    # Build query for bookings (exclude deleted and cancelled)
    query = db.session.query(Booking).join(BookingItem).join(Product).filter(
        and_(
            Booking.start_date <= end_date,
            Booking.end_date >= start_date,
            Booking.status != BookingStatus.CANCELLED,
            Booking.is_deleted == False
        )
    )
    
    # Filter by product if specified
    if product_id:
        query = query.filter(BookingItem.product_id == product_id)
    
    bookings = query.distinct().all()
    
    events = []
    for booking in bookings:
        # Get all products for this booking
        product_names = [item.product.name for item in booking.items if item.product]
        
        # Determine color based on status
        if booking.status == BookingStatus.PENDING:
            color = '#f59e0b'  # Amber
        elif booking.status == BookingStatus.DEPOSIT_PAID:
            color = '#3b82f6'  # Blue
        elif booking.status == BookingStatus.OUT_FOR_DELIVERY:
            color = '#8b5cf6'  # Purple
        elif booking.status == BookingStatus.RETURNED_GOOD:
            color = '#10b981'  # Green
        elif booking.status == BookingStatus.RETURNED_DAMAGED:
            color = '#f59e0b'  # Orange
        elif booking.status == BookingStatus.FULLY_PAID:
            color = '#10b981'  # Green
        else:
            color = '#6b7280'  # Gray
        
        events.append({
            'id': booking.id,
            'title': f"{booking.customer_name} - {', '.join(product_names[:2])}{'...' if len(product_names) > 2 else ''}",
            'start': booking.start_date.isoformat(),
            'end': (booking.end_date + timedelta(days=1)).isoformat(),  # FullCalendar end is exclusive
            'color': color,
            'extendedProps': {
                'booking_no': booking.booking_no,
                'customer_name': booking.customer_name,
                'customer_email': booking.email,
                'customer_phone': booking.phone,
                'status': booking.status.value,
                'total': float(booking.total_dkk),
                'products': product_names,
                'item_count': len(booking.items)
            }
        })
    
    return jsonify(events)


@bp.route('/api/geocode', methods=['POST'])
@login_required
def geocode_address():
    """Geocode an address to get GPS coordinates."""
    try:
        data = request.get_json()
        address = data.get('address', '').strip()
        zip_code = data.get('zip_code', '').strip()
        city = data.get('city', '').strip()
        
        if not address or not zip_code or not city:
            return jsonify({
                'success': False,
                'error': 'Adresse, postnummer og by er påkrævet'
            }), 400
        
        # Use the DistanceService to geocode the address
        coords = DistanceService.geocode_address(address, zip_code, city)
        
        if coords:
            latitude, longitude = coords
            return jsonify({
                'success': True,
                'latitude': latitude,
                'longitude': longitude
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Kunne ikke finde GPS-koordinater for denne adresse'
            }), 400
            
    except Exception as e:
        current_app.logger.error(f'Geocoding error: {e}')
        return jsonify({
            'success': False,
            'error': 'Der opstod en fejl under søgning efter GPS-koordinater'
        }), 500
