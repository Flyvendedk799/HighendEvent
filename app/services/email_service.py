"""Email service for sending various types of emails."""

from flask import current_app, render_template
from flask_mail import Message, Mail
from typing import List, Optional
import logging

logger = logging.getLogger(__name__)

class EmailService:
    """Service for sending emails."""
    
    def __init__(self, app=None):
        self.mail = None
        if app:
            self.init_app(app)
    
    def init_app(self, app):
        """Initialize email service with Flask app."""
        self.mail = Mail(app)
    
    def send_email(self, to: str, subject: str, template: str, **kwargs) -> bool:
        """Send a single email."""
        try:
            # Check if email is configured
            if not current_app.config.get('MAIL_SERVER'):
                logger.warning("Email not configured - skipping email send")
                return False
            
            # Use the Flask-Mail instance from the app context
            from flask_mail import Message
            mail = current_app.extensions['mail']
            
            # Try to render template, fallback to simple HTML if it fails
            try:
                html_content = render_template(template, **kwargs)
            except Exception as template_error:
                logger.warning(f"Template rendering failed: {template_error}, using fallback")
                # Create a simple fallback HTML
                html_content = f"""
                <html>
                <body>
                    <h2>{subject}</h2>
                    <p>Hej {kwargs.get('customer_name', 'Kunde')},</p>
                    <p>{kwargs.get('message', 'Dette er en besked om din booking.')}</p>
                    <p>Booking nummer: {kwargs.get('booking', {}).booking_no if hasattr(kwargs.get('booking'), 'booking_no') else 'N/A'}</p>
                    <p>Med venlig hilsen,<br>HighendEvent Team</p>
                </body>
                </html>
                """
                
            msg = Message(
                subject=subject,
                recipients=[to],
                html=html_content,
                sender=current_app.config.get('MAIL_DEFAULT_SENDER', 'HighendEvent <noreply@highendevent.dk>')
            )
            mail.send(msg)
            logger.info(f"Email sent successfully to {to}")
            return True
        except Exception as e:
            logger.error(f"Failed to send email to {to}: {str(e)}")
            return False
    
    def send_bulk_email(self, recipients: List[str], subject: str, template: str, **kwargs) -> dict:
        """Send email to multiple recipients."""
        results = {
            'success': [],
            'failed': []
        }
        
        for recipient in recipients:
            if self.send_email(recipient, subject, template, **kwargs):
                results['success'].append(recipient)
            else:
                results['failed'].append(recipient)
        
        return results
    
    def send_welcome_email(self, customer_email: str, customer_name: str) -> bool:
        """Send welcome email to new customer."""
        return self.send_email(
            to=customer_email,
            subject="Velkommen til HighendEvent!",
            template="emails/welcome.html",
            customer_name=customer_name
        )
    
    def send_order_confirmation(self, customer_email: str, customer_name: str, booking) -> bool:
        """Send order confirmation email."""
        return self.send_email(
            to=customer_email,
            subject=f"Ordrebekræftelse - {booking.booking_no}",
            template="emails/order_confirmation.html",
            customer_name=customer_name,
            booking=booking
        )
    
    def send_profile_completion_email(self, customer_email: str, customer_name: str) -> bool:
        """Send profile completion email to guest customers."""
        from urllib.parse import quote
        from flask import url_for
        
        # Create profile completion URL
        profile_completion_url = url_for('customer.complete_profile', 
                                       token=quote(customer_email), 
                                       _external=True)
        
        return self.send_email(
            to=customer_email,
            subject="Fuldfør din profil - HighendEvent",
            template="emails/profile_completion.html",
            customer_name=customer_name,
            profile_completion_url=profile_completion_url
        )
    
    def send_newsletter_welcome_email(self, subscriber_email: str) -> bool:
        """Send welcome email to new newsletter subscriber."""
        from flask import url_for
        from urllib.parse import quote
        
        # Create unsubscribe URL
        unsubscribe_url = url_for('admin.newsletter_unsubscribe', 
                                email=quote(subscriber_email), 
                                _external=True)
        
        return self.send_email(
            to=subscriber_email,
            subject="Velkommen til HighendEvent nyhedsbrev!",
            template="emails/newsletter_welcome.html",
            subscriber_email=subscriber_email,
            unsubscribe_url=unsubscribe_url
        )
    
    def send_return_notification(self, customer_email: str, customer_name: str, booking) -> bool:
        """Send notification when item is returned in good condition."""
        return self.send_email(
            to=customer_email,
            subject=f"Dit udstyr er returneret - {booking.booking_no}",
            template="emails/return_notification.html",
            customer_name=customer_name,
            booking=booking
        )
    
    def send_newsletter(self, recipients: List[str], subject: str, content: str, title: str) -> dict:
        """Send newsletter to all subscribers."""
        return self.send_bulk_email(
            recipients=recipients,
            subject=subject,
            template="emails/newsletter.html",
            title=title,
            content=content
        )
    
    def send_admin_notification(self, admin_email: str, subject: str, message: str) -> bool:
        """Send notification to admin."""
        return self.send_email(
            to=admin_email,
            subject=f"Admin Notification: {subject}",
            template="emails/admin_notification.html",
            message=message
        )
    
    def send_booking_status_update(self, customer_email: str, customer_name: str, booking, old_status: str, new_status: str) -> bool:
        """Send booking status update email to customer."""
        status_messages = {
            'deposit_paid': {
                'subject': f'Betaling bekræftet - {booking.booking_no}',
                'template': 'emails/status_deposit_paid.html'
            },
            'out_for_delivery': {
                'subject': f'Udstyr udleveret - {booking.booking_no}',
                'template': 'emails/status_out_for_delivery.html'
            },
            'returned_good': {
                'subject': f'Udstyr returneret - {booking.booking_no}',
                'template': 'emails/status_returned_good.html'
            },
            'returned_damaged': {
                'subject': f'Udstyr returneret med skader - {booking.booking_no}',
                'template': 'emails/status_returned_damaged.html'
            },
            'deposit_refunded': {
                'subject': f'Depositum refunderet - {booking.booking_no}',
                'template': 'emails/status_deposit_refunded.html'
            },
            'fully_paid': {
                'subject': f'Booking afsluttet - {booking.booking_no}',
                'template': 'emails/status_fully_paid.html'
            }
        }
        
        if new_status not in status_messages:
            return False
            
        message_info = status_messages[new_status]
        return self.send_email(
            to=customer_email,
            subject=message_info['subject'],
            template=message_info['template'],
            customer_name=customer_name,
            booking=booking,
            old_status=old_status,
            new_status=new_status
        )

# Global email service instance
email_service = EmailService()
