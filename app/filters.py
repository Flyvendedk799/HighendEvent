"""Template filters for the application."""

from datetime import datetime, date
from decimal import Decimal
from typing import Any, Optional


def register_filters(app):
    """Register template filters with the Flask app."""
    
    @app.template_filter('image_url')
    def image_url_filter(image_path: str) -> str:
        """Generate full URL for product images."""
        if not image_path:
            return '/static/images/placeholder-product.jpg'
        
        # If it's already a full URL, return as is
        if image_path.startswith(('http://', 'https://')):
            return image_path
        
        # If it's a relative path, prepend static URL
        if image_path.startswith('uploads/'):
            return f'/static/{image_path}'
        
        # Default case
        return f'/static/{image_path}'
    
    @app.template_filter('currency')
    def currency_filter(value: Any, currency: str = 'DKK') -> str:
        """Format value as currency."""
        if value is None:
            return f"0,00 {currency}"
        
        try:
            # Convert to Decimal for precise formatting
            if isinstance(value, (int, float, str)):
                value = Decimal(str(value))
            
            # Format with Danish locale (comma as decimal separator)
            formatted = f"{value:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')
            return f"{formatted} {currency}"
        except (ValueError, TypeError):
            return f"0,00 {currency}"
    
    @app.template_filter('date_format')
    def date_format_filter(value: Any, format_str: str = '%d/%m/%Y') -> str:
        """Format date with Danish locale."""
        if value is None:
            return ""
        
        if isinstance(value, str):
            try:
                # Try to parse common date formats
                for fmt in ['%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y']:
                    try:
                        value = datetime.strptime(value, fmt).date()
                        break
                    except ValueError:
                        continue
            except ValueError:
                return str(value)
        
        if isinstance(value, (datetime, date)):
            return value.strftime(format_str)
        
        return str(value)
    
    @app.template_filter('datetime_format')
    def datetime_format_filter(value: Any, format_str: str = '%d/%m/%Y %H:%M') -> str:
        """Format datetime with Danish locale."""
        if value is None:
            return ""
        
        if isinstance(value, str):
            try:
                # Try to parse common datetime formats
                for fmt in ['%Y-%m-%d %H:%M:%S', '%Y-%m-%dT%H:%M:%S', '%d/%m/%Y %H:%M']:
                    try:
                        value = datetime.strptime(value, fmt)
                        break
                    except ValueError:
                        continue
            except ValueError:
                return str(value)
        
        if isinstance(value, datetime):
            return value.strftime(format_str)
        elif isinstance(value, date):
            return value.strftime('%d/%m/%Y')
        
        return str(value)
    
    @app.template_filter('pluralize')
    def pluralize_filter(value: int, singular: str, plural: str = None) -> str:
        """Pluralize Danish words based on count."""
        if plural is None:
            plural = singular + 'er'
        
        if value == 1:
            return f"{value} {singular}"
        else:
            return f"{value} {plural}"
    
    @app.template_filter('status_badge_class')
    def status_badge_class_filter(status: str) -> str:
        """Get CSS class for status badge."""
        status_classes = {
            'pending': 'bg-yellow-100 text-yellow-800',
            'paid': 'bg-green-100 text-green-800',
            'fulfilled': 'bg-blue-100 text-blue-800',
            'cancelled': 'bg-red-100 text-red-800',
            'active': 'bg-green-100 text-green-800',
            'inactive': 'bg-gray-100 text-gray-800',
        }
        return status_classes.get(status.lower(), 'bg-gray-100 text-gray-800')
    
    @app.template_filter('status_text')
    def status_text_filter(status: str) -> str:
        """Get Danish text for status."""
        status_texts = {
            'pending': 'Afventer',
            'paid': 'Betalt',
            'fulfilled': 'Fuldført',
            'cancelled': 'Annulleret',
            'active': 'Aktiv',
            'inactive': 'Inaktiv',
        }
        return status_texts.get(status.lower(), status)
    
    @app.template_filter('truncate')
    def truncate_filter(value: str, length: int = 100, suffix: str = '...') -> str:
        """Truncate text to specified length."""
        if not value or len(value) <= length:
            return value
        return value[:length].rsplit(' ', 1)[0] + suffix
