"""
Sitemap generation for SEO
"""
from flask import Blueprint, Response, url_for
from app.models import Product, Category
from datetime import datetime

bp = Blueprint('sitemap', __name__)

@bp.route('/sitemap.xml')
def sitemap():
    """Generate XML sitemap for search engines."""
    
    # Static pages
    static_pages = [
        ('public.index', 'daily', 1.0),
        ('public.catalog', 'daily', 0.9),
        ('public.about', 'monthly', 0.7),
        ('public.contact', 'monthly', 0.8),
        ('public.faq', 'monthly', 0.6),
        ('public.terms', 'yearly', 0.3),
        ('public.calendar', 'daily', 0.8),
    ]
    
    # Get all active products
    products = Product.query.filter_by(is_active=True).all()
    
    # Get all active categories
    categories = Category.query.filter_by(is_active=True).all()
    
    # Build XML
    xml_parts = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
    ]
    
    # Add static pages
    for route, changefreq, priority in static_pages:
        url = url_for(route, _external=True)
        lastmod = datetime.utcnow().strftime('%Y-%m-%d')
        xml_parts.append(f'''
    <url>
        <loc>{url}</loc>
        <lastmod>{lastmod}</lastmod>
        <changefreq>{changefreq}</changefreq>
        <priority>{priority}</priority>
    </url>''')
    
    # Add product pages
    for product in products:
        url = url_for('public.product_detail', id=product.id, _external=True)
        lastmod = product.updated_at.strftime('%Y-%m-%d') if product.updated_at else datetime.utcnow().strftime('%Y-%m-%d')
        xml_parts.append(f'''
    <url>
        <loc>{url}</loc>
        <lastmod>{lastmod}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
    </url>''')
    
    # Add category pages
    for category in categories:
        url = url_for('public.catalog', category=category.slug, _external=True)
        lastmod = category.updated_at.strftime('%Y-%m-%d') if category.updated_at else datetime.utcnow().strftime('%Y-%m-%d')
        xml_parts.append(f'''
    <url>
        <loc>{url}</loc>
        <lastmod>{lastmod}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.7</priority>
    </url>''')
    
    xml_parts.append('</urlset>')
    
    return Response('\n'.join(xml_parts), mimetype='application/xml')

@bp.route('/robots.txt')
def robots():
    """Generate robots.txt file."""
    robots_content = f"""User-agent: *
Allow: /

# Sitemap
Sitemap: {url_for('sitemap.sitemap', _external=True)}

# Disallow admin and private areas
Disallow: /admin/
Disallow: /customer/
Disallow: /api/
Disallow: /stripe/
"""
    return Response(robots_content, mimetype='text/plain')
