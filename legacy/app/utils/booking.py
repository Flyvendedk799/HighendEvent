"""Booking utility functions."""

import random
import string
from datetime import datetime


def generate_booking_number() -> str:
    """Generate a unique booking number."""
    # Format: YYYYMMDD-XXXX
    date_part = datetime.now().strftime('%Y%m%d')
    random_part = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return f"{date_part}-{random_part}"


def format_booking_period(start_date, end_date) -> str:
    """Format booking period for display."""
    if start_date == end_date:
        return start_date.strftime('%d/%m/%Y')
    else:
        return f"{start_date.strftime('%d/%m/%Y')} - {end_date.strftime('%d/%m/%Y')}"


def calculate_rental_days(start_date, end_date) -> int:
    """Calculate number of rental days (inclusive)."""
    return (end_date - start_date).days + 1

