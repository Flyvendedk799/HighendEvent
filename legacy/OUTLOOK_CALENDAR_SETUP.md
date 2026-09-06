# Outlook Calendar Integration Setup Guide

## Overview
Your Festudlej booking system now includes an ICS calendar feed that automatically syncs with Microsoft Outlook. This allows you to see all confirmed bookings directly in your personal Outlook calendar.

## Features
- ✅ **Only shows confirmed bookings** (deposit paid or fully paid)
- ✅ **Automatic updates** when bookings change status
- ✅ **Automatic removal** when bookings are cancelled
- ✅ **Detailed booking information** including customer details
- ✅ **Delivery vs Pickup indicators**
- ✅ **Real-time synchronization**

## Setup Instructions

### Step 1: Get Your Calendar Feed URL
1. Log into your admin panel
2. Go to **Calendar Management**
3. Copy the feed URL: `https://yourdomain.com/calendar/feed.ics`

### Step 2: Add to Microsoft Outlook

#### For Outlook Desktop (Windows/Mac):
1. Open Microsoft Outlook
2. Go to **File** → **Account Settings** → **Account Settings**
3. Click on the **Internet Calendars** tab
4. Click **New**
5. Paste your feed URL: `https://yourdomain.com/calendar/feed.ics`
6. Click **Add**
7. Give it a name like "Festudlej Bookings"
8. Click **OK** to save

#### For Outlook Web (outlook.com):
1. Go to [outlook.com](https://outlook.com) and sign in
2. Click on the **Calendar** icon
3. Click **Add calendar** → **From web**
4. Paste your feed URL: `https://yourdomain.com/calendar/feed.ics`
5. Give it a name like "Festudlej Bookings"
6. Click **Import**

#### For Outlook Mobile App:
1. Open the Outlook mobile app
2. Tap the **Calendar** tab
3. Tap the **+** button
4. Select **Add calendar from URL**
5. Paste your feed URL: `https://yourdomain.com/calendar/feed.ics`
6. Give it a name and tap **Add**

## What You'll See in Your Calendar

### Event Details
Each booking appears as a calendar event with:
- **Title**: Product name and customer name
- **Date Range**: Start and end dates of the rental
- **Description**: Complete booking details including:
  - Customer contact information
  - Booking ID and status
  - Total amount
  - Delivery type (Delivery/Pickup)
  - List of rented items
  - Any special notes

### Event Categories
- **📦 Delivery Events**: High priority, blue color
- **📦 Pickup Events**: Normal priority, gray color
- **Categories**: Rental, Equipment, Festudlej

### Status Indicators
Events show the current booking status:
- **Deposit Paid**: Yellow indicator
- **Fully Paid**: Green indicator  
- **Out for Delivery**: Blue indicator
- **Returned (Good)**: Green indicator

## Automatic Updates

### When Events Update:
- ✅ Booking status changes (e.g., deposit paid → fully paid)
- ✅ Customer information changes
- ✅ Booking dates are modified
- ✅ Items are added or removed

### When Events Are Removed:
- ✅ Booking is cancelled
- ✅ Booking is deleted (soft delete)
- ✅ Booking status changes to cancelled

### Update Frequency:
- **Real-time**: Changes appear within minutes
- **Manual refresh**: You can refresh Outlook to force an update
- **Automatic sync**: Outlook checks for updates regularly

## Troubleshooting

### Calendar Not Updating?
1. **Check feed URL**: Make sure it's correct and accessible
2. **Refresh Outlook**: Right-click calendar → Refresh
3. **Check internet connection**: Feed requires internet access
4. **Verify booking status**: Only confirmed bookings appear

### Events Not Appearing?
1. **Check booking status**: Only "Deposit Paid" or "Fully Paid" bookings appear
2. **Check date range**: Events only show for current and future dates
3. **Check feed access**: Ensure the URL is publicly accessible

### Missing Information?
1. **Check booking completeness**: Ensure all required fields are filled
2. **Check product information**: Make sure products have names
3. **Check customer details**: Verify customer information is complete

## Security Notes

### What's Included:
- Customer name and contact information
- Booking details and amounts
- Product information
- Delivery addresses

### What's NOT Included:
- Payment details (card numbers, etc.)
- Internal admin notes
- Deleted bookings
- Pending bookings (not confirmed)

## Advanced Features

### Multiple Calendars
You can create separate calendar feeds for different purposes:
- **All Bookings**: `/calendar/feed.ics` (default)
- **Deliveries Only**: Filter by delivery type
- **Specific Products**: Filter by product category

### Calendar Sharing
You can share the calendar with team members:
1. Share the feed URL with authorized personnel
2. They can add it to their own Outlook
3. Everyone sees the same real-time data

### Integration with Other Calendars
The ICS feed works with any calendar application that supports ICS:
- Google Calendar
- Apple Calendar
- Thunderbird
- Any other ICS-compatible calendar

## Support

If you encounter any issues:
1. Check the **Calendar Management** page in admin
2. Verify the feed URL is accessible
3. Check booking statuses and data completeness
4. Contact support if problems persist

---

**Note**: The calendar feed is automatically generated and updated. No manual intervention is required once set up.

