#!/usr/bin/env python3
"""
Migration script to add category_id to upsell_products table.
"""

import sys
import os

def migrate():
    """Add category_id column to upsell_products table."""
    print("\n--- Upsell Product Categories Migration ---")
    print("To add the 'category_id' column to your 'upsell_products' table, please run the following SQL command in your PythonAnywhere MySQL/PostgreSQL console:")
    print("\nSQL Command:")
    print("ALTER TABLE upsell_products ADD COLUMN category_id INT NULL;")
    print("ALTER TABLE upsell_products ADD CONSTRAINT fk_upsell_products_category_id FOREIGN KEY (category_id) REFERENCES categories(id);")
    print("\nAfter running the SQL commands, remember to restart your web application on PythonAnywhere.")
    print("----------------------------------\n")

if __name__ == '__main__':
    migrate()
