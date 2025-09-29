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
    current_app.logger.info(f'🧪 Test endpoint accessed: {request.method} {request.path}')
    
    if request.method == 'POST':
        current_app.logger.info('🧪 Stripe test endpoint received POST request')
        current_app.logger.info(f'🧪 Headers: {dict(request.headers)}')
        return 'Webhook endpoint is reachable!', 200
    else:
        return '''
        <h1>Stripe Webhook Test</h1>
        <p>This endpoint is reachable. Webhook URL: <code>https://www.highendevent.dk/stripe/webhook</code></p>
        <p>Test with POST request to verify webhook connectivity.</p>
        '''


@bp.route('/stripe/webhook', methods=['POST'])
def stripe_webhook():
    """Handle Stripe webhook events."""
    
    current_app.logger.info(f'🔗 Webhook endpoint accessed: {request.method} {request.path}')
    current_app.logger.info(f'🔗 Headers: {dict(request.headers)}')
    
    try:
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
            except json.JSONDecodeError as e:
                current_app.logger.error(f'❌ Invalid JSON payload in webhook: {e}')
                return 'Invalid JSON payload', 400
        else:
            try:
                event = stripe.Webhook.construct_event(
                    payload, sig_header, webhook_secret
                )
                current_app.logger.info(f'✅ Webhook verified successfully: {event.get("type", "unknown")}')
            except ValueError as e:
                # Invalid payload
                current_app.logger.error(f'❌ Invalid payload in Stripe webhook: {e}')
                return 'Invalid payload', 400
            except stripe.error.SignatureVerificationError as e:
                # Invalid signature
                current_app.logger.error(f'❌ Invalid signature in Stripe webhook: {e}')
                return 'Invalid signature', 400
        
        # Handle the event
        try:
            success = True
            if event['type'] == 'checkout.session.completed':
                success = handle_checkout_session_completed(event['data']['object'])
            elif event['type'] == 'payment_intent.succeeded':
                success = handle_payment_intent_succeeded(event['data']['object'])
            elif event['type'] == 'payment_intent.payment_failed':
                success = handle_payment_intent_failed(event['data']['object'])
            else:
                current_app.logger.info(f'ℹ️ Unhandled event type: {event["type"]}')
            
            if success:
                current_app.logger.info(f'✅ Successfully processed webhook event: {event["type"]}')
            else:
                current_app.logger.warning(f'⚠️ Partial success processing webhook event: {event["type"]}')
            
            # Always return 200 OK to prevent retries for known events
            return 'OK', 200
            
        except Exception as e:
            current_app.logger.error(f'❌ Error processing webhook event: {e}')
            import traceback
            current_app.logger.error(f'❌ Webhook traceback: {traceback.format_exc()}')
            # Return 200 OK even for errors to prevent infinite retries
            return 'Webhook processed with errors', 200
            
    except Exception as e:
        current_app.logger.error(f'❌ Unexpected error in webhook handler: {e}')
        import traceback
        current_app.logger.error(f'❌ Webhook handler traceback: {traceback.format_exc()}')
        return f'Webhook error: {str(e)}', 500


def handle_checkout_session_completed(session):
    """Handle successful checkout session completion."""
    try:
        current_app.logger.info(f'🔗 Processing checkout.session.completed for session: {session["id"]}')
        
        # Check if booking already exists (created via direct flow)
        existing_booking = Booking.query.filter_by(stripe_session_id=session['id']).first()
        if existing_booking:
            current_app.logger.info(f'✅ Booking {existing_booking.booking_no} already exists for session {session["id"]}')
            return True
        
        # For webhooks, we don't have access to Flask session, so we skip creation
        # The booking should already be created via the direct flow after Stripe redirect
        current_app.logger.info(f'⚠️ No existing booking found for session {session["id"]}, but this is expected in webhook context')
        return True
        
    except Exception as e:
        current_app.logger.error(f'❌ Error handling checkout session completed: {str(e)}')
        import traceback
        current_app.logger.error(f'❌ Traceback: {traceback.format_exc()}')
        db.session.rollback()
        return False


def handle_payment_intent_succeeded(payment_intent):
    """Handle successful payment intent."""
    try:
        # Get booking by payment intent ID
        booking = Booking.query.filter_by(stripe_payment_intent_id=payment_intent['id']).first()
        
        if not booking:
            current_app.logger.warning(f'⚠️ Booking not found for payment intent: {payment_intent["id"]}')
            return True  # Not an error - just means booking handled elsewhere
        
        # Update booking status to deposit paid if not already
        if booking.status == BookingStatus.PENDING:
            booking.status = BookingStatus.DEPOSIT_PAID
            db.session.commit()
            
            current_app.logger.info(f'✅ Booking {booking.booking_no} marked as paid via payment intent')
        else:
            current_app.logger.info(f'ℹ️ Booking {booking.booking_no} already in status: {booking.status.value}')
        
        return True
        
    except Exception as e:
        current_app.logger.error(f'❌ Error handling payment intent succeeded: {str(e)}')
        import traceback
        current_app.logger.error(f'❌ Traceback: {traceback.format_exc()}')
        db.session.rollback()
        return False


def handle_payment_intent_failed(payment_intent):
    """Handle failed payment intent."""
    try:
        # Get booking by payment intent ID
        booking = Booking.query.filter_by(stripe_payment_intent_id=payment_intent['id']).first()
        
        if not booking:
            current_app.logger.warning(f'⚠️ Booking not found for payment intent: {payment_intent["id"]}')
            return True  # Not an error - just means booking handled elsewhere
        
        # Log the failure but don't change booking status
        # The booking remains PENDING and can be retried
        error_message = payment_intent.get("last_payment_error", {}).get("message", "Unknown error")
        current_app.logger.warning(f'⚠️ Payment failed for booking {booking.booking_no}: {error_message}')
        
        return True
        
    except Exception as e:
        current_app.logger.error(f'❌ Error handling payment intent failed: {str(e)}')
        import traceback
        current_app.logger.error(f'❌ Traceback: {traceback.format_exc()}')
        return False
