"""Application configuration."""

import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Base configuration."""
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    
    # Database configuration with MySQL support
    database_url = os.environ.get('DATABASE_URL') or 'sqlite:///instance/app.db'
    if database_url.startswith('mysql://'):
        # Convert mysql:// to mysql+pymysql:// for SQLAlchemy compatibility
        database_url = database_url.replace('mysql://', 'mysql+pymysql://', 1)
    SQLALCHEMY_DATABASE_URI = database_url
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Database connection pooling configuration for production stability
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_size': 3,  # Reduced pool size for PythonAnywhere
        'max_overflow': 5,  # Reduced overflow for PythonAnywhere
        'pool_timeout': 30,  # Seconds to wait for a connection from the pool
        'pool_recycle': 1800,  # Recycle connections after 30 minutes to prevent stale connections
        'pool_pre_ping': True,  # Test connections before use to detect stale connections
        'pool_reset_on_return': 'rollback',  # Rollback transactions on return
    }
    
    # Add MySQL-specific connection args only for MySQL databases
    if database_url.startswith('mysql'):
        SQLALCHEMY_ENGINE_OPTIONS['connect_args'] = {
            'connect_timeout': 10,  # MySQL connection timeout
            'read_timeout': 20,  # Reduced read timeout
            'write_timeout': 20,  # Reduced write timeout
            'charset': 'utf8mb4',  # Use utf8mb4 for full Unicode support
            'autocommit': False,  # Use transactions
            'init_command': "SET SESSION wait_timeout=28800, interactive_timeout=28800",  # Set MySQL timeouts
        }
    
    # Stripe configuration
    STRIPE_PUBLIC_KEY = os.environ.get('STRIPE_PUBLIC_KEY') or 'pk_test_51S84RAGzFU37JYeIIaqmzVTz0OZhfNE5SCdjpmSTbjv2W2vGO5gnOwVrNxrmosrTXSMlXtKQNcYV0q9g0stITPCi00z7ryFXFE'
    STRIPE_SECRET_KEY = os.environ.get('STRIPE_SECRET_KEY') or 'sk_test_51S84RAGzFU37JYeIgnouFRu0oVJfayA3c8zj0sdllCutGAaha6tAVniwemBrhNktkj37gwskdiG5QaAs5ZEJ3LWx00GW6jh4HX'
    STRIPE_WEBHOOK_SECRET = os.environ.get('STRIPE_WEBHOOK_SECRET')
    
    # Mail configuration
    MAIL_SERVER = os.environ.get('MAIL_SERVER')
    MAIL_PORT = int(os.environ.get('MAIL_PORT') or 587)
    MAIL_USE_TLS = os.environ.get('MAIL_USE_TLS', 'true').lower() in ['true', 'on', '1']
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD')
    MAIL_DEFAULT_SENDER = os.environ.get('MAIL_DEFAULT_SENDER') or 'HighendEvent <your-email@gmail.com>'
    
    # Business configuration
    VAT_PERCENT = float(os.environ.get('VAT_PERCENT', 25))
    CURRENCY = 'DKK'
    LOCALE = 'da_DK'
    
    # Session configuration
    PERMANENT_SESSION_LIFETIME = timedelta(hours=24)
    SESSION_COOKIE_SECURE = os.environ.get('FLASK_ENV') == 'production'  # HTTPS only in production
    SESSION_COOKIE_HTTPONLY = True  # Prevent XSS
    SESSION_COOKIE_SAMESITE = 'Lax'  # CSRF protection
    
    # File upload configuration
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    UPLOAD_FOLDER = 'app/static/uploads'
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}


class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True
    # Use SQLite for development if DATABASE_URL is set, otherwise fallback to MySQL
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///instance/app.db'
    
    # Stripe sandbox keys for development
    STRIPE_PUBLIC_KEY = os.environ.get('STRIPE_PUBLIC_KEY') or 'pk_test_51S84RAGzFU37JYeIIaqmzVTz0OZhfNE5SCdjpmSTbjv2W2vGO5gnOwVrNxrmosrTXSMlXtKQNcYV0q9g0stITPCi00z7ryFXFE'
    STRIPE_SECRET_KEY = os.environ.get('STRIPE_SECRET_KEY') or 'sk_test_51S84RAGzFU37JYeIgnouFRu0oVJfayA3c8zj0sdllCutGAaha6tAVniwemBrhNktkj37gwskdiG5QaAs5ZEJ3LWx00GW6jh4HX'


class ProductionConfig(Config):
    """Production configuration."""
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///instance/app.db'


class TestingConfig(Config):
    """Testing configuration."""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    WTF_CSRF_ENABLED = False


config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}
