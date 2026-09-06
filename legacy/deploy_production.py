#!/usr/bin/env python3
"""
Production Deployment Script for HighendEvent
Run this script on PythonAnywhere to initialize the database and create admin user
"""

import os
import sys
from getpass import getpass

def init_database():
    """Initialize database tables."""
    print("🗄️ Initializing database tables...")
    
    try:
        from app import create_app, db
        
        app = create_app()
        with app.app_context():
            # Create all tables
            db.create_all()
            print("✅ Database tables created successfully!")
            return True
            
    except Exception as e:
        print(f"❌ Error creating database tables: {str(e)}")
        return False

def create_admin_user():
    """Create admin user."""
    print("\n👤 Creating admin user...")
    
    try:
        from app import create_app, db
        from app.models import User
        
        app = create_app()
        with app.app_context():
            # Check if admin user already exists
            existing_admin = User.query.filter_by(username='admin').first()
            if existing_admin:
                print("⚠️ Admin user already exists!")
                return True
            
            # Get admin details
            print("Enter admin user details:")
            username = input("Username (default: admin): ").strip() or 'admin'
            email = input("Email: ").strip()
            password = getpass("Password: ")
            
            if not email or not password:
                print("❌ Email and password are required!")
                return False
            
            # Create admin user
            admin = User(
                username=username,
                email=email,
                is_admin=True
            )
            admin.set_password(password)
            
            db.session.add(admin)
            db.session.commit()
            
            print(f"✅ Admin user '{username}' created successfully!")
            return True
            
    except Exception as e:
        print(f"❌ Error creating admin user: {str(e)}")
        return False

def test_email_config():
    """Test email configuration."""
    print("\n📧 Testing email configuration...")
    
    try:
        from app import create_app
        from app.services.email_service import email_service
        
        app = create_app()
        with app.app_context():
            # Test email configuration
            test_email = input("Enter test email address: ").strip()
            if test_email:
                result = email_service.send_newsletter_welcome_email(test_email)
                if result:
                    print("✅ Email configuration is working!")
                else:
                    print("❌ Email test failed!")
            else:
                print("⏭️ Skipping email test")
                
    except Exception as e:
        print(f"❌ Error testing email: {str(e)}")

def main():
    """Main deployment function."""
    print("🚀 HighendEvent Production Deployment")
    print("=" * 40)
    
    # Check environment
    env = os.environ.get('FLASK_ENV', 'development')
    print(f"Environment: {env}")
    
    if env != 'production':
        print("⚠️ Warning: FLASK_ENV is not set to 'production'")
        if input("Continue anyway? (y/N): ").lower() != 'y':
            sys.exit(1)
    
    # Initialize database
    if not init_database():
        sys.exit(1)
    
    # Create admin user
    if not create_admin_user():
        sys.exit(1)
    
    # Test email configuration
    test_email_config()
    
    print("\n🎉 Deployment completed!")
    print("\nNext steps:")
    print("1. Configure your domain in PythonAnywhere Web Tab")
    print("2. Set up Stripe webhooks with your production URL")
    print("3. Test the complete application flow")
    print("4. Go live! 🚀")

if __name__ == "__main__":
    main()
