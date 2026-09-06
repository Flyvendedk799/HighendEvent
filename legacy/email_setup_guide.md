# Email Setup Guide for Festudlej

## Current Issue
The email system is configured to send from `noreply@festudlej.dk`, but you don't own this domain. This will cause emails to fail or be marked as spam.

## Solutions

### Option 1: Use Gmail SMTP (Recommended for Development)

1. **Create a Gmail account** for your business:
   - Go to Gmail and create `festudlej@gmail.com` (or similar)
   - Use a professional name

2. **Enable 2-Factor Authentication**:
   - Go to Google Account settings
   - Security → 2-Step Verification
   - Enable it

3. **Generate an App Password**:
   - Google Account → Security → App passwords
   - Select "Mail" and "Other (custom name)"
   - Enter "Festudlej App"
   - Copy the 16-character password

4. **Create a .env file** in your project root:
```bash
# Email Configuration
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=true
MAIL_USERNAME=festudlej@gmail.com
MAIL_PASSWORD=your-16-character-app-password
MAIL_DEFAULT_SENDER=Festudlej <festudlej@gmail.com>

# Database
DATABASE_URL=mysql+pymysql://TobiasMastek:Jht89ryu1!@TobiasMastek.mysql.pythonanywhere-services.com/TobiasMastek$HighendEvent

# Stripe
STRIPE_PUBLIC_KEY=pk_test_51S84RAGzFU37JYeIIaqmzVTz0OZhfNE5SCdjpmSTbjv2W2vGO5gnOwVrNxrmosrTXSMlXtKQNcYV0q9g0stITPCi00z7ryFXFE
STRIPE_SECRET_KEY=sk_test_51S84RAGzFU37JYeIgnouFRu0oVJfayA3c8zj0sdllCutGAaha6tAVniwemBrhNktkj37gwskdiG5QaAs5ZEJ3LWx00GW6jh4HX

# Other
SECRET_KEY=your-secret-key-here
VAT_PERCENT=25
```

### Option 2: Use Your Personal Email

If you prefer to use your existing email:

1. **Update the config** to use your email:
   - Replace `your-email@gmail.com` in `app/config.py` with your actual email
   - Use Gmail SMTP settings above

### Option 3: Professional Email Service (For Production)

For production, consider:
- **SendGrid** (recommended)
- **Mailgun**
- **Amazon SES**
- **Microsoft 365**

## Testing Email

Once configured, you can test by:
1. Registering a new customer account
2. Making a test booking
3. Checking if emails are received

## Important Notes

- **Never commit** the `.env` file to version control
- **App passwords** are safer than regular passwords
- **Gmail has limits** (500 emails/day for free accounts)
- **Professional services** are better for production use

