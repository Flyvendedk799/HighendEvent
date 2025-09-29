#!/usr/bin/env python3
"""
WSGI Configuration for PythonAnywhere Deployment
"""

import sys
import os

# Add your project directory to the Python path
# Update this path to match your PythonAnywhere directory
path = '/home/TobiasMastek/festudlej'
if path not in sys.path:
    sys.path.insert(0, path)

# Set environment variables for production
os.environ['FLASK_ENV'] = 'production'

# Import and create the Flask application
from app import create_app

application = create_app()

if __name__ == "__main__":
    application.run()