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

from app import create_app

application = create_app()

if __name__ == '__main__':
    application.run()
