"""Public blueprint for main website pages."""

from flask import Blueprint, render_template, request, jsonify, current_app, session
from sqlalchemy import desc, and_
from sqlalchemy.orm import Session

from app.models import Product, Category, CMSBlock, UpsellProduct, ProductUpsell
from app.services.availability import AvailabilityService
from app.services.pricing import PricingService, BookingItemDTO, DeliveryType

bp = Blueprint('public', __name__)


def get_cart_count():
    """Helper function to get cart count."""
    cart = session.get('cart', [])
    return sum(item.get('quantity', 1) for item in cart)


@bp.route('/')
def index():
    """Homepage with featured products and CMS content."""
    # Get featured products
    featured_products = Product.query.filter(
        Product.is_active == True
    ).order_by(desc(Product.created_at)).limit(6).all()
    
    # Get categories
    categories = Category.query.filter(
        Category.is_active == True
    ).order_by(Category.sort_order, Category.name).all()
    
    # Get CMS blocks
    hero_block = CMSBlock.query.filter_by(key='homepage_hero', is_active=True).first()
    about_block = CMSBlock.query.filter_by(key='about_us', is_active=True).first()
    
    return render_template('public/index.html',
                         featured_products=featured_products,
                         categories=categories,
                         hero_block=hero_block,
                         about_block=about_block)




@bp.route('/catalog')
def catalog():
    """Product catalog with filtering."""
    page = request.args.get('page', 1, type=int)
    category_id = request.args.get('category', type=int)
    search = request.args.get('search', '')
    sort_by = request.args.get('sort', 'name')
    
    # Build query
    query = Product.query.filter(Product.is_active == True)
    
    # Filter by category
    if category_id:
        query = query.filter(Product.category_id == category_id)
    
    # Search filter
    if search:
        query = query.filter(
            Product.name.contains(search) | 
            Product.description.contains(search)
        )
    
    # Sorting
    if sort_by == 'price_low':
        query = query.order_by(Product.daily_price_dkk.asc())
    elif sort_by == 'price_high':
        query = query.order_by(Product.daily_price_dkk.desc())
    elif sort_by == 'newest':
        query = query.order_by(desc(Product.created_at))
    else:  # name
        query = query.order_by(Product.name.asc())
    
    # Pagination
    products = query.paginate(
        page=page, per_page=12, error_out=False
    )
    
    # Get categories for filter
    categories = Category.query.filter(
        Category.is_active == True
    ).order_by(Category.name).all()
    
    return render_template('public/catalog.html',
                         products=products,
                         categories=categories,
                         current_category=category_id,
                         search=search,
                         sort_by=sort_by)


@bp.route('/product/<slug>')
def product_detail(slug):
    """Product detail page with availability checker."""
    product = Product.query.filter_by(slug=slug, is_active=True).first_or_404()
    
    # Get related products from same category
    related_products = Product.query.filter(
        Product.category_id == product.category_id,
        Product.id != product.id,
        Product.is_active == True
    ).limit(4).all()
    
    # Get upsell products
    try:
        upsell_products = current_app.extensions['sqlalchemy'].session.query(UpsellProduct).join(
            ProductUpsell, UpsellProduct.id == ProductUpsell.upsell_product_id
        ).filter(
            ProductUpsell.product_id == product.id,
            ProductUpsell.is_active == True,
            UpsellProduct.is_active == True,
            UpsellProduct.stock_qty > 0
        ).order_by(ProductUpsell.sort_order).all()
    except Exception as e:
        # Handle case where upsell tables don't exist or other database issues
        upsell_products = []
    
    return render_template('public/product_detail.html',
                         product=product,
                         related_products=related_products,
                         upsell_products=upsell_products)



@bp.route('/calendar/<slug>')
def product_calendar(slug):
    """Product availability calendar."""
    product = Product.query.filter_by(slug=slug, is_active=True).first_or_404()
    return render_template('public/calendar.html', product=product, products=[product])


@bp.route('/kontakt')
def contact():
    """Contact page."""
    contact_block = CMSBlock.query.filter_by(key='contact_info', is_active=True).first()
    return render_template('public/contact.html', contact_block=contact_block)


@bp.route('/lejebetingelser')
def terms():
    """Terms and conditions page."""
    terms_block = CMSBlock.query.filter_by(key='terms_conditions', is_active=True).first()
    return render_template('public/terms.html', terms_block=terms_block)


@bp.route('/faq')
def faq():
    """FAQ page."""
    faq_block = CMSBlock.query.filter_by(key='faq', is_active=True).first()
    return render_template('public/faq.html', faq_block=faq_block)


@bp.route('/om-os')
def about():
    """About us page."""
    about_block = CMSBlock.query.filter_by(key='about_us', is_active=True).first()
    return render_template('public/about.html', about_block=about_block)


# API endpoints for HTMX
@bp.route('/api/availability/<int:product_id>')
def check_availability_public(product_id):
    """Check product availability for given dates."""
    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')
    
    if not start_date_str or not end_date_str:
        return jsonify({'error': 'Start and end dates required'}), 400
    
    try:
        from datetime import datetime
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Invalid date format'}), 400
    
    # Check availability
    db_session = current_app.extensions['sqlalchemy'].session
    availability_service = AvailabilityService(db_session)
    
    available_qty = availability_service.available_quantity(
        product_id, start_date, end_date
    )
    
    return jsonify({
        'available_quantity': available_qty,
        'is_available': available_qty > 0
    })


@bp.route('/api/price-estimate/<int:product_id>')
def get_price_estimate(product_id):
    """Get price estimate for product and dates."""
    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')
    quantity = request.args.get('quantity', 1, type=int)
    delivery_type = request.args.get('delivery_type', 'pickup')
    
    if not start_date_str or not end_date_str:
        return jsonify({'error': 'Start and end dates required'}), 400
    
    try:
        from datetime import datetime
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


