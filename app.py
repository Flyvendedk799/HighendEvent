"""Main application entry point."""

import os
from dotenv import load_dotenv

# Force load environment variables
load_dotenv()

# Only force local database URL if we're in development
if os.environ.get('FLASK_ENV') != 'production':
    os.environ['DATABASE_URL'] = 'sqlite:///C:/Users/tobia/Desktop/Festudlej/instance/app.db'

from app import create_app
from app.config import Config

app = create_app(Config)

# Double-check the configuration (only in development)
if os.environ.get('FLASK_ENV') != 'production':
    print(f"Database URI: {app.config.get('SQLALCHEMY_DATABASE_URI')}")

if __name__ == '__main__':
    app.run(debug=True)
