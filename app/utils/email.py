"""Email utilities for sending notifications."""

from flask import render_template, current_app
from flask_mail import Message

from app.models import Booking


def send_booking_confirmation(booking: Booking):
    """Send booking confirmation email to customer."""
    try:
        msg = Message(
            subject=f'Booking bekræftelse - {booking.booking_no}',
            recipients=[booking.email],
            sender=current_app.config['MAIL_DEFAULT_SENDER']
        )
        
        msg.html = render_template('emails/booking_confirmation.html', booking=booking)
        msg.body = render_template('emails/booking_confirmation.txt', booking=booking)
        
        from app import mail
        mail.send(msg)
        
        current_app.logger.info(f'Booking confirmation sent to {booking.email}')
        
    except Exception as e:
        current_app.logger.error(f'Error sending booking confirmation: {str(e)}')


def send_booking_notification_admin(booking: Booking):
    """Send new booking notification to admin."""
    try:
        admin_emails = current_app.config.get('ADMIN_EMAILS', [])
        if not admin_emails:
            return
        
        msg = Message(
            subject=f'Ny booking - {booking.booking_no}',
            recipients=admin_emails,
            sender=current_app.config['MAIL_DEFAULT_SENDER']
        )
        
        msg.html = render_template('emails/admin_booking_notification.html', booking=booking)
        msg.body = render_template('emails/admin_booking_notification.txt', booking=booking)
        
        from app import mail
        mail.send(msg)
        
        current_app.logger.info(f'Admin notification sent for booking {booking.booking_no}')
        
    except Exception as e:
        current_app.logger.error(f'Error sending admin notification: {str(e)}')


def send_booking_status_update(booking: Booking, old_status: str):
    """Send booking status update email to customer."""
    try:
        msg = Message(
            subject=f'Booking status opdateret - {booking.booking_no}',
            recipients=[booking.email],
            sender=current_app.config['MAIL_DEFAULT_SENDER']
        )
        
        msg.html = render_template('emails/booking_status_update.html', 
                                 booking=booking, old_status=old_status)
        msg.body = render_template('emails/booking_status_update.txt', 
                                 booking=booking, old_status=old_status)
        
        from app import mail
        mail.send(msg)
        
        current_app.logger.info(f'Status update sent to {booking.email}')
        
    except Exception as e:
        current_app.logger.error(f'Error sending status update: {str(e)}')

