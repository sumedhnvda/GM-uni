import httpx
from typing import Optional, Tuple
import re

class GeocodingService:
    """Service for reverse geocoding coordinates to place names using Nominatim."""
    
    def __init__(self):
        self.base_url = "https://nominatim.openstreetmap.org/reverse"
        self.headers = {
            "User-Agent": "Cropic/1.0 (Agricultural App)"
        }
    
    def is_coordinates(self, location: str) -> Optional[Tuple[float, float]]:
        """Check if the location string looks like coordinates and return them."""
        # Match patterns like "12.3456, 78.9012" or "12.3456,78.9012"
        pattern = r'^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$'
        match = re.match(pattern, location.strip())
        if match:
            try:
                lat = float(match.group(1))
                lon = float(match.group(2))
                if -90 <= lat <= 90 and -180 <= lon <= 180:
                    return (lat, lon)
            except ValueError:
                pass
        return None
    
    async def reverse_geocode(self, lat: float, lon: float) -> str:
        """Convert coordinates to a human-readable place name."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    self.base_url,
                    params={
                        "lat": lat,
                        "lon": lon,
                        "format": "json",
                        "zoom": 10,  # City level
                        "addressdetails": 1
                    },
                    headers=self.headers,
                    timeout=10.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    address = data.get("address", {})
                    
                    # Build a readable address
                    parts = []
                    if address.get("city"):
                        parts.append(address["city"])
                    elif address.get("town"):
                        parts.append(address["town"])
                    elif address.get("village"):
                        parts.append(address["village"])
                    elif address.get("county"):
                        parts.append(address["county"])
                    
                    if address.get("state"):
                        parts.append(address["state"])
                    
                    if address.get("country"):
                        parts.append(address["country"])
                    
                    if parts:
                        return ", ".join(parts)
                    
                    # Fallback to display_name
                    return data.get("display_name", f"{lat}, {lon}")
        except Exception as e:
            print(f"Geocoding error: {e}")
        
        return f"{lat}, {lon}"  # Return original coordinates on error
    
    async def resolve_location(self, location: str) -> str:
        """Resolve a location string, converting coordinates to place names if needed."""
        coords = self.is_coordinates(location)
        if coords:
            return await self.reverse_geocode(coords[0], coords[1])
        return location

geocoding_service = GeocodingService()
