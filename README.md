# Festudlej - Danish Party Rental Business

A complete Flask 3+ web application for a Danish party rental business, featuring a visual webshop experience, rental booking flow with availability checking, and a comprehensive admin backoffice.

## Features

### Public Features
- **Product Catalog**: Browse products by category with filtering and search
- **Product Details**: Detailed product pages with image galleries and availability checker
- **Availability Calendar**: Visual calendar showing product availability
- **Shopping Cart**: Add products to cart with date selection and quantity
- **Checkout**: Guest checkout with Stripe payment integration
- **Order Confirmation**: Order details with PDF invoice download

### Admin Features
- **Dashboard**: KPI overview with booking statistics and revenue tracking
- **Product Management**: CRUD operations for products, categories, and images
- **Booking Management**: View, edit, and manage customer bookings
- **Calendar View**: Visual calendar of all bookings with status filtering
- **Settings**: Configure delivery fees, VAT, and CMS content
- **User Management**: Admin and staff user roles

### Technical Features
- **Availability Engine**: Smart availability checking with buffer days and blackout dates
- **Pricing Engine**: Dynamic pricing with weekend rates, deposits, and VAT calculation
- **Stripe Integration**: Secure payment processing with webhook handling
- **Email Notifications**: Automated booking confirmations and admin alerts
- **PDF Generation**: Automatic invoice generation with Danish formatting
- **Responsive Design**: Mobile-first design with Tailwind CSS
- **Danish Localization**: Full Danish language support with proper currency formatting

## Tech Stack

- **Backend**: Python 3.11+, Flask 3+, SQLAlchemy 2.x
- **Database**: SQLite (development), MySQL (production)
- **Frontend**: Tailwind CSS, HTMX, Alpine.js, FullCalendar
- **Payments**: Stripe Checkout
- **Email**: Flask-Mail with SMTP
- **PDF**: ReportLab for invoice generation
- **Testing**: pytest with factory_boy
- **Code Quality**: ruff (linting), black (formatting)

## Installation

### Prerequisites
- Python 3.11 or higher
- pip (Python package manager)

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd festudlej
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

5. **Initialize database**
   ```bash
   flask db upgrade
   python seed.py
   ```

6. **Run the application**
   ```bash
   python app.py
   ```

The application will be available at `http://localhost:5000`

### Default Admin Credentials
- **Admin**: admin@festudlej.dk / admin123
- **Staff**: staff@festudlej.dk / staff123

## Configuration

### Environment Variables

Create a `.env` file with the following variables:

```env
FLASK_ENV=development
SECRET_KEY=your-secret-key-here
DATABASE_URL=sqlite:///app.db
STRIPE_PUBLIC_KEY=pk_test_your_stripe_public_key
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_DEFAULT_SENDER=your-email@gmail.com
VAT_PERCENT=25
```

### Stripe Setup

1. Create a Stripe account at https://stripe.com
2. Get your API keys from the Stripe dashboard
3. Set up webhook endpoints:
   - URL: `https://yourdomain.com/stripe/webhook`
   - Events: `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed`

## Database Migrations

```bash
# Create a new migration
flask db migrate -m "Description of changes"

# Apply migrations
flask db upgrade

# Rollback migration
flask db downgrade
```

## Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app

# Run specific test file
pytest tests/test_availability.py
```

## Code Quality

```bash
# Format code
black .

# Lint code
ruff check .

# Fix linting issues
ruff check --fix .
```

## Deployment to PythonAnywhere

### 1. Upload Code
- Upload your code to PythonAnywhere
- Set up a virtual environment with Python 3.11

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Database Setup
- Create a MySQL database in PythonAnywhere
- Update `DATABASE_URL` in your `.env` file:
  ```env
  DATABASE_URL=mysql://username:password@hostname/database_name
  ```

### 4. Run Migrations
```bash
flask db upgrade
python seed.py
```

### 5. Configure WSGI
- Create a WSGI file pointing to `wsgi.py`
- Set the application variable to `application`

### 6. Static Files
- Configure static files mapping in PythonAnywhere
- Map `/static/` to your static files directory

### 7. Environment Variables
- Set all environment variables in PythonAnywhere's environment section

### 8. Webhooks
- Update Stripe webhook URL to your PythonAnywhere domain
- Ensure webhook secret is correctly configured

## Project Structure

```
festudlej/
├── app/
│   ├── __init__.py              # Flask app factory
│   ├── config.py                # Configuration classes
│   ├── models.py                # SQLAlchemy models
│   ├── forms.py                 # WTForms definitions
│   ├── filters.py               # Jinja2 template filters
│   ├── errors.py                # Error handlers
│   ├── blueprints/              # Route blueprints
│   │   ├── public.py            # Public website routes
│   │   ├── shop.py              # Shopping cart and checkout
│   │   ├── admin.py             # Admin backoffice
│   │   ├── api.py               # API endpoints
│   │   └── stripe_webhooks.py   # Stripe webhook handlers
│   ├── services/                # Business logic services
│   │   ├── availability.py      # Availability checking
│   │   └── pricing.py           # Pricing calculations
│   ├── utils/                   # Utility functions
│   │   ├── booking.py           # Booking utilities
│   │   ├── pdf.py               # PDF generation
│   │   └── email.py             # Email utilities
│   └── templates/               # Jinja2 templates
│       ├── base.html            # Base template
│       ├── public/              # Public website templates
│       ├── shop/                # Shopping templates
│       ├── admin/               # Admin templates
│       └── errors/              # Error page templates
├── migrations/                  # Database migrations
├── tests/                       # Test files
├── requirements.txt             # Python dependencies
├── wsgi.py                      # WSGI entry point
├── app.py                       # Development server
├── seed.py                      # Database seeding
└── README.md                    # This file
```

## Key Features Explained

### Availability Engine
The availability engine checks product availability considering:
- Existing bookings for the same product
- Buffer days (prep and cleanup)
- Blackout dates for maintenance
- Stock quantity limits

### Pricing Engine
The pricing engine calculates costs including:
- Base daily pricing
- Weekend rate adjustments
- Refundable deposits
- Delivery fees
- VAT calculation (25% default)

### Danish Localization
- All text in Danish
- Currency formatting (DKK with comma as decimal separator)
- Date formatting (DD/MM/YYYY)
- Proper pluralization rules

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run tests and linting
6. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, email info@festudlej.dk or create an issue in the repository.



