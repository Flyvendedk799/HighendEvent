#!/usr/bin/env python3
"""
WSGI Configuration for PythonAnywhere Deployment
"""

import sys
import os
from dotenv import load_dotenv

# Add your project directory to the Python path
path = '/home/TobiasMastek/festudlej'
if path not in sys.path:
    sys.path.insert(0, path)

# Load environment variables from .env file if it exists
load_dotenv(os.path.join(path, '.env'))

# Set production environment
os.environ['FLASK_ENV'] = 'production'

# Set required environment variables if not already set
if not os.environ.get('SECRET_KEY'):
    os.environ['SECRET_KEY'] = 'highendevent-super-secure-production-key-2025'

if not os.environ.get('DATABASE_URL'):
    os.environ['DATABASE_URL'] = 'mysql://TobiasMastek:Jht89ryu1!@TobiasMastek.mysql.pythonanywhere-services.com/TobiasMastek$HighendEvent'

# Import and create the Flask application
from app import create_app

application = create_app()

if __name__ == "__main__":
    application.run()