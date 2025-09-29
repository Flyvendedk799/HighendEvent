# HighendEvent - Rental Equipment Platform

## Project Overview

**HighendEvent** is a comprehensive rental equipment platform built with Flask (Python) that allows customers to rent high-end event equipment like popcorn machines, cotton candy machines, and other party/event supplies. The platform features a modern web interface, admin management system, customer portal, payment processing, and calendar integration.

## Core Purpose

The platform serves as a **B2C rental marketplace** where:
- **Customers** can browse, select, and rent equipment for events
- **Admins** can manage inventory, bookings, and customer relationships
- **Business owners** can track bookings and integrate with personal calendars

## Key Features

### 🛒 **Customer-Facing Features**
- **Product Catalog**: Browse available rental equipment with images, descriptions, and pricing
- **Interactive Calendar**: Select rental dates with availability checking
- **Shopping Cart**: Add multiple items with different rental periods
- **Customer Portal**: User registration, login, and booking management
- **Payment Processing**: Stripe integration for secure payments
- **Responsive Design**: Modern UI built with Tailwind CSS

### 🔧 **Admin Management System**
- **Dashboard**: Overview of bookings, revenue, and system status
- **Product Management**: Add, edit, and manage rental equipment
- **Booking Management**: View, edit, and track all customer bookings
- **Customer Management**: View customer accounts and booking history
- **Upsell Products**: Manage add-on products (accessories, consumables)
- **Email System**: Send newsletters, order confirmations, and notifications
- **Calendar Integration**: Sync bookings with Outlook/Google Calendar

### 💰 **Payment & Business Logic**
- **Upfront Payment Model**: 
  - Customer pays full amount (rental + deposit + delivery) upfront
  - Deposit is refundable after equipment return in good condition
- **Dynamic Pricing**: Daily rates, weekend rates, deposit calculations
- **Delivery Options**: Pickup or delivery with real-time pricing updates
- **Stripe Integration**: Secure payment processing with webhooks
- **Real-time Pricing**: Dynamic price calculation and display on checkout

### 📅 **Calendar & Integration**
- **ICS Feed**: Automatic calendar sync for Outlook/Google Calendar
- **Booking Status Tracking**: PENDING → DEPOSIT_PAID → OUT_FOR_DELIVERY → RETURNED_GOOD → FULLY_PAID
- **Admin Calendar View**: Visual overview of all bookings
- **Real-time Updates**: Calendar automatically updates when bookings change

## Technical Architecture

### **Backend (Flask)**
- **Framework**: Flask with SQLAlchemy ORM
- **Database**: MySQL (production) / SQLite (development)
- **Authentication**: Flask-Login with separate admin/customer systems
- **Payment**: Stripe API integration
- **Email**: Flask-Mail with SMTP support

### **Frontend**
- **Styling**: Tailwind CSS for modern, responsive design
- **JavaScript**: Vanilla JS with Alpine.js for interactivity
- **Calendar**: FullCalendar.js for date selection
- **Icons**: Heroicons and custom SVG icons

### **Database Models**
- **Product**: Rental equipment with pricing, images, categories (with soft deletion support)
- **Booking**: Customer orders with items, dates, payment info, bank details for refunds
- **Customer**: User accounts for registered customers (supports guest account creation)
- **User**: Admin accounts for platform management
- **UpsellProduct**: Add-on products and accessories
- **CartItem**: Shopping cart items (user-based or session-based)
- **CartUpsellItem**: Upsell products in shopping cart
- **BookingUpsellItem**: Upsell products in confirmed bookings
- **NewsletterSubscription**: Email newsletter subscriber management

## File Structure

```
app/
├── blueprints/
│   ├── public.py      # Public pages (home, products, about)
│   ├── admin.py       # Admin panel functionality
│   ├── shop.py        # Shopping cart, checkout, payments
│   ├── customer.py    # Customer portal (login, dashboard)
│   ├── calendar.py    # ICS feed generation
│   └── stripe_webhooks.py  # Payment webhook handling
├── models.py          # Database models
├── forms.py           # WTForms for form handling
├── services/
│   ├── pricing.py     # Dynamic pricing calculations
│   └── email_service.py  # Email sending functionality
└── templates/         # Jinja2 templates
    ├── public/        # Customer-facing pages
    ├── admin/         # Admin panel pages
    ├── customer/      # Customer portal pages
    └── emails/        # Email templates
```

## Current Status

### ✅ **Completed Features (100%)**
- Full rental booking system with calendar selection
- Customer registration and authentication
- Admin panel with comprehensive management tools
- Stripe payment processing with upfront payment model
- Email system (welcome, confirmations, newsletters)
- Calendar integration with ICS feed
- Upsell product management
- Soft delete functionality for bookings
- Modern responsive UI/UX
- **Dynamic delivery pricing system with real-time updates**
- **Consistent pricing display across cart, checkout, and order confirmation**
- **Improved admin panel with responsive design and proper modal functionality**
- **Complete newsletter subscription system with CSRF protection and email notifications**
- **Guest checkout flow with automatic account creation and profile completion**
- **Bank account collection for deposit refunds**
- **Updated booking status workflow (Active/Completed tabs)**
- **Universal upsell product integration across all booking views**
- **Product soft deletion with integrity preservation**

### ⚠️ **Pending Items**
- **Production Deployment**: Domain setup and SSL configuration
- **Client Domain Details**: Needed for final production setup

### 🔧 **Recent Improvements (Latest Session - September 2025)**
- **Newsletter Subscription System**: Complete implementation with CSRF protection, email notifications, and smooth UX
- **Guest Checkout Flow**: Automatic account creation for non-registered users with profile completion
- **Bank Account Collection**: Added fields for customer bank details to facilitate deposit refunds
- **Booking Status Workflow**: Updated admin booking management with Active/Completed tabs and refined status options
- **Universal Upsell Integration**: Fixed upsell products display across order confirmation, invoices, customer bookings, and admin panel
- **Product Management**: Implemented soft deletion with data integrity preservation for products with booking history
- **Email System**: Configured Brevo SMTP and implemented welcome emails for newsletter subscriptions
- **Site Rebranding**: Complete rebrand from "Festudlej" to "HighendEvent" across all templates and communications
- **Logo Implementation**: Integrated provided logo1.png across website, emails, and favicon

## Business Model

### **Revenue Streams**
1. **Equipment Rental**: Daily/weekend rates for equipment
2. **Delivery Fees**: Additional charges for delivery service
3. **Deposits**: Security deposits (refundable after return)
4. **Upsell Products**: Accessories and consumables

### **Payment Flow**
1. Customer selects equipment and dates
2. Chooses delivery option (pickup or delivery with real-time pricing)
3. Pays full amount (rental + deposit + delivery) upfront via Stripe
4. Equipment is delivered/collected
5. After return, deposit is refunded (minus any damage fees)

## Development Notes

### **Key Design Decisions**
- **User-based vs Session-based Cart**: Hybrid approach supporting both
- **Soft Delete**: Bookings can be deleted with reason tracking
- **Status-based Workflow**: Clear booking progression states
- **Calendar Integration**: ICS feed for external calendar sync
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Real-time Pricing**: Dynamic updates without page refresh
- **Consistent UI**: Unified pricing display across all pages
- **Upfront Payment**: Simplified payment model with full payment at booking

### **Database Schema**
- **MySQL in Production**: Using PythonAnywhere credentials
- **Proper Relationships**: Foreign keys and cascading deletes
- **Audit Trail**: Created/updated timestamps, deletion tracking
- **Flexible Pricing**: Support for different rate structures

## Future Enhancements

### **Potential Features**
- **Inventory Management**: Stock tracking and low-stock alerts
- **Customer Reviews**: Rating system for equipment
- **Loyalty Program**: Points and discounts for repeat customers
- **Mobile App**: Native mobile application
- **Analytics Dashboard**: Business intelligence and reporting
- **Multi-location Support**: Multiple rental locations

## Getting Started

### **Development Setup**
1. Clone repository
2. Create virtual environment: `python -m venv venv`
3. Activate environment: `venv\Scripts\activate` (Windows)
4. Install dependencies: `pip install -r requirements.txt`
5. Set up environment variables in `.env`
6. Run application: `python app.py`

### **Production Deployment**
1. Configure email SMTP settings
2. Set up domain and SSL certificate
3. Deploy to PythonAnywhere or similar platform
4. Configure Stripe webhooks for production
5. Set up database migrations

## Technical Implementation Notes

### **Key Recent Fixes & Implementations**
- **Newsletter System**: Implemented with proper CSRF protection, Brevo SMTP integration, and client-side notifications
- **Guest Checkout**: Seamless flow allowing non-registered users to place orders with automatic account creation
- **Profile Completion**: Post-order flow for guests to set passwords and become registered users
- **Bank Details Collection**: Optional bank account fields in checkout for faster deposit refunds
- **Status Management**: Refined booking status workflow with "Betaling afventer" → "Fuldt Betalt" → "Udleveret" → "Returneret" → "Depositum Returneret"
- **Upsell Integration**: Complete integration across cart, checkout, order confirmation, invoices, and admin panels
- **Product Integrity**: Soft deletion system preserving data integrity for products with booking history
- **Email Configuration**: Fully configured Brevo SMTP with welcome emails and status notifications

### **Database Schema Updates**
- Added `account_number` and `registration_number` fields to `Booking` model
- Created `CartUpsellItem` and `BookingUpsellItem` models for upsell product management
- Added `NewsletterSubscription` model for email marketing
- Implemented soft deletion with `is_active` flag for `Product` model
- Added guest account support with `password_hash='GUEST_ACCOUNT_PENDING'` for `Customer` model

## Contact & Support

This platform is designed for **HighendEvent** (formerly Festudlej) - a Danish rental equipment business specializing in high-end event equipment. The system is built to handle the complete rental lifecycle from initial inquiry to final payment and equipment return.

---

**Note**: This is a production-ready rental platform with comprehensive features for managing equipment rentals, customer relationships, and business operations. The codebase is well-structured, documented, and ready for deployment with minimal additional configuration. All major functionality has been implemented and tested, including the complete newsletter system, guest checkout flow, and universal upsell product integration.
