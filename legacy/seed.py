"""Seed database with sample data."""

import os
from datetime import date, datetime, timedelta
from decimal import Decimal

from app import create_app, db
from app.models import (
    User, Category, Product, ProductImage, Booking, BookingItem, 
    BookingStatus, BlackoutDate, DeliverySetting, CMSBlock, UserRole
)

def create_sample_data():
    """Create sample data for development."""
    
    # Create admin user
    admin_user = User(
        email='admin@festudlej.dk',
        role=UserRole.ADMIN,
        is_active=True
    )
    admin_user.set_password('admin123')
    db.session.add(admin_user)
    
    # Create staff user
    staff_user = User(
        email='staff@festudlej.dk',
        role=UserRole.STAFF,
        is_active=True
    )
    staff_user.set_password('staff123')
    db.session.add(staff_user)
    
    # Create categories
    categories = [
        Category(
            name='Slush Ice Maskiner',
            slug='slush-ice-maskiner',
            description='Professionelle slush ice maskiner til fester og events',
            sort_order=1
        ),
        Category(
            name='Popcorn Maskiner',
            slug='popcorn-maskiner',
            description='Popcorn maskiner til fester og events',
            sort_order=2
        ),
        Category(
            name='Springkasteller',
            slug='hoppeborg',
            description='Springkasteller og bouncy castles til børn',
            sort_order=3
        ),
        Category(
            name='Event Udstyr',
            slug='event-udstyr',
            description='Diverse event udstyr og tilbehør',
            sort_order=4
        )
    ]
    
    for category in categories:
        db.session.add(category)
    
    db.session.flush()  # Get category IDs
    
    # Create products
    products = [
        Product(
            name='Slush Ice Maskine - 2 Tank',
            slug='slush-ice-maskine-2-tank',
            category_id=categories[0].id,
            description='Professionel slush ice maskine med 2 tanke. Perfekt til fester og events. Kan lave 2 forskellige smage samtidig.',
            daily_price_dkk=Decimal('299.00'),
            weekend_price_dkk=Decimal('399.00'),
            deposit_dkk=Decimal('500.00'),
            stock_qty=3,
            prep_buffer_days=1,
            cleanup_buffer_days=1,
            hero_image_url='https://via.placeholder.com/600x400/4F46E5/FFFFFF?text=Slush+Ice+Maskine',
            is_active=True
        ),
        Product(
            name='Popcorn Maskine - 8 Oz',
            slug='popcorn-maskine-8-oz',
            category_id=categories[1].id,
            description='Professionel popcorn maskine med 8 oz kapacitet. Inkluderer popcorn kerner og smagsstoffer.',
            daily_price_dkk=Decimal('199.00'),
            weekend_price_dkk=Decimal('249.00'),
            deposit_dkk=Decimal('300.00'),
            stock_qty=2,
            prep_buffer_days=0,
            cleanup_buffer_days=0,
            hero_image_url='https://via.placeholder.com/600x400/10B981/FFFFFF?text=Popcorn+Maskine',
            is_active=True
        ),
        Product(
            name='Springkastel - Prinsesse',
            slug='springkastel-prinsesse',
            category_id=categories[2].id,
            description='Børnevenligt springkastel med prinsesse tema. Sikker og sjov for børn op til 8 år.',
            daily_price_dkk=Decimal('399.00'),
            weekend_price_dkk=Decimal('499.00'),
            deposit_dkk=Decimal('800.00'),
            stock_qty=1,
            prep_buffer_days=1,
            cleanup_buffer_days=1,
            hero_image_url='https://via.placeholder.com/600x400/EC4899/FFFFFF?text=Springkastel+Prinsesse',
            is_active=True
        ),
        Product(
            name='Springkastel - Superhelt',
            slug='springkastel-superhelt',
            category_id=categories[2].id,
            description='Action-fyldt springkastel med superhelt tema. Perfekt til børnefødselsdage.',
            daily_price_dkk=Decimal('399.00'),
            weekend_price_dkk=Decimal('499.00'),
            deposit_dkk=Decimal('800.00'),
            stock_qty=1,
            prep_buffer_days=1,
            cleanup_buffer_days=1,
            hero_image_url='https://via.placeholder.com/600x400/F59E0B/FFFFFF?text=Springkastel+Superhelt',
            is_active=True
        ),
        Product(
            name='Candy Floss Maskine',
            slug='candy-floss-maskine',
            category_id=categories[3].id,
            description='Professionel candy floss maskine til fester. Inkluderer sukker og pinde.',
            daily_price_dkk=Decimal('149.00'),
            weekend_price_dkk=Decimal('199.00'),
            deposit_dkk=Decimal('200.00'),
            stock_qty=2,
            prep_buffer_days=0,
            cleanup_buffer_days=0,
            hero_image_url='https://via.placeholder.com/600x400/8B5CF6/FFFFFF?text=Candy+Floss+Maskine',
            is_active=True
        )
    ]
    
    for product in products:
        db.session.add(product)
    
    db.session.flush()  # Get product IDs
    
    # Create product images
    product_images = [
        # Slush Ice Machine images
        ProductImage(product_id=products[0].id, url='https://via.placeholder.com/400x300/4F46E5/FFFFFF?text=Slush+1', alt='Slush Ice Maskine - Front', sort_order=1),
        ProductImage(product_id=products[0].id, url='https://via.placeholder.com/400x300/4F46E5/FFFFFF?text=Slush+2', alt='Slush Ice Maskine - Side', sort_order=2),
        ProductImage(product_id=products[0].id, url='https://via.placeholder.com/400x300/4F46E5/FFFFFF?text=Slush+3', alt='Slush Ice Maskine - Kontrolpanel', sort_order=3),
        
        # Popcorn Machine images
        ProductImage(product_id=products[1].id, url='https://via.placeholder.com/400x300/10B981/FFFFFF?text=Popcorn+1', alt='Popcorn Maskine - Front', sort_order=1),
        ProductImage(product_id=products[1].id, url='https://via.placeholder.com/400x300/10B981/FFFFFF?text=Popcorn+2', alt='Popcorn Maskine - Side', sort_order=2),
        
        # Princess Bouncy Castle images
        ProductImage(product_id=products[2].id, url='https://via.placeholder.com/400x300/EC4899/FFFFFF?text=Prinsesse+1', alt='Springkastel Prinsesse - Front', sort_order=1),
        ProductImage(product_id=products[2].id, url='https://via.placeholder.com/400x300/EC4899/FFFFFF?text=Prinsesse+2', alt='Springkastel Prinsesse - Inde', sort_order=2),
        
        # Superhero Bouncy Castle images
        ProductImage(product_id=products[3].id, url='https://via.placeholder.com/400x300/F59E0B/FFFFFF?text=Superhelt+1', alt='Springkastel Superhelt - Front', sort_order=1),
        ProductImage(product_id=products[3].id, url='https://via.placeholder.com/400x300/F59E0B/FFFFFF?text=Superhelt+2', alt='Springkastel Superhelt - Inde', sort_order=2),
        
        # Candy Floss Machine images
        ProductImage(product_id=products[4].id, url='https://via.placeholder.com/400x300/8B5CF6/FFFFFF?text=Candy+1', alt='Candy Floss Maskine - Front', sort_order=1),
        ProductImage(product_id=products[4].id, url='https://via.placeholder.com/400x300/8B5CF6/FFFFFF?text=Candy+2', alt='Candy Floss Maskine - I brug', sort_order=2),
    ]
    
    for image in product_images:
        db.session.add(image)
    
    # Create delivery settings
    delivery_settings = [
        DeliverySetting(
            type='pickup',
            base_fee_dkk=Decimal('0.00'),
            per_km_fee_dkk=Decimal('0.00'),
            notes='Gratis afhentning i vores lokaler',
            is_active=True
        ),
        DeliverySetting(
            type='delivery',
            base_fee_dkk=Decimal('150.00'),
            per_km_fee_dkk=Decimal('5.00'),
            notes='Levering inden for 20 km radius',
            is_active=True
        )
    ]
    
    for setting in delivery_settings:
        db.session.add(setting)
    
    # Create CMS blocks
    cms_blocks = [
        CMSBlock(
            key='homepage_hero',
            title='Velkommen til Festudlej',
            content_md='''# Velkommen til Festudlej

Vi lejer ud professionelt udstyr til fester og events. Fra slush ice maskiner til hoppeborg - vi har alt hvad du behøver til at gøre din fest til en succes!

**Hvorfor vælge os?**
- Professionelt udstyr af høj kvalitet
- Hurtig levering og oprydning
- Konkurrencedygtige priser
- Erfarne medarbejdere

[Se vores udstyr](/catalog) eller [kontakt os](/kontakt) for en uforpligtende tilbud.''',
            is_active=True
        ),
        CMSBlock(
            key='about_us',
            title='Om Festudlej',
            content_md='''# Om Festudlej

Festudlej er din pålidelige partner når det gælder udlejning af professionelt udstyr til fester og events. Vi har over 10 års erfaring i branchen og har hjulpet tusindvis af kunder med at skabe uforglemmelige oplevelser.

**Vores mission:**
At gøre det nemt og sikkert at leje professionelt udstyr til fester og events.

**Vores værdier:**
- Kvalitet i alt vi gør
- Service med et smil
- Pålidelighed og punktlighed
- Fair priser og transparente vilkår''',
            is_active=True
        ),
        CMSBlock(
            key='contact_info',
            title='Kontaktoplysninger',
            content_md='''# Kontakt os

**Festudlej ApS**
Adresse: Eventvej 123, 2100 København Ø
Telefon: +45 12 34 56 78
E-mail: info@festudlej.dk

**Åbningstider:**
Mandag - Fredag: 09:00 - 18:00
Lørdag: 10:00 - 16:00
Søndag: Lukket

**Levering:**
Vi leverer inden for 20 km radius af København.
Leveringsgebyr: 150 DKK + 5 DKK per km''',
            is_active=True
        ),
        CMSBlock(
            key='terms_conditions',
            title='Lejebetingelser',
            content_md='''# Lejebetingelser

## 1. Generelt
Disse lejebetingelser gælder for alle udlejninger fra Festudlej ApS.

## 2. Booking og betaling
- Booking bekræftes ved betaling
- Fuld betaling skal ske før levering/afhentning
- Depositum kræves for alle udlejninger

## 3. Levering og afhentning
- Levering og afhentning sker i aftalt tidsrum
- Kunde skal være til stede ved levering/afhentning
- Forsinkelser kan medføre ekstra gebyr

## 4. Ansvarsforhold
- Kunde er ansvarlig for udstyr under lejeperioden
- Skader på udstyr debiteres kunden
- Depositum tilbagebetales efter returnering i god stand

## 5. Annullering
- Annullering mere end 48 timer før levering: 100% refusion
- Annullering 24-48 timer før levering: 50% refusion
- Annullering mindre end 24 timer før levering: Ingen refusion''',
            is_active=True
        ),
        CMSBlock(
            key='faq',
            title='Ofte stillede spørgsmål',
            content_md='''# Ofte stillede spørgsmål

## Hvordan booker jeg udstyr?
1. Vælg det udstyr du ønsker at leje
2. Vælg datoer og antal
3. Gennemfør checkout
4. Modtag bekræftelse på e-mail

## Hvornår leveres udstyr?
Vi leverer normalt mellem 09:00-18:00 på hverdage og 10:00-16:00 på lørdage.

## Hvad koster levering?
Levering koster 150 DKK + 5 DKK per km inden for 20 km radius.

## Hvad hvis udstyret går i stykker?
Kontakt os straks. Vi har erstatningsudstyr klar til hurtig levering.

## Kan jeg annullere min booking?
Ja, se vores annulleringspolitik i lejebetingelserne.''',
            is_active=True
        )
    ]
    
    for block in cms_blocks:
        db.session.add(block)
    
    # Create sample bookings
    today = date.today()
    
    # Create a booking for next week
    booking1 = Booking(
        booking_no='20241201-ABC1',
        customer_name='Lars Nielsen',
        email='lars@example.com',
        phone='+45 12 34 56 78',
        address='Hovedgade 123',
        zip_code='2100',
        city='København Ø',
        start_date=today + timedelta(days=7),
        end_date=today + timedelta(days=7),
        subtotal_dkk=Decimal('299.00'),
        vat_dkk=Decimal('74.75'),
        deposit_dkk=Decimal('500.00'),
        delivery_fee_dkk=Decimal('0.00'),
        total_dkk=Decimal('873.75'),
        status=BookingStatus.PAID,
        notes='Fødselsdagsfest for 8-årige'
    )
    db.session.add(booking1)
    db.session.flush()
    
    # Add booking item
    booking_item1 = BookingItem(
        booking_id=booking1.id,
        product_id=products[0].id,  # Slush Ice Machine
        quantity=1,
        unit_price_dkk=Decimal('299.00'),
        name_snapshot='Slush Ice Maskine - 2 Tank'
    )
    db.session.add(booking_item1)
    
    # Create another booking for the weekend
    booking2 = Booking(
        booking_no='20241201-DEF2',
        customer_name='Maria Hansen',
        email='maria@example.com',
        phone='+45 98 76 54 32',
        address='Sidevej 456',
        zip_code='2200',
        city='København N',
        start_date=today + timedelta(days=14),
        end_date=today + timedelta(days=14),
        subtotal_dkk=Decimal('399.00'),
        vat_dkk=Decimal('99.75'),
        deposit_dkk=Decimal('800.00'),
        delivery_fee_dkk=Decimal('150.00'),
        total_dkk=Decimal('1448.75'),
        status=BookingStatus.PENDING,
        notes='Børnefødselsdag - weekend'
    )
    db.session.add(booking2)
    db.session.flush()
    
    # Add booking item
    booking_item2 = BookingItem(
        booking_id=booking2.id,
        product_id=products[2].id,  # Princess Bouncy Castle
        quantity=1,
        unit_price_dkk=Decimal('399.00'),
        name_snapshot='Springkastel - Prinsesse'
    )
    db.session.add(booking_item2)
    
    # Create a blackout date for maintenance
    blackout_date = BlackoutDate(
        product_id=products[0].id,  # Slush Ice Machine
        start_date=today + timedelta(days=21),
        end_date=today + timedelta(days=21),
        reason='Årlig vedligeholdelse'
    )
    db.session.add(blackout_date)
    
    # Commit all changes
    db.session.commit()
    
    print("Sample data created successfully!")
    print(f"Admin user: admin@festudlej.dk / admin123")
    print(f"Staff user: staff@festudlej.dk / staff123")
    print(f"Created {len(categories)} categories")
    print(f"Created {len(products)} products")
    print(f"Created {len(product_images)} product images")
    print(f"Created {len(delivery_settings)} delivery settings")
    print(f"Created {len(cms_blocks)} CMS blocks")
    print(f"Created 2 sample bookings")
    print(f"Created 1 blackout date")


if __name__ == '__main__':
    app = create_app()
    with app.app_context():
        db.create_all()
        create_sample_data()

