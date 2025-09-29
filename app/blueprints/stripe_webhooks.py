"""Stripe webhook handlers."""

from flask import Blueprint, request, current_app
from flask_login import login_required
import json

import stripe

from app.models import Booking, BookingStatus, db

bp = Blueprint('stripe_webhooks', __name__)


@bp.route('/stripe/webhook', methods=['POST'])
def stripe_webhook():
    """Handle Stripe webhook events."""
    
    payload = request.get_data()
    sig_header = request.headers.get('Stripe-Signature')
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, current_app.config['STRIPE_WEBHOOK_SECRET']
        )
    except ValueError:
        # Invalid payload
        current_app.logger.error('Invalid payload in Stripe webhook')
        return 'Invalid payload', 400
    except stripe.error.SignatureVerificationError:
        # Invalid signature
        current_app.logger.error('Invalid signature in Stripe webhook')
        return 'Invalid signature', 400
    
    # Handle the event
    if event['type'] == 'checkout.session.completed':
        handle_checkout_session_completed(event['data']['object'])
    elif event['type'] == 'payment_intent.succeeded':
        handle_payment_intent_succeeded(event['data']['object'])
    elif event['type'] == 'payment_intent.payment_failed':
        handle_payment_intent_failed(event['data']['object'])
    else:
        current_app.logger.info(f'Unhandled event type: {event["type"]}')
    
    return 'OK', 200


def handle_checkout_session_completed(session):
    """Handle successful checkout session completion."""
    try:
        # Check if this is a cart-based checkout (new flow)
        if session.get('metadata', {}).get('checkout_type') == 'cart_based':
            # Create booking from session data
            from flask import session as flask_session
            from app.blueprints.shop import create_booking_from_cart
            from app.forms import CheckoutForm
            
            checkout_data = flask_session.get('checkout_data')
            if not checkout_data:
                current_app.logger.error(f'No checkout data found in session for Stripe session: {session["id"]}')
                return
            
            # Create form object from stored data
            form = CheckoutForm()
            form.customer_name.data = checkout_data['form_data']['customer_name']
            form.email.data = checkout_data['form_data']['email']
            form.phone.data = checkout_data['form_data']['phone']
            form.address.data = checkout_data['form_data']['address']
            form.zip_code.data = checkout_data['form_data']['zip_code']
            form.city.data = checkout_data['form_data']['city']
            form.delivery_type.data = checkout_data['form_data']['delivery_type']
            form.notes.data = checkout_data['form_data']['notes']
            
            # Create booking from cart data
            booking = create_booking_from_cart(checkout_data['cart_data'], form)
            
            if not booking:
                current_app.logger.error('Failed to create booking from cart data in webhook')
                return
            
            # Update booking with Stripe session info
            booking.stripe_session_id = session['id']
            booking.stripe_payment_intent_id = session.get('payment_intent')
            booking.status = BookingStatus.FULLY_PAID
            
            db.session.commit()
            
            # Clear checkout data from session
            flask_session.pop('checkout_data', None)
            
            # Send confirmation email
            from app.utils.email import send_booking_confirmation
            send_booking_confirmation(booking)
            
            current_app.logger.info(f'Booking {booking.booking_no} created and marked as paid')
            
        else:
            # Legacy flow - get existing booking by Stripe session ID
            booking = Booking.query.filter_by(stripe_session_id=session['id']).first()
            
            if not booking:
                current_app.logger.error(f'Booking not found for Stripe session: {session["id"]}')
                return
            
            # Update booking status to fully paid (full amount received upfront)
            booking.status = BookingStatus.FULLY_PAID
            booking.stripe_payment_intent_id = session.get('payment_intent')
            
            db.session.commit()
            
            # Send confirmation email
            from app.utils.email import send_booking_confirmation
            send_booking_confirmation(booking)
            
            current_app.logger.info(f'Booking {booking.booking_no} marked as paid')
        
    except Exception as e:
        current_app.logger.error(f'Error handling checkout session completed: {str(e)}')
        db.session.rollback()


def handle_payment_intent_succeeded(payment_intent):
    """Handle successful payment intent."""
    try:
        # Get booking by payment intent ID
        booking = Booking.query.filter_by(stripe_payment_intent_id=payment_intent['id']).first()
        
        if not booking:
            current_app.logger.error(f'Booking not found for payment intent: {payment_intent["id"]}')
            return
        
        # Update booking status to deposit paid if not already
        if booking.status == BookingStatus.PENDING:
            booking.status = BookingStatus.DEPOSIT_PAID
            db.session.commit()
            
            # Send confirmation email
            from app.utils.email import send_booking_confirmation
            send_booking_confirmation(booking)
            
            current_app.logger.info(f'Booking {booking.booking_no} marked as paid via payment intent')
        
    except Exception as e:
        current_app.logger.error(f'Error handling payment intent succeeded: {str(e)}')
        db.session.rollback()


def handle_payment_intent_failed(payment_intent):
    """Handle failed payment intent."""
    try:
        # Get booking by payment intent ID
        booking = Booking.query.filter_by(stripe_payment_intent_id=payment_intent['id']).first()
        
        if not booking:
            current_app.logger.error(f'Booking not found for payment intent: {payment_intent["id"]}')
            return
        
        # Log the failure but don't change booking status
        # The booking remains PENDING and can be retried
        current_app.logger.warning(f'Payment failed for booking {booking.booking_no}: {payment_intent.get("last_payment_error", {}).get("message", "Unknown error")}')
        
    except Exception as e:
        current_app.logger.error(f'Error handling payment intent failed: {str(e)}')
