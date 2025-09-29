# 🚀 HighendEvent - Quick Deployment Reference

## 📝 Pre-Deployment Checklist

### ✅ **Required Services**
- [ ] PythonAnywhere account
- [ ] MySQL database access
- [ ] Stripe production account
- [ ] Brevo/Sendinblue SMTP account
- [ ] Domain name (optional)

## 🔧 **Step-by-Step Deployment**

### **1. Upload Files to PythonAnywhere**
```bash
# Via Git (recommended)
git clone https://github.com/yourusername/highendevent.git
cd highendevent

# Or upload via file manager
```

### **2. Install Dependencies**
```bash
pip3.10 install --user -r requirements.txt
```

### **3. Configure Environment**
```bash
# Copy and edit environment file
cp env.production.template .env
nano .env
```

**Required .env variables:**
```env
FLASK_ENV=production
SECRET_KEY=your-32-char-secret
DATABASE_URL=mysql://user:pass@user.mysql.pythonanywhere-services.com/user$db
STRIPE_PUBLIC_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
MAIL_SERVER=smtp-relay.brevo.com
MAIL_USERNAME=your-email
MAIL_PASSWORD=your-smtp-password
```

### **4. Initialize Database**
```bash
python3.10 deploy_production.py
```

### **5. Configure PythonAnywhere Web App**

**In Web Tab:**
- **Source code:** `/home/yourusername/highendevent`
- **WSGI file:** `/home/yourusername/highendevent/wsgi.py`
- **Static files:** 
  - URL: `/static/`
  - Directory: `/home/yourusername/highendevent/app/static/`

### **6. Configure Stripe Webhooks**

**In Stripe Dashboard:**
- **Webhook URL:** `https://yourdomain.com/stripe/webhook`
- **Events:** 
  - `checkout.session.completed`
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`

## 🧪 **Testing Checklist**

### **Critical Tests:**
- [ ] Admin login works
- [ ] Customer registration/login
- [ ] Product catalog loads
- [ ] Add to cart functionality
- [ ] Checkout flow (guest & registered)
- [ ] Stripe payment processing
- [ ] Email notifications
- [ ] Guest user profile completion

## 🔍 **Troubleshooting**

### **Common Issues:**

**Database Connection Error:**
```bash
# Check DATABASE_URL format
# Should be: mysql+pymysql://user:pass@host/db
```

**Static Files Not Loading:**
```bash
# Verify static files mapping in Web Tab
# URL: /static/
# Directory: /home/user/highendevent/app/static/
```

**Webhook Failures:**
```bash
# Check Stripe webhook URL
# Verify STRIPE_WEBHOOK_SECRET in .env
```

**Email Not Sending:**
```bash
# Test email config:
python3.10 -c "
from app import create_app
from app.services.email_service import email_service
app = create_app()
with app.app_context():
    result = email_service.send_newsletter_welcome_email('test@domain.com')
    print(f'Result: {result}')
"
```

## 📁 **File Changes Summary**

### **Modified Files:**
- `app/config.py` - Added MySQL support
- `requirements.txt` - Added PyMySQL + cryptography
- `wsgi.py` - **NEW** - WSGI entry point
- `deploy_production.py` - **NEW** - Deployment script
- `env.production.template` - **NEW** - Environment template

### **No Changes Needed:**
- All application code
- Templates
- Static files
- Database models
- Email templates

## 📞 **Support**

If you encounter issues:
1. Check PythonAnywhere error logs
2. Verify all environment variables
3. Test database connectivity
4. Check Stripe webhook configuration
5. Verify email service setup

---

**Your production deployment should be smooth! 🎉**
