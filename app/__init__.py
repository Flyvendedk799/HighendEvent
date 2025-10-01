"""Flask application factory for Danish party rental business."""

from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_login import LoginManager
from flask_mail import Mail
from flask_wtf.csrf import CSRFProtect

from app.config import Config

# Initialize extensions
db = SQLAlchemy()
migrate = Migrate()
login_manager = LoginManager()
mail = Mail()
csrf = CSRFProtect()


def create_app(config_class=Config):
    """Create and configure Flask application."""
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize extensions with app
    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)
    mail.init_app(app)
    csrf.init_app(app)
    
    # Add database health check and retry logic
    @app.before_request
    def before_request():
        """Check database connection before each request."""
        from flask import current_app
        import time
        
        # Skip health check for static files and health endpoint
        if request.endpoint in ['static', 'health_check']:
            return
            
        max_retries = 3
        for attempt in range(max_retries):
            try:
                # Test database connection with a simple query
                db.session.execute('SELECT 1')
                break  # Connection successful, exit retry loop
            except Exception as e:
                current_app.logger.warning(f'⚠️ Database connection issue (attempt {attempt + 1}/{max_retries}): {e}')
                
                if attempt < max_retries - 1:
                    # Try to refresh the connection
                    try:
                        db.session.close()
                        db.session.remove()
                        time.sleep(0.5)  # Brief pause before retry
                        current_app.logger.info(f'🔄 Attempting to restore database connection (attempt {attempt + 2})')
                    except Exception as refresh_error:
                        current_app.logger.error(f'🚨 Failed to refresh database session: {refresh_error}')
                else:
                    # Final attempt failed
                    current_app.logger.error(f'🚨 All database connection attempts failed after {max_retries} tries')
                    # Don't fail the request, let it continue and handle errors in error handlers
    
    # Handle CSRF errors for webhook endpoints
    from flask_wtf.csrf import CSRFError
    
    @app.errorhandler(CSRFError)
    def handle_csrf_error(error):
        """Handle CSRF errors, especially for webhook endpoints."""
        from flask import request, current_app
        
        current_app.logger.info(f'🔍 CSRF Error on {request.path}: {str(error)}')
        
        # If this is a webhook endpoint, return 200 OK to prevent retries
        if request and request.path and request.path.startswith('/stripe/'):
            current_app.logger.info(f'🔗 CSRF error on webhook endpoint {request.path} - returning 200 OK')
            return 'Webhook received', 200
            
        # For all other CSRF errors, return the original error
        current_app.logger.warning(f'⚠️ CSRF error on non-webhook endpoint {request.path}: {str(error)}')
        return error
    
    @app.errorhandler(400)
    def handle_400_error(error):
        """Handle general 400 errors."""
        from flask import request, current_app
        
        current_app.logger.info(f'🔍 400 Error on {request.path}: {str(error)}')
        
        # If this is a webhook endpoint, return 200 OK to prevent retries
        if request and request.path and request.path.startswith('/stripe/'):
            current_app.logger.info(f'🔗 400 error on webhook endpoint {request.path} - returning 200 OK')
            return 'Webhook received', 200
            
        # For all other 400 errors, return the original error
        return error
    
    @app.errorhandler(500)
    def handle_500_error(error):
        """Handle 500 internal server errors with comprehensive logging."""
        from flask import request, current_app
        import traceback
        
        # Log the full error details
        current_app.logger.error(f'🚨 500 Internal Server Error on {request.path}')
        current_app.logger.error(f'🚨 Error: {str(error)}')
        current_app.logger.error(f'🚨 Request method: {request.method}')
        current_app.logger.error(f'🚨 Request headers: {dict(request.headers)}')
        current_app.logger.error(f'🚨 User agent: {request.headers.get("User-Agent", "Unknown")}')
        current_app.logger.error(f'🚨 Remote address: {request.remote_addr}')
        
        # Log the full traceback
        current_app.logger.error(f'🚨 Traceback: {traceback.format_exc()}')
        
        # Check if this is a database connection issue
        if 'connection' in str(error).lower() or 'mysql' in str(error).lower() or 'lost connection' in str(error).lower():
            current_app.logger.error('🚨 Database connection issue detected')
            # Try to refresh database connection
            try:
                db.session.close()
                db.session.remove()
                # Force engine disposal to clear all connections
                db.engine.dispose()
                current_app.logger.info('🔄 Database session and engine refreshed')
            except Exception as e:
                current_app.logger.error(f'🚨 Failed to refresh database session: {e}')
        
        # Return user-friendly error page
        if request.is_json:
            return {'error': 'Der opstod en intern serverfejl. Prøv igen senere.'}, 500
        from flask import render_template
        return render_template('errors/500.html'), 500

    # Configure login manager
    login_manager.login_view = 'customer.login'  # Default to customer login
    login_manager.login_message = 'Du skal være logget ind for at se denne side.'
    login_manager.login_message_category = 'info'
    
    @login_manager.user_loader
    def load_user(user_id):
        from app.models import User, Customer
        from flask import session
        
        try:
            # Check if we have a user type in session to determine which table to query
            user_type = session.get('user_type')
            
            if user_type == 'customer':
                return Customer.query.get(int(user_id))
            elif user_type == 'admin':
                return User.query.get(int(user_id))
            else:
                # Fallback: try both, but prefer Customer for new logins
                customer = Customer.query.get(int(user_id))
                if customer:
                    return customer
                return User.query.get(int(user_id))
        except Exception as e:
            from flask import current_app
            current_app.logger.error(f'🚨 Error loading user {user_id}: {e}')
            # Return None to force re-login
            return None
    
    @login_manager.unauthorized_handler
    def unauthorized():
        """Handle unauthorized access - redirect to appropriate login."""
        from flask import request, redirect, url_for
        # If trying to access admin routes, redirect to admin login
        if request.endpoint and request.endpoint.startswith('admin.'):
            return redirect(url_for('admin.login'))
        # Otherwise redirect to customer login
        return redirect(url_for('customer.login'))

    # Add health check endpoint
    @app.route('/health')
    def health_check():
        """Health check endpoint for monitoring."""
        try:
            # Test database connection
            db.session.execute('SELECT 1')
            return {'status': 'healthy', 'database': 'connected'}, 200
        except Exception as e:
            from flask import current_app
            current_app.logger.error(f'🚨 Health check failed: {e}')
            return {'status': 'unhealthy', 'database': 'disconnected', 'error': str(e)}, 500

    # Register blueprints
    from app.blueprints.public import bp as public_bp
    app.register_blueprint(public_bp)

    from app.blueprints.shop import bp as shop_bp
    app.register_blueprint(shop_bp, url_prefix='/shop')

    from app.blueprints.admin import bp as admin_bp
    app.register_blueprint(admin_bp, url_prefix='/admin')

    from app.blueprints.api import bp as api_bp
    app.register_blueprint(api_bp, url_prefix='/api')

    from app.blueprints.stripe_webhooks import bp as stripe_bp
    app.register_blueprint(stripe_bp)

    from app.blueprints.customer import bp as customer_bp
    app.register_blueprint(customer_bp, url_prefix='/customer')
    
    from app.blueprints.calendar import bp as calendar_bp
    app.register_blueprint(calendar_bp)

    from app.blueprints.sitemap import bp as sitemap_bp
    app.register_blueprint(sitemap_bp)

    # Register error handlers
    from app.errors import register_error_handlers
    register_error_handlers(app)

    # Register template filters
    from app.filters import register_filters
    register_filters(app)

    # Register template context processors
    @app.context_processor
    def inject_cart_count():
        from flask import session
        cart = session.get('cart', [])
        cart_count = sum(item.get('quantity', 1) for item in cart)
        return {'cart_count': cart_count}

    # Initialize email service
    from app.services.email_service import email_service
    email_service.init_app(app)

    return app


# Import models to ensure they are registered with SQLAlchemy
from app import models  # noqa: F401
