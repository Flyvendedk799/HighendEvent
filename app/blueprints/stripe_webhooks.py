"""Stripe webhook handlers."""

from flask import Blueprint, request, current_app
from flask_login import login_required
import json

import stripe

from app.models import Booking, BookingStatus, db

bp = Blueprint('stripe_webhooks', __name__)


@bp.route('/stripe/test', methods=['GET', 'POST'])
def stripe_test():
    """Test endpoint to verify webhooks can reach the server."""
    if request.method == 'POST':
        current_app.logger.info('🧪 Stripe test endpoint received POST request')
        return 'Webhook endpoint is reachable!', 200
    else:
        return '''
        <h1>Stripe Webhook Test</h1>
        <p>This endpoint is reachable. Webhook URL: <code>https://highendevent.dk/stripe/webhook</code></p>
        <p>Test with POST request to verify webhook connectivity.</p>
        '''


@bp.route('/stripe/webhook', methods=['POST'])
def stripe_webhook():
    """Handle Stripe webhook events."""
    
    payload = request.get_data()
    sig_header = request.headers.get('Stripe-Signature')
    
    current_app.logger.info(f'🔗 Webhook received: {len(payload)} bytes, signature present: {bool(sig_header)}')
    
    # Check if webhook secret is configured
    webhook_secret = current_app.config.get('STRIPE_WEBHOOK_SECRET')
    if not webhook_secret:
        current_app.logger.warning('⚠️ STRIPE_WEBHOOK_SECRET not configured, processing webhook without verification')
        # Parse the JSON payload directly
        try:
            event = json.loads(payload)
            current_app.logger.info(f'🔗 Webhook event type: {event.get("type", "unknown")}')
        except json.JSONDecodeError:
            current_app.logger.error('❌ Invalid JSON payload in webhook')
            return 'Invalid JSON payload', 400
    else:
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, webhook_secret
            )
            current_app.logger.info(f'✅ Webhook verified successfully: {event.get("type", "unknown")}')
        except ValueError:
            # Invalid payload
            current_app.logger.error('❌ Invalid payload in Stripe webhook')
            return 'Invalid payload', 400
        except stripe.error.SignatureVerificationError:
            # Invalid signature
            current_app.logger.error('❌ Invalid signature in Stripe webhook')
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
        current_app.logger.info(f'🔗 Processing checkout.session.completed for session: {session["id"]}')
        
        # Check if booking already exists (created via direct flow)
        existing_booking = Booking.query.filter_by(stripe_session_id=session['id']).first()
        if existing_booking:
            current_app.logger.info(f'✅ Booking {existing_booking.booking_no} already exists for session {session["id"]}')
            return
        
        # For webhooks, we don't have access to Flask session, so we skip creation
        # The booking should already be created via the direct flow after Stripe redirect
        current_app.logger.info(f'⚠️ No existing booking found for session {session["id"]}, but this is expected in webhook context')
        
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
