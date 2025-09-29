"""
Sitemap generation for SEO
"""
from flask import Blueprint, Response, url_for, current_app
from datetime import datetime

bp = Blueprint('sitemap', __name__)

@bp.route('/sitemap.xml')
def sitemap():
    """Generate XML sitemap for search engines."""
    try:
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
        
        # Build XML
        xml_parts = [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
        ]
        
        # Add static pages
        for route, changefreq, priority in static_pages:
            try:
                url = url_for(route, _external=True)
                lastmod = datetime.utcnow().strftime('%Y-%m-%d')
                xml_parts.append(f'''
    <url>
        <loc>{url}</loc>
        <lastmod>{lastmod}</lastmod>
        <changefreq>{changefreq}</changefreq>
        <priority>{priority}</priority>
    </url>''')
            except Exception as e:
                current_app.logger.warning(f'Could not generate URL for route {route}: {e}')
                continue
        
        # Try to add product pages (with error handling)
        try:
            from app.models import Product
            products = Product.query.filter_by(is_active=True).all()
            
            for product in products:
                try:
                    url = url_for('public.product_detail', id=product.id, _external=True)
                    lastmod = product.updated_at.strftime('%Y-%m-%d') if product.updated_at else datetime.utcnow().strftime('%Y-%m-%d')
                    xml_parts.append(f'''
    <url>
        <loc>{url}</loc>
        <lastmod>{lastmod}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
    </url>''')
                except Exception as e:
                    current_app.logger.warning(f'Could not generate URL for product {product.id}: {e}')
                    continue
        except Exception as e:
            current_app.logger.warning(f'Could not load products for sitemap: {e}')
        
        # Try to add category pages (with error handling)
        try:
            from app.models import Category
            categories = Category.query.filter_by(is_active=True).all()
            
            for category in categories:
                try:
                    url = url_for('public.catalog', category=category.slug, _external=True)
                    lastmod = category.updated_at.strftime('%Y-%m-%d') if category.updated_at else datetime.utcnow().strftime('%Y-%m-%d')
                    xml_parts.append(f'''
    <url>
        <loc>{url}</loc>
        <lastmod>{lastmod}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.7</priority>
    </url>''')
                except Exception as e:
                    current_app.logger.warning(f'Could not generate URL for category {category.slug}: {e}')
                    continue
        except Exception as e:
            current_app.logger.warning(f'Could not load categories for sitemap: {e}')
        
        xml_parts.append('</urlset>')
        
        return Response('\n'.join(xml_parts), mimetype='application/xml')
        
    except Exception as e:
        current_app.logger.error(f'Error generating sitemap: {e}')
        # Return a minimal sitemap with just the homepage
        minimal_sitemap = '''<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>https://www.highendevent.dk/</loc>
        <lastmod>''' + datetime.utcnow().strftime('%Y-%m-%d') + '''</lastmod>
        <changefreq>daily</changefreq>
        <priority>1.0</priority>
    </url>
</urlset>'''
        return Response(minimal_sitemap, mimetype='application/xml')

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
