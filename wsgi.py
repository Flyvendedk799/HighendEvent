#!/usr/bin/env python3
"""
WSGI entry for PythonAnywhere (and other hosts).

Uses this file's directory as the project root so you never need a machine-specific
path in git—avoids merge conflicts when pulling on the server.
"""

import os
import sys

from dotenv import load_dotenv

path = os.path.dirname(os.path.abspath(__file__))
if path not in sys.path:
    sys.path.insert(0, path)

load_dotenv(os.path.join(path, '.env'))

os.environ['FLASK_ENV'] = 'production'

# Required in production: set SECRET_KEY and DATABASE_URL in PythonAnywhere
# environment or in a .env file next to this repo (never commit real secrets).

# Fail loudly rather than let config.py fall back to sqlite:///instance/app.db, which would
# serve an empty site against a brand-new database while the real MySQL data sits untouched.
if not os.environ.get('DATABASE_URL'):
    raise RuntimeError(
        f"DATABASE_URL is not set. Expected it in {os.path.join(path, '.env')}. "
        "Refusing to start on the SQLite fallback, which would look like total data loss."
    )

from app import create_app
from werkzeug.middleware.proxy_fix import ProxyFix

application = create_app()


class CanonicalHost:
    """301 `www.<host>` -> `<host>` (path + query kept).

    The site was reachable as both www.highendevent.dk and highendevent.dk on
    PythonAnywhere; ServerHoster routes both hostnames to this process, so the
    app itself picks the canonical apex (one host for cookies, SEO and Stripe
    return URLs). Set CANONICAL_WWW_REDIRECT=0 to disable.
    """

    def __init__(self, app):
        self.app = app
        self.enabled = os.environ.get('CANONICAL_WWW_REDIRECT', '1') not in ('0', 'false', 'no')

    def __call__(self, environ, start_response):
        host = (environ.get('HTTP_HOST') or '').lower()
        if self.enabled and host.startswith('www.'):
            from werkzeug.wsgi import get_current_url
            target = get_current_url(environ).replace('://' + host, '://' + host[4:], 1)
            start_response('301 Moved Permanently', [('Location', target), ('Content-Length', '0')])
            return [b'']
        return self.app(environ, start_response)


# ServerHoster runs this app on localhost behind Cloudflare's tunnel, which
# terminates TLS and forwards X-Forwarded-Proto/For/Host. Trust one proxy hop so
# url_for(_external=True) (Stripe success/cancel URLs, email links, sitemap)
# builds https:// URLs on the public host and request.remote_addr is the real
# client IP. PythonAnywhere did the equivalent at its nginx layer. ProxyFix runs
# first so CanonicalHost sees the real scheme/host.
application.wsgi_app = ProxyFix(
    CanonicalHost(application.wsgi_app), x_for=1, x_proto=1, x_host=1, x_port=1
)

if __name__ == '__main__':
    application.run()
