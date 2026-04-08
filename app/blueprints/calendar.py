"""Calendar ICS feed for Outlook integration."""

from flask import Blueprint, Response, jsonify
from datetime import datetime, timedelta
from app.models import Booking, BookingStatus
from app import db
import icalendar
from icalendar import Calendar, Event
import pytz

bp = Blueprint('calendar', __name__)

@bp.route('/calendar/feed.ics')
def calendar_feed():
    """Generate ICS calendar feed for Outlook integration."""
    try:
        # Get all confirmed bookings (deposit paid or fully paid)
        bookings = Booking.query.filter(
            Booking.status.in_([BookingStatus.DEPOSIT_PAID, BookingStatus.FULLY_PAID, BookingStatus.OUT_FOR_DELIVERY, BookingStatus.RETURNED_GOOD]),
            Booking.is_deleted == False
        ).all()
        
        # Create calendar
        cal = Calendar()
        cal.add('prodid', '-//HighendEvent//Rental Calendar//EN')
        cal.add('version', '2.0')
        cal.add('calscale', 'GREGORIAN')
        cal.add('method', 'PUBLISH')
        cal.add('x-wr-calname', 'HighendEvent Bookings')
        cal.add('x-wr-caldesc', 'Rental equipment bookings and deliveries')
        cal.add('x-wr-timezone', 'Europe/Copenhagen')
        
        # Add timezone
        tz = pytz.timezone('Europe/Copenhagen')
        
        for booking in bookings:
            # Create event for each booking
            event = Event()
            
            # Event details
            event.add('uid', f'highendevent-booking-{booking.id}@highendevent.dk')
            product_name = booking.items[0].name_snapshot if booking.items else "Rental"
            # ASCII summary: emoji/non-ASCII titles break some Outlook calendar imports
            event.add('summary', f'{product_name} - {booking.customer_name}')
            event.add('description', _generate_event_description(booking))
            event.add('location', f'{booking.address}, {booking.zip_code} {booking.city}' if booking.address else 'Pickup Location')
            event.add('status', 'CONFIRMED')
            event.add('transp', 'OPAQUE')
            
            # Set start and end times
            start_dt = datetime.combine(booking.start_date, datetime.min.time())
            end_dt = datetime.combine(booking.end_date, datetime.max.time())
            
            # Convert to Copenhagen timezone
            start_dt = tz.localize(start_dt)
            end_dt = tz.localize(end_dt)
            
            event.add('dtstart', start_dt)
            event.add('dtend', end_dt)
            event.add('dtstamp', datetime.now(tz))
            
            # Add creation and modification times
            created_at = booking.created_at
            if created_at.tzinfo is None:
                created_at = tz.localize(created_at)
            event.add('created', created_at)
            
            updated_at = booking.updated_at if booking.updated_at else booking.created_at
            if updated_at.tzinfo is None:
                updated_at = tz.localize(updated_at)
            event.add('last-modified', updated_at)
            
            # Omit ORGANIZER/ATTENDEE: METHOD:PUBLISH feeds with these often surface as
            # broken imports or unwanted meeting semantics in Outlook.

            # Add categories
            event.add('categories', ['Rental', 'Equipment', 'HighendEvent'])
            
            # Add priority (high for urgent bookings)
            if booking.delivery_type == 'delivery':
                event.add('priority', 5)  # High priority for deliveries
            else:
                event.add('priority', 3)  # Normal priority for pickups
            
            # Add alarm (reminder 1 day before)
            alarm = icalendar.Alarm()
            alarm.add('action', 'DISPLAY')
            alarm.add('description', f'Reminder: {booking.items[0].name_snapshot if booking.items else "Rental"} due tomorrow')
            alarm.add('trigger', timedelta(days=-1))
            event.add_component(alarm)
            
            # Add booking status as custom property
            event.add('x-booking-status', booking.status.value)
            event.add('x-booking-id', str(booking.id))
            event.add('x-total-amount', str(booking.total_dkk))
            
            cal.add_component(event)
        
        # Raw UTF-8 bytes; avoid Content-Disposition: attachment so "subscribe by URL"
        # clients (Outlook, Google) treat this as a calendar stream, not a one-off download.
        return Response(
            cal.to_ical(),
            mimetype='text/calendar; charset=utf-8',
            headers={
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
            },
        )
        
    except Exception as e:
        print(f"Error generating calendar feed: {e}")
        import traceback
        traceback.print_exc()
        return Response(
            "Error generating calendar feed",
            status=500,
            mimetype='text/plain'
        )

def _generate_event_description(booking):
    """Generate detailed event description."""
    description_parts = [
        f"Customer: {booking.customer_name}",
        f"Email: {booking.email}",
        f"Phone: {booking.phone}",
        f"Booking ID: #{booking.id}",
        f"Status: {_get_status_display(booking.status)}",
        f"Total Amount: {booking.total_dkk} DKK",
        f"Delivery Type: {'Delivery' if booking.delivery_type == 'delivery' else 'Pickup'}"
    ]
    
    if booking.items:
        description_parts.append("\nItems:")
        for item in booking.items:
            description_parts.append(f"• {item.name_snapshot} (Qty: {item.quantity})")
    
    if booking.notes:
        description_parts.append(f"\nNotes: {booking.notes}")
    
    return "\n".join(description_parts)

def _get_status_display(status):
    """Get human-readable status display."""
    status_map = {
        BookingStatus.DEPOSIT_PAID: "Deposit Paid",
        BookingStatus.FULLY_PAID: "Fully Paid", 
        BookingStatus.OUT_FOR_DELIVERY: "Out for Delivery",
        BookingStatus.RETURNED_GOOD: "Returned (Good)",
        BookingStatus.RETURNED_DAMAGED: "Returned (Damaged)",
        BookingStatus.CANCELLED: "Cancelled"
    }
    return status_map.get(status, status.value)

@bp.route('/calendar/status')
def calendar_status():
    """Get calendar feed status and statistics."""
    try:
        # Count bookings by status
        total_bookings = Booking.query.filter(Booking.is_deleted == False).count()
        confirmed_bookings = Booking.query.filter(
            Booking.status.in_([BookingStatus.DEPOSIT_PAID, BookingStatus.FULLY_PAID, BookingStatus.OUT_FOR_DELIVERY, BookingStatus.RETURNED_GOOD]),
            Booking.is_deleted == False
        ).count()
        
        # Get upcoming bookings
        upcoming_bookings = Booking.query.filter(
            Booking.status.in_([BookingStatus.DEPOSIT_PAID, BookingStatus.FULLY_PAID, BookingStatus.OUT_FOR_DELIVERY]),
            Booking.is_deleted == False,
            Booking.start_date >= datetime.now().date()
        ).order_by(Booking.start_date).limit(5).all()
        
        upcoming = []
        for booking in upcoming_bookings:
            upcoming.append({
                'id': booking.id,
                'customer_name': booking.customer_name,
                'start_date': booking.start_date.isoformat(),
                'end_date': booking.end_date.isoformat(),
                'status': booking.status.value,
                'product_name': booking.items[0].name_snapshot if booking.items else 'Unknown'
            })
        
        return jsonify({
            'status': 'active',
            'total_bookings': total_bookings,
            'confirmed_bookings': confirmed_bookings,
            'feed_url': '/calendar/feed.ics',
            'last_updated': datetime.now().isoformat(),
            'upcoming_bookings': upcoming
        })
        
    except Exception as e:
        print(f"Error getting calendar status: {e}")
        return jsonify({'error': 'Failed to get calendar status'}), 500
