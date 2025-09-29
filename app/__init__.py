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

    # Configure login manager
    login_manager.login_view = 'customer.login'  # Default to customer login
    login_manager.login_message = 'Du skal være logget ind for at se denne side.'
    login_manager.login_message_category = 'info'
    
    @login_manager.user_loader
    def load_user(user_id):
        from app.models import User, Customer
        from flask import session
        
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
    
    @login_manager.unauthorized_handler
    def unauthorized():
        """Handle unauthorized access - redirect to appropriate login."""
        from flask import request, redirect, url_for
        # If trying to access admin routes, redirect to admin login
        if request.endpoint and request.endpoint.startswith('admin.'):
            return redirect(url_for('admin.login'))
        # Otherwise redirect to customer login
        return redirect(url_for('customer.login'))

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
