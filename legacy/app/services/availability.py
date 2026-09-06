"""Availability service for checking product availability."""

from datetime import date, timedelta
from typing import List, Optional, Tuple
from decimal import Decimal

from sqlalchemy import and_, or_, func, case
from sqlalchemy.orm import Session

from app.models import Product, Booking, BookingItem, BlackoutDate, BookingStatus


class AvailabilityService:
    """Service for checking product availability."""
    
    def __init__(self, db_session: Session):
        """Initialize with database session."""
        self.db = db_session
    
    def available_quantity(
        self, 
        product_id: int, 
        start_date: date, 
        end_date: date,
        exclude_booking_id: Optional[int] = None
    ) -> int:
        """
        Calculate available quantity for a product in a date range.
        
        Args:
            product_id: ID of the product to check
            start_date: Start date of the requested period (inclusive)
            end_date: End date of the requested period (inclusive)
            exclude_booking_id: Booking ID to exclude from calculations (for updates)
            
        Returns:
            Available quantity (0 if fully booked or blacked out)
        """
        # Get product with stock quantity
        product = self.db.query(Product).filter(
            Product.id == product_id,
            Product.is_active == True
        ).first()
        
        if not product:
            return 0
        
        # Check for blackout dates that overlap with the requested period
        blackout_overlap = self.db.query(BlackoutDate).filter(
            BlackoutDate.product_id == product_id,
            or_(
                # Blackout period contains the requested period
                and_(
                    BlackoutDate.start_date <= start_date,
                    BlackoutDate.end_date >= end_date
                ),
                # Requested period contains the blackout period
                and_(
                    BlackoutDate.start_date >= start_date,
                    BlackoutDate.end_date <= end_date
                ),
                # Blackout period starts within the requested period
                and_(
                    BlackoutDate.start_date >= start_date,
                    BlackoutDate.start_date <= end_date
                ),
                # Blackout period ends within the requested period
                and_(
                    BlackoutDate.end_date >= start_date,
                    BlackoutDate.end_date <= end_date
                )
            )
        ).first()
        
        if blackout_overlap:
            return 0
        
        # Calculate effective start and end dates with buffer days
        effective_start = start_date - timedelta(days=product.prep_buffer_days)
        effective_end = end_date + timedelta(days=product.cleanup_buffer_days)
        
        # Calculate total booked quantity for the effective period
        booked_query = self.db.query(
            func.sum(BookingItem.quantity).label('total_booked')
        ).join(Booking).filter(
            BookingItem.product_id == product_id,
            Booking.status != BookingStatus.CANCELLED,
            Booking.is_deleted == False,  # Exclude deleted bookings
            # Booking period overlaps with effective period
            or_(
                # Booking starts within effective period
                and_(
                    Booking.start_date >= effective_start,
                    Booking.start_date <= effective_end
                ),
                # Booking ends within effective period
                and_(
                    Booking.end_date >= effective_start,
                    Booking.end_date <= effective_end
                ),
                # Booking contains the effective period
                and_(
                    Booking.start_date <= effective_start,
                    Booking.end_date >= effective_end
                )
            )
        )
        
        # Exclude specific booking if provided (for updates)
        if exclude_booking_id:
            booked_query = booked_query.filter(Booking.id != exclude_booking_id)
        
        result = booked_query.scalar()
        total_booked = result or 0
        
        # Return available quantity
        return max(0, product.stock_qty - total_booked)
    
    def is_available(
        self, 
        product_id: int, 
        start_date: date, 
        end_date: date,
        quantity: int = 1,
        exclude_booking_id: Optional[int] = None
    ) -> bool:
        """
        Check if a product is available for the requested quantity and dates.
        
        Args:
            product_id: ID of the product to check
            start_date: Start date of the requested period (inclusive)
            end_date: End date of the requested period (inclusive)
            quantity: Required quantity
            exclude_booking_id: Booking ID to exclude from calculations (for updates)
            
        Returns:
            True if available, False otherwise
        """
        available_qty = self.available_quantity(
            product_id, start_date, end_date, exclude_booking_id
        )
        return available_qty >= quantity
    
    def get_availability_calendar(
        self, 
        product_id: int, 
        start_date: date, 
        end_date: date
    ) -> List[dict]:
        """
        Get availability calendar data for a product in a date range.
        
        Args:
            product_id: ID of the product to check
            start_date: Start date of the calendar range
            end_date: End date of the calendar range
            
        Returns:
            List of availability data for each date
        """
        calendar_data = []
        current_date = start_date
        
        while current_date <= end_date:
            # Check availability for single day
            available_qty = self.available_quantity(
                product_id, current_date, current_date
            )
            
            # Check if date is blacked out
            is_blacked_out = self.db.query(BlackoutDate).filter(
                BlackoutDate.product_id == product_id,
                BlackoutDate.start_date <= current_date,
                BlackoutDate.end_date >= current_date
            ).first() is not None
            
            calendar_data.append({
                'date': current_date.isoformat(),
                'available_quantity': available_qty,
                'is_available': available_qty > 0 and not is_blacked_out,
                'is_blacked_out': is_blacked_out
            })
            
            current_date += timedelta(days=1)
        
        return calendar_data
    
    def get_conflicting_bookings(
        self, 
        product_id: int, 
        start_date: date, 
        end_date: date,
        exclude_booking_id: Optional[int] = None
    ) -> List[dict]:
        """
        Get conflicting bookings for a product in a date range.
        
        Args:
            product_id: ID of the product to check
            start_date: Start date of the requested period
            end_date: End date of the requested period
            exclude_booking_id: Booking ID to exclude from results
            
        Returns:
            List of conflicting booking information
        """
        # Get product for buffer calculation
        product = self.db.query(Product).filter(Product.id == product_id).first()
        if not product:
            return []
        
        # Calculate effective dates with buffer
        effective_start = start_date - timedelta(days=product.prep_buffer_days)
        effective_end = end_date + timedelta(days=product.cleanup_buffer_days)
        
        # Query conflicting bookings
        conflicts = self.db.query(
            Booking.id,
            Booking.booking_no,
            Booking.start_date,
            Booking.end_date,
            Booking.status,
            func.sum(BookingItem.quantity).label('total_quantity')
        ).join(BookingItem).filter(
            BookingItem.product_id == product_id,
            Booking.status != BookingStatus.CANCELLED,
            Booking.is_deleted == False,  # Exclude deleted bookings
            # Booking overlaps with effective period
            or_(
                and_(
                    Booking.start_date >= effective_start,
                    Booking.start_date <= effective_end
                ),
                and_(
                    Booking.end_date >= effective_start,
                    Booking.end_date <= effective_end
                ),
                and_(
                    Booking.start_date <= effective_start,
                    Booking.end_date >= effective_end
                )
            )
        ).group_by(
            Booking.id, Booking.booking_no, Booking.start_date, 
            Booking.end_date, Booking.status
        )
        
        # Exclude specific booking if provided
        if exclude_booking_id:
            conflicts = conflicts.filter(Booking.id != exclude_booking_id)
        
        return [
            {
                'booking_id': conflict.id,
                'booking_no': conflict.booking_no,
                'start_date': conflict.start_date,
                'end_date': conflict.end_date,
                'status': conflict.status,
                'quantity': conflict.total_quantity
            }
            for conflict in conflicts.all()
        ]

