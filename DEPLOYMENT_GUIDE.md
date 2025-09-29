# HighendEvent - PythonAnywhere Deployment Guide

## 🚀 Production Deployment Checklist

This guide covers everything needed to deploy HighendEvent from local development to PythonAnywhere production.

## 📋 Pre-Deployment Requirements

### 1. **PythonAnywhere Account Setup**
- ✅ PythonAnywhere account with web app capability
- ✅ MySQL database access
- ✅ Custom domain (if desired)
- ✅ SSL certificate (automatic with PythonAnywhere)

### 2. **External Service Accounts**
- ✅ Stripe account (production keys)
- ✅ Brevo/Sendinblue account (SMTP credentials)
- ✅ Domain registrar access (if using custom domain)

## 🔧 Required Configuration Changes

### **1. Environment Variables (.env)**
**File: `.env` (create new for production)**

```env
# Production Environment
FLASK_ENV=production
FLASK_DEBUG=False
SECRET_KEY=your-super-secure-production-secret-key-here

# MySQL Database (PythonAnywhere)
DATABASE_URL=mysql://username:password@username.mysql.pythonanywhere-services.com/username$highendevent

# Stripe (PRODUCTION KEYS)
STRIPE_PUBLISHABLE_KEY=pk_live_your_production_publishable_key
STRIPE_SECRET_KEY=sk_live_your_production_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_production_webhook_secret

# Email Configuration (Brevo/Sendinblue)
MAIL_SERVER=smtp-relay.brevo.com
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USERNAME=your-brevo-email@domain.com
MAIL_PASSWORD=your-brevo-smtp-password
MAIL_DEFAULT_SENDER=noreply@yourdomain.com

# Application Configuration
VAT_PERCENT=25.0
SITE_NAME=HighendEvent
SUPPORT_EMAIL=support@yourdomain.com

# Production URLs
BASE_URL=https://yourdomain.com
```

### **2. Database Configuration**
**File: `app/__init__.py`**

**Change Required:**
```python
# BEFORE (Development - SQLite)
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///app.db')

# AFTER (Production - MySQL)
database_url = os.getenv('DATABASE_URL')
if database_url and database_url.startswith('mysql://'):
    # Convert mysql:// to mysql+pymysql:// for SQLAlchemy
    database_url = database_url.replace('mysql://', 'mysql+pymysql://', 1)
app.config['SQLALCHEMY_DATABASE_URI'] = database_url
```

### **3. Stripe Webhook Configuration**
**File: `app/blueprints/stripe_webhooks.py`**

**No code changes needed**, but webhook endpoint must be configured in Stripe Dashboard:
- **Webhook URL**: `https://yourdomain.com/stripe/webhook`
- **Events to listen for**: 
  - `checkout.session.completed`
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`

### **4. WSGI Configuration**
**File: `wsgi.py` (create new)**

```python
import sys
import os

# Add your project directory to the Python path
path = '/home/yourusername/highendevent'
if path not in sys.path:
    sys.path.insert(0, path)

# Set environment variables
os.environ['FLASK_ENV'] = 'production'

from app import create_app
application = create_app()

if __name__ == "__main__":
    application.run()
```

### **5. Requirements File**
**File: `requirements.txt` (verify/update)**

```txt
Flask==2.3.3
Flask-SQLAlchemy==3.0.5
Flask-Login==0.6.3
Flask-WTF==1.1.1
Flask-Mail==0.9.1
WTForms==3.0.1
Werkzeug==2.3.7
stripe==6.7.0
PyMySQL==1.1.0
cryptography==41.0.7
python-dotenv==1.0.0
Pillow==10.0.1
reportlab==4.0.5
sqlalchemy==2.0.21
```

### **6. Email Template Updates**
**Files: All email templates in `app/templates/emails/`**

**Update all email templates to use production domain:**
- Replace `http://127.0.0.1:5000` with `https://yourdomain.com`
- Update any hardcoded localhost references
- Verify all email links work with production URLs

### **7. Static Files Configuration**
**File: PythonAnywhere Web Tab**

Configure static files mapping:
- **URL**: `/static/`
- **Directory**: `/home/yourusername/highendevent/app/static/`

## 🗄️ Database Migration

### **1. Create MySQL Database on PythonAnywhere**
```bash
# In PythonAnywhere console
mysql -u yourusername -p'yourpassword' -h yourusername.mysql.pythonanywhere-services.com

CREATE DATABASE yourusername$highendevent CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### **2. Export Local Data (Optional)**
```bash
# Export SQLite data to SQL dump
sqlite3 instance/app.db .dump > local_data_export.sql
```

### **3. Initialize Production Database**
```python
# In PythonAnywhere console
python3.10
>>> from app import create_app, db
>>> app = create_app()
>>> with app.app_context():
...     db.create_all()
...     print("Database tables created!")
```

### **4. Create Admin User**
```python
# In PythonAnywhere console
>>> from app.models import User, db
>>> admin = User(
...     username='admin',
...     email='admin@yourdomain.com',
...     is_admin=True
... )
>>> admin.set_password('your-secure-admin-password')
>>> db.session.add(admin)
>>> db.session.commit()
>>> print("Admin user created!")
```

## 🌐 Domain and SSL Setup

### **1. Domain Configuration**
- Point your domain's DNS to PythonAnywhere
- Configure domain in PythonAnywhere Web Tab
- Enable HTTPS (automatic with PythonAnywhere)

### **2. Update Stripe Webhook URL**
- Log into Stripe Dashboard
- Update webhook endpoint to production URL
- Copy new webhook signing secret to `.env`

## 🔒 Security Considerations

### **1. Environment Variables**
- ✅ Never commit `.env` file to version control
- ✅ Use strong, unique SECRET_KEY
- ✅ Use production Stripe keys, not test keys
- ✅ Secure database credentials

### **2. Debug Mode**
- ✅ Ensure `FLASK_DEBUG=False` in production
- ✅ Remove any debug routes or print statements
- ✅ Configure proper error handling

## 📧 Email Configuration Testing

### **Test Email Functionality**
```python
# In PythonAnywhere console
>>> from app.services.email_service import email_service
>>> result = email_service.send_newsletter_welcome_email('test@yourdomain.com')
>>> print(f"Test email result: {result}")
```

## 🧪 Post-Deployment Testing

### **Critical Tests to Perform:**

1. **User Registration & Login**
   - ✅ Create new customer account
   - ✅ Login/logout functionality
   - ✅ Password reset flow

2. **Product Catalog**
   - ✅ Browse products
   - ✅ View product details
   - ✅ Calendar availability

3. **Shopping Cart & Checkout**
   - ✅ Add products to cart
   - ✅ Add upsell products
   - ✅ Checkout flow (guest and registered)
   - ✅ Stripe payment processing
   - ✅ Order confirmation emails

4. **Admin Panel**
   - ✅ Admin login
   - ✅ Product management
   - ✅ Booking management
   - ✅ Customer management

5. **Guest User Flow**
   - ✅ Guest checkout
   - ✅ Profile completion email
   - ✅ Profile completion process

6. **Email Functionality**
   - ✅ Order confirmations
   - ✅ Newsletter subscriptions
   - ✅ Profile completion emails

## 🚨 Common Deployment Issues

### **Issue 1: MySQL Connection Errors**
**Solution:** Ensure DATABASE_URL uses `mysql+pymysql://` protocol

### **Issue 2: Static Files Not Loading**
**Solution:** Configure static files mapping in PythonAnywhere Web Tab

### **Issue 3: Webhook Failures**
**Solution:** Update Stripe webhook URL and verify endpoint security

### **Issue 4: Email Not Sending**
**Solution:** Verify Brevo SMTP credentials and email templates

## 📁 File Structure on PythonAnywhere

```
/home/yourusername/highendevent/
├── app/
│   ├── blueprints/
│   ├── models.py
│   ├── forms.py
│   ├── services/
│   ├── templates/
│   ├── static/
│   └── __init__.py
├── .env
├── wsgi.py
├── requirements.txt
└── DEPLOYMENT_GUIDE.md
```

## 🔄 Deployment Steps Summary

1. **Setup PythonAnywhere account and MySQL database**
2. **Upload code via Git or file manager**
3. **Install dependencies**: `pip3.10 install --user -r requirements.txt`
4. **Configure environment variables** (`.env` file)
5. **Update database configuration** in `app/__init__.py`
6. **Initialize database tables**: `python3.10 -c "from app import create_app, db; app=create_app(); app.app_context().push(); db.create_all()"`
7. **Create admin user**
8. **Configure web app** in PythonAnywhere Web Tab
9. **Set up static files mapping**
10. **Configure Stripe webhooks**
11. **Test all functionality**
12. **Go live!** 🎉

## 📞 Support & Troubleshooting

If you encounter issues during deployment:
1. Check PythonAnywhere error logs
2. Verify all environment variables are set correctly
3. Test database connectivity
4. Verify Stripe webhook configuration
5. Check email service configuration

---

**Your HighendEvent platform is ready for production! 🚀**
