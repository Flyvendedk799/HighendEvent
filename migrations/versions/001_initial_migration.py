"""Initial migration

Revision ID: 001
Revises: 
Create Date: 2024-12-01 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Create users table
    op.create_table('users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(length=120), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('role', sa.Enum('admin', 'staff', name='userrole'), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=False)

    # Create categories table
    op.create_table('categories',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('slug', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('sort_order', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('slug')
    )
    op.create_index(op.f('ix_categories_slug'), 'categories', ['slug'], unique=False)

    # Create products table
    op.create_table('products',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('category_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('slug', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('daily_price_dkk', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('weekend_price_dkk', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('deposit_dkk', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('stock_qty', sa.Integer(), nullable=False),
        sa.Column('prep_buffer_days', sa.Integer(), nullable=False),
        sa.Column('cleanup_buffer_days', sa.Integer(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('hero_image_url', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.CheckConstraint('cleanup_buffer_days >= 0', name='check_cleanup_buffer_positive'),
        sa.CheckConstraint('daily_price_dkk >= 0', name='check_daily_price_positive'),
        sa.CheckConstraint('deposit_dkk >= 0', name='check_deposit_positive'),
        sa.CheckConstraint('prep_buffer_days >= 0', name='check_prep_buffer_positive'),
        sa.CheckConstraint('stock_qty > 0', name='check_stock_positive'),
        sa.CheckConstraint('weekend_price_dkk >= 0', name='check_weekend_price_positive'),
        sa.ForeignKeyConstraint(['category_id'], ['categories.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('slug')
    )
    op.create_index(op.f('ix_products_slug'), 'products', ['slug'], unique=False)

    # Create product_images table
    op.create_table('product_images',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column('url', sa.String(length=500), nullable=False),
        sa.Column('alt', sa.String(length=200), nullable=False),
        sa.Column('sort_order', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create pricing_rules table
    op.create_table('pricing_rules',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column('rule_type', sa.Enum('WEEKEND', 'SEASON', 'CUSTOM', name='pricingruletype'), nullable=False),
        sa.Column('value_json', sa.JSON(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create blackout_dates table
    op.create_table('blackout_dates',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=False),
        sa.Column('reason', sa.String(length=200), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.CheckConstraint('end_date >= start_date', name='check_end_after_start'),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_blackout_dates_product_dates', 'blackout_dates', ['product_id', 'start_date', 'end_date'], unique=False)

    # Create bookings table
    op.create_table('bookings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('booking_no', sa.String(length=20), nullable=False),
        sa.Column('customer_name', sa.String(length=200), nullable=False),
        sa.Column('email', sa.String(length=200), nullable=False),
        sa.Column('phone', sa.String(length=20), nullable=False),
        sa.Column('address', sa.String(length=300), nullable=False),
        sa.Column('zip_code', sa.String(length=10), nullable=False),
        sa.Column('city', sa.String(length=100), nullable=False),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=False),
        sa.Column('subtotal_dkk', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('vat_dkk', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('deposit_dkk', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('delivery_fee_dkk', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('total_dkk', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('status', sa.Enum('PENDING', 'PAID', 'FULFILLED', 'CANCELLED', name='bookingstatus'), nullable=False),
        sa.Column('stripe_session_id', sa.String(length=200), nullable=True),
        sa.Column('stripe_payment_intent_id', sa.String(length=200), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('internal_notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.CheckConstraint('delivery_fee_dkk >= 0', name='check_delivery_fee_positive'),
        sa.CheckConstraint('deposit_dkk >= 0', name='check_deposit_positive'),
        sa.CheckConstraint('end_date >= start_date', name='check_booking_end_after_start'),
        sa.CheckConstraint('subtotal_dkk >= 0', name='check_subtotal_positive'),
        sa.CheckConstraint('total_dkk >= 0', name='check_total_positive'),
        sa.CheckConstraint('vat_dkk >= 0', name='check_vat_positive'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('booking_no')
    )
    op.create_index('idx_bookings_dates', 'bookings', ['start_date', 'end_date'], unique=False)
    op.create_index('idx_bookings_status', 'bookings', ['status'], unique=False)
    op.create_index(op.f('ix_bookings_email'), 'bookings', ['email'], unique=False)
    op.create_index(op.f('ix_bookings_booking_no'), 'bookings', ['booking_no'], unique=False)
    op.create_index(op.f('ix_bookings_stripe_session_id'), 'bookings', ['stripe_session_id'], unique=False)

    # Create booking_items table
    op.create_table('booking_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('booking_id', sa.Integer(), nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False),
        sa.Column('unit_price_dkk', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('name_snapshot', sa.String(length=200), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.CheckConstraint('quantity > 0', name='check_quantity_positive'),
        sa.CheckConstraint('unit_price_dkk >= 0', name='check_unit_price_positive'),
        sa.ForeignKeyConstraint(['booking_id'], ['bookings.id'], ),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create delivery_settings table
    op.create_table('delivery_settings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('type', sa.Enum('PICKUP', 'DELIVERY', name='deliverytype'), nullable=False),
        sa.Column('base_fee_dkk', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('per_km_fee_dkk', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.CheckConstraint('base_fee_dkk >= 0', name='check_base_fee_positive'),
        sa.CheckConstraint('per_km_fee_dkk >= 0', name='check_per_km_fee_positive'),
        sa.PrimaryKeyConstraint('id')
    )

    # Create cms_blocks table
    op.create_table('cms_blocks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('key', sa.String(length=100), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('content_md', sa.Text(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('key')
    )
    op.create_index(op.f('ix_cms_blocks_key'), 'cms_blocks', ['key'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_cms_blocks_key'), table_name='cms_blocks')
    op.drop_table('cms_blocks')
    op.drop_table('delivery_settings')
    op.drop_table('booking_items')
    op.drop_index(op.f('ix_bookings_stripe_session_id'), table_name='bookings')
    op.drop_index(op.f('ix_bookings_booking_no'), table_name='bookings')
    op.drop_index(op.f('ix_bookings_email'), table_name='bookings')
    op.drop_index('idx_bookings_status', table_name='bookings')
    op.drop_index('idx_bookings_dates', table_name='bookings')
    op.drop_table('bookings')
    op.drop_index('idx_blackout_dates_product_dates', table_name='blackout_dates')
    op.drop_table('blackout_dates')
    op.drop_table('pricing_rules')
    op.drop_table('product_images')
    op.drop_index(op.f('ix_products_slug'), table_name='products')
    op.drop_table('products')
    op.drop_index(op.f('ix_categories_slug'), table_name='categories')
    op.drop_table('categories')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')



