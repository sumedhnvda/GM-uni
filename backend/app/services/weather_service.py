import httpx
from app.core.config import settings

class WeatherService:
    def __init__(self):
        self.api_key = settings.WEATHER_API_KEY
        self.base_url = "https://api.openweathermap.org/data/2.5/weather" # Example

    async def get_weather(self, location: str) -> str:
        if not self.api_key:
            return "Weather API Key not configured. Assuming normal seasonal weather."
            
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(self.base_url, params={"q": location, "appid": self.api_key, "units": "metric"})
                if response.status_code == 200:
                    data = response.json()
                    # Summarize weather
                    main = data.get('weather', [{}])[0].get('main', 'Unknown')
                    desc = data.get('weather', [{}])[0].get('description', 'Unknown')
                    temp = data.get('main', {}).get('temp', 'Unknown')
                    return f"Current Weather: {main} ({desc}), Temperature: {temp}C"
                else:
                    return f"Could not fetch weather: {response.status_code}"
        except Exception as e:
            return f"Error fetching weather: {str(e)}"

weather_service = WeatherService()
