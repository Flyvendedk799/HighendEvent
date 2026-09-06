"""Distance calculation service for delivery pricing."""

import math
import requests
from typing import Optional, Tuple
from flask import current_app


class DistanceService:
    """Service for calculating distances between locations."""
    
    @staticmethod
    def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """
        Calculate the great circle distance between two points on Earth.
        
        Args:
            lat1, lon1: Latitude and longitude of first point in decimal degrees
            lat2, lon2: Latitude and longitude of second point in decimal degrees
            
        Returns:
            Distance in kilometers
        """
        # Convert decimal degrees to radians
        lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
        
        # Haversine formula
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.asin(math.sqrt(a))
        
        # Radius of earth in kilometers
        r = 6371
        
        return c * r
    
    @staticmethod
    def geocode_address(address: str, zip_code: str, city: str) -> Optional[Tuple[float, float]]:
        """
        Geocode an address to get latitude and longitude coordinates.
        
        Args:
            address: Street address
            zip_code: Postal code
            city: City name
            
        Returns:
            Tuple of (latitude, longitude) or None if geocoding fails
        """
        try:
            # Use a free geocoding service (you might want to use Google Maps API for production)
            full_address = f"{address}, {zip_code} {city}, Denmark"
            
            # Using Nominatim (OpenStreetMap) - free but has rate limits
            url = "https://nominatim.openstreetmap.org/search"
            params = {
                'q': full_address,
                'format': 'json',
                'limit': 1,
                'countrycodes': 'dk'
            }
            
            headers = {
                'User-Agent': 'HighendEvent/1.0'  # Required by Nominatim
            }
            
            response = requests.get(url, params=params, headers=headers, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            if data and len(data) > 0:
                lat = float(data[0]['lat'])
                lon = float(data[0]['lon'])
                return (lat, lon)
            
        except Exception as e:
            current_app.logger.warning(f"Geocoding failed for {full_address}: {e}")
        
        return None
    
    @staticmethod
    def calculate_delivery_distance(
        company_lat: float, 
        company_lon: float, 
        customer_address: str, 
        customer_zip: str, 
        customer_city: str
    ) -> Optional[float]:
        """
        Calculate delivery distance from company location to customer address.
        
        Args:
            company_lat, company_lon: Company location coordinates
            customer_address, customer_zip, customer_city: Customer address details
            
        Returns:
            Distance in kilometers or None if calculation fails
        """
        # Geocode customer address
        customer_coords = DistanceService.geocode_address(
            customer_address, customer_zip, customer_city
        )
        
        if not customer_coords:
            return None
        
        customer_lat, customer_lon = customer_coords
        
        # Calculate distance
        distance = DistanceService.haversine_distance(
            company_lat, company_lon, customer_lat, customer_lon
        )
        
        return round(distance, 1)  # Round to 1 decimal place
    
    @staticmethod
    def calculate_delivery_fee(
        distance_km: float,
        base_fee: float,
        per_km_fee: float,
        free_delivery_km: int = 0,
        max_delivery_km: Optional[int] = None
    ) -> Tuple[float, str]:
        """
        Calculate delivery fee based on distance and pricing rules.
        
        Args:
            distance_km: Distance in kilometers
            base_fee: Base delivery fee
            per_km_fee: Fee per kilometer
            free_delivery_km: Free delivery within this distance
            max_delivery_km: Maximum delivery distance (None for unlimited)
            
        Returns:
            Tuple of (total_fee, explanation)
        """
        # Check if delivery is within maximum distance
        if max_delivery_km and distance_km > max_delivery_km:
            return (0.0, f"Levering ikke mulig - afstand {distance_km} km overstiger maksimal {max_delivery_km} km")
        
        # Check if delivery is free
        if distance_km <= free_delivery_km:
            return (0.0, f"Gratis levering - inden for {free_delivery_km} km")
        
        # Calculate fee
        chargeable_km = max(0, distance_km - free_delivery_km)
        total_fee = base_fee + (chargeable_km * per_km_fee)
        
        explanation = f"Basisgebyr: {base_fee:.2f} DKK"
        if chargeable_km > 0:
            explanation += f" + {chargeable_km:.1f} km × {per_km_fee:.2f} DKK = {total_fee:.2f} DKK"
        
        return (total_fee, explanation)
