"""SQLAlchemy models for the party rental business."""

from datetime import datetime, date
from decimal import Decimal
from enum import Enum
from typing import List, Optional

from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from sqlalchemy import Index, CheckConstraint, func
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from werkzeug.security import generate_password_hash, check_password_hash

from app import db


class UserRole(str, Enum):
    """User roles."""
    ADMIN = "admin"
    STAFF = "staff"


class CustomerRole(str, Enum):
    """Customer roles."""
    CUSTOMER = "customer"


class BookingStatus(str, Enum):
    """Booking statuses."""
    PENDING = "pending"  # Booking created, no payment yet
    DEPOSIT_PAID = "deposit_paid"  # Deposit + delivery paid, rental amount pending
    OUT_FOR_DELIVERY = "out_for_delivery"  # Items delivered to customer
    RETURNED_GOOD = "returned_good"  # Items returned in good condition, rental payment due
    RETURNED_DAMAGED = "returned_damaged"  # Items returned damaged, deposit may be forfeited
    DEPOSIT_REFUNDED = "deposit_refunded"  # Deposit manually refunded by admin
    FULLY_PAID = "fully_paid"  # All payments completed
    CANCELLED = "cancelled"  # Booking cancelled


class DeliveryType(str, Enum):
    """Delivery types."""
    PICKUP = "pickup"
    DELIVERY = "delivery"


class PricingRuleType(str, Enum):
    """Pricing rule types."""
    WEEKEND = "weekend"
    SEASON = "season"
    CUSTOM = "custom"


class User(UserMixin, db.Model):
    """User model for authentication."""
    __tablename__ = 'users'
    
    id: Mapped[int] = mapped_column(db.Integer, primary_key=True)
    email: Mapped[str] = mapped_column(db.String(120), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(db.String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(db.Enum(UserRole), default=UserRole.STAFF, nullable=False)
    created_at: Mapped[datetime] = mapped_column(db.DateTime, default=datetime.utcnow, nullable=False)
    is_active: Mapped[bool] = mapped_column(db.Boolean, default=True, nullable=False)
    
    def set_password(self, password: str) -> None:
        """Set password hash."""
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password: str) -> bool:
        """Check password."""
        return check_password_hash(self.password_hash, password)
    
    def __repr__(self) -> str:
        return f'<User {self.email}>'


class Customer(db.Model, UserMixin):
    """Customer model for customer portal access."""
    __tablename__ = 'customers'
    
    id: Mapped[int] = mapped_column(db.Integer, primary_key=True)
    email: Mapped[str] = mapped_column(db.String(120), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(db.String(255), nullable=False)
    first_name: Mapped[str] = mapped_column(db.String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(db.String(100), nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(db.String(20))
    address: Mapped[Optional[str]] = mapped_column(db.String(300))
    zip_code: Mapped[Optional[str]] = mapped_column(db.String(10))
    city: Mapped[Optional[str]] = mapped_column(db.String(100))
    is_active: Mapped[bool] = mapped_column(db.Boolean, default=True, nullable=False)
    email_verified: Mapped[bool] = mapped_column(db.Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(db.DateTime, default=datetime.utcnow, nullable=False)
    last_login: Mapped[Optional[datetime]] = mapped_column(db.DateTime)
    
    # Relationships
    bookings: Mapped[List["Booking"]] = relationship("Booking", back_populates="customer", cascade="all, delete-orphan")
    cart_items: Mapped[List["CartItem"]] = relationship("CartItem", back_populates="customer", cascade="all, delete-orphan")
    
    def set_password(self, password):
        """Set password hash."""
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """Check password hash."""
        return check_password_hash(self.password_hash, password)
    
    @property
    def full_name(self):
        """Get customer's full name."""
        return f"{self.first_name} {self.last_name}"
    
    def __repr__(self) -> str:
        return f'<Customer {self.email}>'


class CartItem(db.Model):
    """Cart item model for user-based shopping cart."""
    __tablename__ = 'cart_items'
    
    id: Mapped[int] = mapped_column(db.Integer, primary_key=True)
    customer_id: Mapped[int] = mapped_column(db.Integer, db.ForeignKey('customers.id'), nullable=False, index=True)
    product_id: Mapped[int] = mapped_column(db.Integer, db.ForeignKey('products.id'), nullable=False, index=True)
    quantity: Mapped[int] = mapped_column(db.Integer, nullable=False, default=1)
    delivery_type: Mapped[str] = mapped_column(db.String(20), nullable=False, default='pickup')
    start_date: Mapped[date] = mapped_column(db.Date, nullable=True)
    end_date: Mapped[date] = mapped_column(db.Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    customer: Mapped["Customer"] = relationship("Customer", back_populates="cart_items")
    product: Mapped["Product"] = relationship("Product")
    upsell_items: Mapped[List["CartUpsellItem"]] = relationship("CartUpsellItem", back_populates="cart_item", cascade="all, delete-orphan")
    
    def __repr__(self) -> str:
        return f'<CartItem {self.customer_id}:{self.product_id}:{self.quantity}>'


class CartUpsellItem(db.Model):
    """Cart upsell item model for add-on products in cart."""
    __tablename__ = 'cart_upsell_items'
    
    id: Mapped[int] = mapped_column(db.Integer, primary_key=True)
    cart_item_id: Mapped[int] = mapped_column(db.Integer, db.ForeignKey('cart_items.id'), nullable=False, index=True)
    upsell_product_id: Mapped[int] = mapped_column(db.Integer, db.ForeignKey('upsell_products.id'), nullable=False, index=True)
    quantity: Mapped[int] = mapped_column(db.Integer, nullable=False, default=1)
    created_at: Mapped[datetime] = mapped_column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Constraints
    __table_args__ = (
        CheckConstraint('quantity > 0', name='check_cart_upsell_quantity_positive'),
    )
    
    # Relationships
    cart_item: Mapped["CartItem"] = relationship("CartItem", back_populates="upsell_items")
    upsell_product: Mapped["UpsellProduct"] = relationship("UpsellProduct")
    
    def __repr__(self) -> str:
        return f'<CartUpsellItem {self.cart_item_id}:{self.upsell_product_id}:{self.quantity}>'


class NewsletterSubscription(db.Model):
    """Newsletter subscription model."""
    __tablename__ = 'newsletter_subscriptions'
    
    id: Mapped[int] = mapped_column(db.Integer, primary_key=True)
    email: Mapped[str] = mapped_column(db.String(200), unique=True, nullable=False, index=True)
    is_active: Mapped[bool] = mapped_column(db.Boolean, default=True, nullable=False)
    subscribed_at: Mapped[datetime] = mapped_column(db.DateTime, default=datetime.utcnow, nullable=False)
    unsubscribed_at: Mapped[Optional[datetime]] = mapped_column(db.DateTime, nullable=True)
    
    def __repr__(self) -> str:
        return f'<NewsletterSubscription {self.email}>'


class Category(db.Model):
    """Product category model."""
    __tablename__ = 'categories'
    
    id: Mapped[int] = mapped_column(db.Integer, primary_key=True)
    name: Mapped[str] = mapped_column(db.String(100), nullable=False)
    slug: Mapped[str] = mapped_column(db.String(100), unique=True, nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(db.Text)
    is_active: Mapped[bool] = mapped_column(db.Boolean, default=True, nullable=False)
    sort_order: Mapped[int] = mapped_column(db.Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    products: Mapped[List["Product"]] = relationship("Product", back_populates="category", lazy="dynamic")
    
    def __repr__(self) -> str:
        return f'<Category {self.name}>'


class UpsellProduct(db.Model):
    """Upsell product model for add-on items (mersalgs produkter)."""
    __tablename__ = 'upsell_products'
    
    id: Mapped[int] = mapped_column(db.Integer, primary_key=True)
    name: Mapped[str] = mapped_column(db.String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(db.Text)
    price_dkk: Mapped[Decimal] = mapped_column(db.Numeric(10, 2), nullable=False)
    stock_qty: Mapped[int] = mapped_column(db.Integer, nullable=False, default=1)
    is_active: Mapped[bool] = mapped_column(db.Boolean, default=True, nullable=False)
    image_url: Mapped[Optional[str]] = mapped_column(db.String(500))
    created_at: Mapped[datetime] = mapped_column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Constraints
    __table_args__ = (
        CheckConstraint('price_dkk >= 0', name='check_upsell_price_positive'),
        CheckConstraint('stock_qty >= 0', name='check_upsell_stock_positive'),
    )
    
    # Relationships
    product_upsells: Mapped[List["ProductUpsell"]] = relationship("ProductUpsell", back_populates="upsell_product", cascade="all, delete-orphan")
    
    def __repr__(self) -> str:
        return f'<UpsellProduct {self.name}>'


class ProductUpsell(db.Model):
    """Association model linking products to their upsell products."""
    __tablename__ = 'product_upsells'
    
    id: Mapped[int] = mapped_column(db.Integer, primary_key=True)
    product_id: Mapped[int] = mapped_column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    upsell_product_id: Mapped[int] = mapped_column(db.Integer, db.ForeignKey('upsell_products.id'), nullable=False)
    sort_order: Mapped[int] = mapped_column(db.Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(db.Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    # Unique constraint to prevent duplicate associations
    __table_args__ = (
        Index('idx_product_upsell_unique', 'product_id', 'upsell_product_id', unique=True),
    )
    
    # Relationships
    product: Mapped["Product"] = relationship("Product", back_populates="upsells")
    upsell_product: Mapped["UpsellProduct"] = relationship("UpsellProduct", back_populates="product_upsells")
    
    def __repr__(self) -> str:
        return f'<ProductUpsell {self.product_id}->{self.upsell_product_id}>'


class Product(db.Model):
    """Product model for rental items."""
    __tablename__ = 'products'
    
    id: Mapped[int] = mapped_column(db.Integer, primary_key=True)
    category_id: Mapped[int] = mapped_column(db.Integer, db.ForeignKey('categories.id'), nullable=False)
    name: Mapped[str] = mapped_column(db.String(200), nullable=False)
    slug: Mapped[str] = mapped_column(db.String(200), unique=True, nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(db.Text)
    daily_price_dkk: Mapped[Decimal] = mapped_column(db.Numeric(10, 2), nullable=False)
    weekend_price_dkk: Mapped[Optional[Decimal]] = mapped_column(db.Numeric(10, 2))
    deposit_dkk: Mapped[Optional[Decimal]] = mapped_column(db.Numeric(10, 2))
    stock_qty: Mapped[int] = mapped_column(db.Integer, nullable=False, default=1)
    prep_buffer_days: Mapped[int] = mapped_column(db.Integer, default=0, nullable=False)
    cleanup_buffer_days: Mapped[int] = mapped_column(db.Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(db.Boolean, default=True, nullable=False)
    hero_image_url: Mapped[Optional[str]] = mapped_column(db.String(500))
    created_at: Mapped[datetime] = mapped_column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Constraints
    __table_args__ = (
        CheckConstraint('daily_price_dkk >= 0', name='check_daily_price_positive'),
        CheckConstraint('weekend_price_dkk >= 0', name='check_weekend_price_positive'),
        CheckConstraint('deposit_dkk >= 0', name='check_deposit_positive'),
        CheckConstraint('stock_qty > 0', name='check_stock_positive'),
        CheckConstraint('prep_buffer_days >= 0', name='check_prep_buffer_positive'),
        CheckConstraint('cleanup_buffer_days >= 0', name='check_cleanup_buffer_positive'),
    )
    
    # Relationships
    category: Mapped["Category"] = relationship("Category", back_populates="products")
    images: Mapped[List["ProductImage"]] = relationship("ProductImage", back_populates="product", cascade="all, delete-orphan")
    pricing_rules: Mapped[List["PricingRule"]] = relationship("PricingRule", back_populates="product", cascade="all, delete-orphan")
    blackout_dates: Mapped[List["BlackoutDate"]] = relationship("BlackoutDate", back_populates="product", cascade="all, delete-orphan")
    booking_items: Mapped[List["BookingItem"]] = relationship("BookingItem", back_populates="product")
    upsells: Mapped[List["ProductUpsell"]] = relationship("ProductUpsell", back_populates="product", cascade="all, delete-orphan")
    
    def __repr__(self) -> str:
        return f'<Product {self.name}>'


class ProductImage(db.Model):
    """Product image model."""
    __tablename__ = 'product_images'
    
    id: Mapped[int] = mapped_column(db.Integer, primary_key=True)
    product_id: Mapped[int] = mapped_column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    url: Mapped[str] = mapped_column(db.String(500), nullable=False)
    alt: Mapped[str] = mapped_column(db.String(200), nullable=False)
    sort_order: Mapped[int] = mapped_column(db.Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    product: Mapped["Product"] = relationship("Product", back_populates="images")
    
    def __repr__(self) -> str:
        return f'<ProductImage {self.alt}>'


class PricingRule(db.Model):
    """Pricing rule model for dynamic pricing."""
    __tablename__ = 'pricing_rules'
    
    id: Mapped[int] = mapped_column(db.Integer, primary_key=True)
    product_id: Mapped[int] = mapped_column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    rule_type: Mapped[PricingRuleType] = mapped_column(db.Enum(PricingRuleType), nullable=False)
    value_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    is_active: Mapped[bool] = mapped_column(db.Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    product: Mapped["Product"] = relationship("Product", back_populates="pricing_rules")
    
    def __repr__(self) -> str:
        return f'<PricingRule {self.rule_type}>'


class BlackoutDate(db.Model):
    """Blackout date model for maintenance/unavailable periods."""
    __tablename__ = 'blackout_dates'
    
    id: Mapped[int] = mapped_column(db.Integer, primary_key=True)
    product_id: Mapped[int] = mapped_column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    start_date: Mapped[date] = mapped_column(db.Date, nullable=False)
    end_date: Mapped[date] = mapped_column(db.Date, nullable=False)
    reason: Mapped[Optional[str]] = mapped_column(db.String(200))
    created_at: Mapped[datetime] = mapped_column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    # Constraints
    __table_args__ = (
        CheckConstraint('end_date >= start_date', name='check_end_after_start'),
        Index('idx_blackout_dates_product_dates', 'product_id', 'start_date', 'end_date'),
    )
    
    # Relationships
    product: Mapped["Product"] = relationship("Product", back_populates="blackout_dates")
    
    def __repr__(self) -> str:
        return f'<BlackoutDate {self.start_date} to {self.end_date}>'


class Booking(db.Model):
    """Booking model for customer orders."""
    __tablename__ = 'bookings'
    
    id: Mapped[int] = mapped_column(db.Integer, primary_key=True)
    booking_no: Mapped[str] = mapped_column(db.String(20), unique=True, nullable=False, index=True)
    customer_id: Mapped[Optional[int]] = mapped_column(db.Integer, db.ForeignKey('customers.id'), nullable=True, index=True)
    customer_name: Mapped[str] = mapped_column(db.String(200), nullable=False)
    email: Mapped[str] = mapped_column(db.String(200), nullable=False, index=True)
    phone: Mapped[str] = mapped_column(db.String(20), nullable=False)
    address: Mapped[str] = mapped_column(db.String(300), nullable=False)
    zip_code: Mapped[str] = mapped_column(db.String(10), nullable=False)
    city: Mapped[str] = mapped_column(db.String(100), nullable=False)
    start_date: Mapped[date] = mapped_column(db.Date, nullable=False)
    end_date: Mapped[date] = mapped_column(db.Date, nullable=False)
    subtotal_dkk: Mapped[Decimal] = mapped_column(db.Numeric(10, 2), nullable=False)
    vat_dkk: Mapped[Decimal] = mapped_column(db.Numeric(10, 2), nullable=False)
    deposit_dkk: Mapped[Decimal] = mapped_column(db.Numeric(10, 2), nullable=False)
    delivery_fee_dkk: Mapped[Decimal] = mapped_column(db.Numeric(10, 2), nullable=False)
    total_dkk: Mapped[Decimal] = mapped_column(db.Numeric(10, 2), nullable=False)
    upfront_payment_dkk: Mapped[Decimal] = mapped_column(db.Numeric(10, 2), nullable=False)  # What customer pays now
    remaining_payment_dkk: Mapped[Decimal] = mapped_column(db.Numeric(10, 2), nullable=False)  # What customer pays after return
    status: Mapped[BookingStatus] = mapped_column(db.Enum(BookingStatus), default=BookingStatus.PENDING, nullable=False)
    stripe_session_id: Mapped[Optional[str]] = mapped_column(db.String(200), index=True)
    stripe_payment_intent_id: Mapped[Optional[str]] = mapped_column(db.String(200), index=True)
    remaining_payment_session_id: Mapped[Optional[str]] = mapped_column(db.String(200), index=True)  # For final payment
    remaining_payment_intent_id: Mapped[Optional[str]] = mapped_column(db.String(200), index=True)  # For final payment
    deposit_refunded: Mapped[bool] = mapped_column(db.Boolean, default=False, nullable=False)  # Whether deposit was refunded
    return_condition: Mapped[Optional[str]] = mapped_column(db.String(50))  # 'good', 'damaged', 'lost'
    damage_fee_dkk: Mapped[Decimal] = mapped_column(db.Numeric(10, 2), default=0, nullable=False)  # Damage charges
    delivery_type: Mapped[str] = mapped_column(db.String(20), default='pickup', nullable=False)  # 'pickup' or 'delivery'
    notes: Mapped[Optional[str]] = mapped_column(db.Text)
    internal_notes: Mapped[Optional[str]] = mapped_column(db.Text)
    account_number: Mapped[Optional[str]] = mapped_column(db.String(20))
    registration_number: Mapped[Optional[str]] = mapped_column(db.String(10))
    is_deleted: Mapped[bool] = mapped_column(db.Boolean, default=False, nullable=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(db.DateTime, nullable=True)
    deleted_by: Mapped[Optional[int]] = mapped_column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    deletion_reason: Mapped[Optional[str]] = mapped_column(db.Text)
    created_at: Mapped[datetime] = mapped_column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Constraints
    __table_args__ = (
        CheckConstraint('end_date >= start_date', name='check_booking_end_after_start'),
        CheckConstraint('subtotal_dkk >= 0', name='check_subtotal_positive'),
        CheckConstraint('vat_dkk >= 0', name='check_vat_positive'),
        CheckConstraint('deposit_dkk >= 0', name='check_deposit_positive'),
        CheckConstraint('delivery_fee_dkk >= 0', name='check_delivery_fee_positive'),
        CheckConstraint('total_dkk >= 0', name='check_total_positive'),
        Index('idx_bookings_dates', 'start_date', 'end_date'),
        Index('idx_bookings_status', 'status'),
    )
    
    # Relationships
    customer: Mapped[Optional["Customer"]] = relationship("Customer", back_populates="bookings")
    items: Mapped[List["BookingItem"]] = relationship("BookingItem", back_populates="booking", cascade="all, delete-orphan")
    deleted_by_user: Mapped[Optional["User"]] = relationship("User", foreign_keys=[deleted_by])
    
    def __repr__(self) -> str:
        return f'<Booking {self.booking_no}>'


class BookingItem(db.Model):
    """Booking item model for individual products in a booking."""
    __tablename__ = 'booking_items'
    
    id: Mapped[int] = mapped_column(db.Integer, primary_key=True)
    booking_id: Mapped[int] = mapped_column(db.Integer, db.ForeignKey('bookings.id'), nullable=False)
    product_id: Mapped[int] = mapped_column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    quantity: Mapped[int] = mapped_column(db.Integer, nullable=False)
    unit_price_dkk: Mapped[Decimal] = mapped_column(db.Numeric(10, 2), nullable=False)
    name_snapshot: Mapped[str] = mapped_column(db.String(200), nullable=False)
    created_at: Mapped[datetime] = mapped_column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    # Constraints
    __table_args__ = (
        CheckConstraint('quantity > 0', name='check_quantity_positive'),
        CheckConstraint('unit_price_dkk >= 0', name='check_unit_price_positive'),
    )
    
    # Relationships
    booking: Mapped["Booking"] = relationship("Booking", back_populates="items")
    product: Mapped["Product"] = relationship("Product", back_populates="booking_items")
    upsell_items: Mapped[List["BookingUpsellItem"]] = relationship("BookingUpsellItem", back_populates="booking_item", cascade="all, delete-orphan")
    
    def __repr__(self) -> str:
        return f'<BookingItem {self.name_snapshot} x{self.quantity}>'


class BookingUpsellItem(db.Model):
    """Booking upsell item model for add-on products in a booking."""
    __tablename__ = 'booking_upsell_items'
    
    id: Mapped[int] = mapped_column(db.Integer, primary_key=True)
    booking_item_id: Mapped[int] = mapped_column(db.Integer, db.ForeignKey('booking_items.id'), nullable=False, index=True)
    upsell_product_id: Mapped[int] = mapped_column(db.Integer, db.ForeignKey('upsell_products.id'), nullable=False, index=True)
    quantity: Mapped[int] = mapped_column(db.Integer, nullable=False, default=1)
    unit_price_dkk: Mapped[Decimal] = mapped_column(db.Numeric(10, 2), nullable=False, default=0)
    name_snapshot: Mapped[str] = mapped_column(db.String(200), nullable=False)  # Upsell product name at time of booking
    created_at: Mapped[datetime] = mapped_column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    # Constraints
    __table_args__ = (
        CheckConstraint('quantity > 0', name='check_booking_upsell_quantity_positive'),
        CheckConstraint('unit_price_dkk >= 0', name='check_booking_upsell_price_positive'),
    )
    
    # Relationships
    booking_item: Mapped["BookingItem"] = relationship("BookingItem", back_populates="upsell_items")
    upsell_product: Mapped["UpsellProduct"] = relationship("UpsellProduct")
    
    def __repr__(self) -> str:
        return f'<BookingUpsellItem {self.name_snapshot} x{self.quantity}>'


class CompanyLocation(db.Model):
    """Company location for distance calculations."""
    __tablename__ = 'company_locations'
    
    id: Mapped[int] = mapped_column(db.Integer, primary_key=True)
    name: Mapped[str] = mapped_column(db.String(200), nullable=False)
    address: Mapped[str] = mapped_column(db.String(300), nullable=False)
    zip_code: Mapped[str] = mapped_column(db.String(10), nullable=False)
    city: Mapped[str] = mapped_column(db.String(100), nullable=False)
    latitude: Mapped[Optional[float]] = mapped_column(db.Float)
    longitude: Mapped[Optional[float]] = mapped_column(db.Float)
    is_primary: Mapped[bool] = mapped_column(db.Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(db.Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    def __repr__(self) -> str:
        return f'<CompanyLocation {self.name}>'


class DeliverySetting(db.Model):
    """Delivery settings model."""
    __tablename__ = 'delivery_settings'
    
    id: Mapped[int] = mapped_column(db.Integer, primary_key=True)
    type: Mapped[DeliveryType] = mapped_column(db.Enum(DeliveryType), nullable=False)
    base_fee_dkk: Mapped[Decimal] = mapped_column(db.Numeric(10, 2), nullable=False)
    per_km_fee_dkk: Mapped[Decimal] = mapped_column(db.Numeric(10, 2), nullable=False)
    free_delivery_km: Mapped[int] = mapped_column(db.Integer, default=0, nullable=False)  # Free delivery within X km
    max_delivery_km: Mapped[Optional[int]] = mapped_column(db.Integer)  # Maximum delivery distance
    notes: Mapped[Optional[str]] = mapped_column(db.Text)
    is_active: Mapped[bool] = mapped_column(db.Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Constraints
    __table_args__ = (
        CheckConstraint('base_fee_dkk >= 0', name='check_base_fee_positive'),
        CheckConstraint('per_km_fee_dkk >= 0', name='check_per_km_fee_positive'),
        CheckConstraint('free_delivery_km >= 0', name='check_free_delivery_km_positive'),
    )
    
    def __repr__(self) -> str:
        return f'<DeliverySetting {self.type}>'


class CMSBlock(db.Model):
    """CMS block model for dynamic content."""
    __tablename__ = 'cms_blocks'
    
    id: Mapped[int] = mapped_column(db.Integer, primary_key=True)
    key: Mapped[str] = mapped_column(db.String(100), unique=True, nullable=False, index=True)
    title: Mapped[str] = mapped_column(db.String(200), nullable=False)
    content_md: Mapped[str] = mapped_column(db.Text, nullable=False)
    is_active: Mapped[bool] = mapped_column(db.Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    def __repr__(self) -> str:
        return f'<CMSBlock {self.key}>'

