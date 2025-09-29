"""Pricing service for calculating rental costs."""

from datetime import date, timedelta
from decimal import Decimal
from typing import Dict, List, Optional, Any
from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.models import Product, PricingRule, PricingRuleType, DeliverySetting, DeliveryType


@dataclass
class PricingLineItem:
    """Individual line item in pricing calculation."""
    name: str
    quantity: int
    unit_price: Decimal
    total_price: Decimal
    description: Optional[str] = None


@dataclass
class PricingBreakdown:
    """Complete pricing breakdown for a booking."""
    line_items: List[PricingLineItem]
    subtotal: Decimal
    vat_amount: Decimal
    vat_percent: Decimal
    deposit_amount: Decimal
    delivery_fee: Decimal
    total: Decimal
    upfront_payment: Decimal  # What customer pays now (deposit + delivery)
    remaining_payment: Decimal  # What customer pays after return (rental amount)
    currency: str = "DKK"


@dataclass
class BookingItemDTO:
    """Data transfer object for booking item pricing."""
    product_id: int
    product_name: str
    quantity: int
    start_date: date
    end_date: date
    delivery_type: DeliveryType = DeliveryType.PICKUP


class PricingService:
    """Service for calculating rental pricing."""
    
    def __init__(self, db_session: Session, vat_percent: Decimal = Decimal('0')):
        """Initialize with database session. VAT is included in prices."""
        self.db = db_session
        self.vat_percent = vat_percent
    
    def calculate_booking_pricing(
        self, 
        booking_items: List[BookingItemDTO],
        delivery_type: DeliveryType = DeliveryType.PICKUP
    ) -> PricingBreakdown:
        """
        Calculate complete pricing for a booking.
        
        Args:
            booking_items: List of items to price
            delivery_type: Type of delivery (pickup or delivery)
            
        Returns:
            Complete pricing breakdown
        """
        line_items = []
        subtotal = Decimal('0')
        deposit_amount = Decimal('0')
        
        # Process each booking item
        for item in booking_items:
            item_pricing = self._calculate_item_pricing(item)
            line_items.extend(item_pricing.line_items)
            subtotal += item_pricing.subtotal
            deposit_amount += item_pricing.deposit_amount
        
        # Calculate delivery fee
        delivery_fee = self._calculate_delivery_fee(delivery_type)
        if delivery_fee > 0:
            line_items.append(PricingLineItem(
                name="Levering",
                quantity=1,
                unit_price=delivery_fee,
                total_price=delivery_fee,
                description="Leveringsgebyr"
            ))
        
        # No VAT calculations - all prices include VAT already
        vat_amount = Decimal('0')
        
        # Calculate total - subtotal + delivery fee + deposit (everything customer pays)
        total = subtotal + delivery_fee + deposit_amount
        
        # Debug final calculation
        print(f"💰 FINAL PRICING BREAKDOWN:")
        print(f"   📊 Subtotal: {subtotal} DKK")
        print(f"   📊 VAT ({self.vat_percent}%): {vat_amount} DKK")
        print(f"   📊 Delivery fee: {delivery_fee} DKK") 
        print(f"   📊 Deposit: {deposit_amount} DKK")
        print(f"   💰 TOTAL: {total} DKK")
        
        # Calculate upfront payment (deposit + delivery fee)
        upfront_payment = deposit_amount + delivery_fee
        
        # Calculate remaining payment (rental amount only)
        remaining_payment = subtotal

        return PricingBreakdown(
            line_items=line_items,
            subtotal=subtotal,
            vat_amount=vat_amount,
            vat_percent=self.vat_percent,
            deposit_amount=deposit_amount,
            delivery_fee=delivery_fee,
            total=total,  # Full total for reference
            upfront_payment=upfront_payment,  # What customer pays now
            remaining_payment=remaining_payment  # What customer pays after return
        )
    
    def _calculate_item_pricing(self, item: BookingItemDTO) -> 'ItemPricing':
        """Calculate pricing for a single booking item."""
        # Get product details
        product = self.db.query(Product).filter(
            Product.id == item.product_id,
            Product.is_active == True
        ).first()
        
        if not product:
            raise ValueError(f"Product {item.product_id} not found or inactive")
        
        # Calculate rental days
        rental_days = (item.end_date - item.start_date).days + 1
        
        # Calculate base price using daily/weekend pricing
        daily_price = self._get_effective_daily_price(product, item.start_date, item.end_date)
        base_price = daily_price * rental_days
        
        # Debug logging
        print(f"🔍 PRICING DEBUG: {item.product_name}")
        print(f"   📅 Date range: {item.start_date} to {item.end_date} ({rental_days} days)")
        print(f"   💰 Daily price: {daily_price} DKK")
        print(f"   💰 Base price: {base_price} DKK")
        print(f"   📊 Product daily_price_dkk: {product.daily_price_dkk}")
        print(f"   📊 Product weekend_price_dkk: {product.weekend_price_dkk}")
        
        # Apply quantity
        total_price = base_price * item.quantity
        
        # Calculate deposit
        deposit_amount = Decimal('0')
        if product.deposit_dkk:
            deposit_amount = product.deposit_dkk * item.quantity
        
        # Create line items
        line_items = [
            PricingLineItem(
                name=item.product_name,
                quantity=item.quantity,
                unit_price=daily_price,  # Daily price, not total price
                total_price=total_price,
                description=f"{rental_days} dage @ {daily_price} DKK/dag"
            )
        ]
        
        # Don't include deposit in price display - it's handled separately
        # if deposit_amount > 0:
        #     line_items.append(PricingLineItem(
        #         name=f"Depositum - {item.product_name}",
        #         quantity=item.quantity,
        #         unit_price=product.deposit_dkk,
        #         total_price=deposit_amount,
        #         description="Refunderbart depositum"
        #     ))
        
        return ItemPricing(
            line_items=line_items,
            subtotal=total_price,
            deposit_amount=deposit_amount
        )
    
    def _get_effective_daily_price(
        self, 
        product: Product, 
        start_date: date, 
        end_date: date
    ) -> Decimal:
        """Get effective daily price considering weekend pricing."""
        if not product.weekend_price_dkk:
            return product.daily_price_dkk
        
        # Weekend pricing only applies if the range is EXACTLY Saturday + Sunday
        total_days = (end_date - start_date).days + 1
        
        # Check if this is exactly a weekend rental (Saturday + Sunday only)
        if total_days == 2:
            # Check if it's Saturday and Sunday
            if (start_date.weekday() == 5 and end_date.weekday() == 6):  # Sat=5, Sun=6
                return product.weekend_price_dkk
        
        # For all other cases, use regular daily price
        return product.daily_price_dkk
    
    def _calculate_delivery_fee(self, delivery_type: DeliveryType) -> Decimal:
        """Calculate delivery fee based on delivery type."""
        if delivery_type == DeliveryType.PICKUP:
            return Decimal('0')
        
        # Get delivery settings
        delivery_setting = self.db.query(DeliverySetting).filter(
            DeliverySetting.type == delivery_type,
            DeliverySetting.is_active == True
        ).first()
        
        if not delivery_setting:
            return Decimal('0')
        
        # For now, just return base fee (distance calculation would go here)
        return delivery_setting.base_fee_dkk
    
    def get_price_estimate(
        self, 
        product_id: int, 
        start_date: date, 
        end_date: date,
        quantity: int = 1,
        delivery_type: DeliveryType = DeliveryType.PICKUP
    ) -> Dict[str, Any]:
        """
        Get price estimate for a product and date range.
        
        Args:
            product_id: ID of the product
            start_date: Start date of rental
            end_date: End date of rental
            quantity: Quantity to rent
            delivery_type: Type of delivery
            
        Returns:
            Price estimate dictionary
        """
        # Get product
        product = self.db.query(Product).filter(
            Product.id == product_id,
            Product.is_active == True
        ).first()
        
        if not product:
            return {'error': 'Product not found'}
        
        # Create booking item DTO
        item = BookingItemDTO(
            product_id=product_id,
            product_name=product.name,
            quantity=quantity,
            start_date=start_date,
            end_date=end_date,
            delivery_type=delivery_type
        )
        
        # Calculate pricing
        pricing = self.calculate_booking_pricing([item], delivery_type)
        
        return {
            'subtotal': float(pricing.subtotal),
            'vat_amount': float(pricing.vat_amount),
            'vat_percent': float(pricing.vat_percent),
            'deposit_amount': float(pricing.deposit_amount),
            'delivery_fee': float(pricing.delivery_fee),
            'total': float(pricing.total),
            'currency': pricing.currency,
            'line_items': [
                {
                    'name': item.name,
                    'quantity': item.quantity,
                    'unit_price': float(item.unit_price),
                    'total_price': float(item.total_price),
                    'description': item.description
                }
                for item in pricing.line_items
            ]
        }


@dataclass
class ItemPricing:
    """Pricing breakdown for a single item."""
    line_items: List[PricingLineItem]
    subtotal: Decimal
    deposit_amount: Decimal

