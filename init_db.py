"""Initialize database with tables and sample data."""

from app import create_app, db
from app.models import *

def init_database():
    """Initialize database with tables and sample data."""
    app = create_app()
    
    with app.app_context():
        # Create all tables
        print("Creating database tables...")
        db.create_all()
        print("Database tables created successfully!")
        
        # Check if data already exists
        if User.query.first():
            print("Database already has data. Skipping seed data.")
            return
        
        print("Adding sample data...")
        
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
                slug='springkasteller',
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
                daily_price_dkk=299.00,
                weekend_price_dkk=399.00,
                deposit_dkk=500.00,
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
                daily_price_dkk=199.00,
                weekend_price_dkk=249.00,
                deposit_dkk=300.00,
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
                daily_price_dkk=399.00,
                weekend_price_dkk=499.00,
                deposit_dkk=800.00,
                stock_qty=1,
                prep_buffer_days=1,
                cleanup_buffer_days=1,
                hero_image_url='https://via.placeholder.com/600x400/EC4899/FFFFFF?text=Springkastel+Prinsesse',
                is_active=True
            )
        ]
        
        for product in products:
            db.session.add(product)
        
        # Create delivery settings
        delivery_settings = [
            DeliverySetting(
                type=DeliveryType.PICKUP,
                base_fee_dkk=0.00,
                per_km_fee_dkk=0.00,
                notes='Gratis afhentning i vores lokaler',
                is_active=True
            ),
            DeliverySetting(
                type=DeliveryType.DELIVERY,
                base_fee_dkk=150.00,
                per_km_fee_dkk=5.00,
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

Vi lejer ud professionelt udstyr til fester og events. Fra slush ice maskiner til springkasteller - vi har alt hvad du behøver til at gøre din fest til en succes!

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

Festudlej er din pålidelige partner når det gælder udlejning af professionelt udstyr til fester og events. Vi har over 10 års erfaring i branchen og har hjulpet tusindvis af kunder med at skabe uforglemmelige oplevelser.''',
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
Søndag: Lukket''',
                is_active=True
            )
        ]
        
        for block in cms_blocks:
            db.session.add(block)
        
        # Commit all changes
        db.session.commit()
        
        print("Sample data created successfully!")
        print(f"Admin user: admin@festudlej.dk / admin123")
        print(f"Staff user: staff@festudlej.dk / staff123")
        print(f"Created {len(categories)} categories")
        print(f"Created {len(products)} products")
        print(f"Created {len(delivery_settings)} delivery settings")
        print(f"Created {len(cms_blocks)} CMS blocks")

if __name__ == '__main__':
    init_database()



