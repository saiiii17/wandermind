"""
Weather data using Open-Meteo (free, no API key, global) as primary.
OpenWeatherMap as enhanced option when key is available.
Works for any city in the world.
"""
import os
import httpx

OPENWEATHER_KEY = os.getenv("OPENWEATHER_API_KEY", "")
GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search"
FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
CLIMATE_URL = "https://climate-api.open-meteo.com/v1/climate"
OWM_URL = "https://api.openweathermap.org/data/2.5"

WMO_CODES = {
    0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
    45: "Foggy", 48: "Freezing fog",
    51: "Light drizzle", 53: "Moderate drizzle", 55: "Dense drizzle",
    61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
    71: "Slight snowfall", 73: "Moderate snowfall", 75: "Heavy snowfall",
    80: "Rain showers", 81: "Moderate showers", 82: "Violent showers",
    95: "Thunderstorm", 96: "Thunderstorm with hail",
}


async def geocode_city(city: str) -> dict | None:
    """Convert city name to lat/lon using Open-Meteo's free geocoding."""
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            resp = await client.get(
                GEOCODE_URL,
                params={"name": city, "count": 1, "language": "en", "format": "json"},
            )
            resp.raise_for_status()
            results = resp.json().get("results", [])
            if not results:
                return None
            r = results[0]
            return {
                "name": r.get("name"),
                "country": r.get("country"),
                "admin1": r.get("admin1"),  # state/province
                "latitude": r["latitude"],
                "longitude": r["longitude"],
                "timezone": r.get("timezone"),
            }
        except Exception:
            return None


async def get_current_conditions(lat: float, lon: float) -> dict:
    """Current weather from Open-Meteo. Free, no key."""
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            resp = await client.get(
                FORECAST_URL,
                params={
                    "latitude": lat,
                    "longitude": lon,
                    "current": "temperature_2m,apparent_temperature,weathercode,windspeed_10m,relativehumidity_2m",
                    "daily": "temperature_2m_max,temperature_2m_min,precipitation_probability_max",
                    "forecast_days": 3,
                    "timezone": "auto",
                },
            )
            resp.raise_for_status()
            data = resp.json()
            current = data.get("current", {})
            daily = data.get("daily", {})
            code = current.get("weathercode", 0)
            return {
                "temp_c": current.get("temperature_2m"),
                "feels_like_c": current.get("apparent_temperature"),
                "condition": WMO_CODES.get(code, "Unknown"),
                "wind_kmh": current.get("windspeed_10m"),
                "humidity_pct": current.get("relativehumidity_2m"),
                "forecast_3day": {
                    "max": daily.get("temperature_2m_max", [])[:3],
                    "min": daily.get("temperature_2m_min", [])[:3],
                    "rain_chance_pct": daily.get("precipitation_probability_max", [])[:3],
                },
            }
        except Exception:
            return {}


async def get_historical_climate(lat: float, lon: float, month: int) -> dict:
    """
    Historical climate normals for a given month from Open-Meteo Climate API.
    Uses ERA5 reanalysis data — works for any location on earth.
    """
    import datetime

    # Use last 5 years of data for averages
    end_year = datetime.date.today().year - 1
    start_year = end_year - 4
    month_str = f"{month:02d}"

    async with httpx.AsyncClient(timeout=15) as client:
        try:
            resp = await client.get(
                CLIMATE_URL,
                params={
                    "latitude": lat,
                    "longitude": lon,
                    "start_date": f"{start_year}-{month_str}-01",
                    "end_date": f"{end_year}-{month_str}-28",
                    "models": "ERA5",
                    "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max",
                },
            )
            resp.raise_for_status()
            data = resp.json()
            daily = data.get("daily", {})

            def avg(lst):
                vals = [v for v in (lst or []) if v is not None]
                return round(sum(vals) / len(vals), 1) if vals else None

            avg_max = avg(daily.get("temperature_2m_max"))
            avg_min = avg(daily.get("temperature_2m_min"))
            avg_rain = avg(daily.get("precipitation_sum"))

            # Simple characterisation based on data
            if avg_max is not None and avg_min is not None:
                temp_range = f"{avg_min:.0f}–{avg_max:.0f}°C"
            else:
                temp_range = "data unavailable"

            rainy = avg_rain is not None and avg_rain > 4

            return {
                "avg_high_c": avg_max,
                "avg_low_c": avg_min,
                "avg_daily_rain_mm": avg_rain,
                "temp_range": temp_range,
                "typically_rainy": rainy,
            }
        except Exception:
            return {}


async def get_weather_for_planning(destination: str, month: str) -> str:
    """
    Main function called by the LangChain tool.
    Returns a rich text summary of weather for a destination in a given month.
    Works for any city in the world.
    """
    month_map = {
        "january": 1, "february": 2, "march": 3, "april": 4,
        "may": 5, "june": 6, "july": 7, "august": 8,
        "september": 9, "october": 10, "november": 11, "december": 12,
    }
    month_num = month_map.get(month.lower().strip(), 1)

    location = await geocode_city(destination)
    if not location:
        return f"Could not find location data for '{destination}'. Check the spelling or try a nearby major city."

    lat, lon = location["latitude"], location["longitude"]
    full_name = location["name"]
    country = location.get("country", "")

    current = await get_current_conditions(lat, lon)
    climate = await get_historical_climate(lat, lon, month_num)

    lines = [f"Weather intel for {full_name}, {country} in {month.capitalize()}:"]

    if climate:
        lines.append(f"Historical average: {climate['temp_range']}")
        if climate.get("typically_rainy"):
            lines.append(f"Expect rain — average {climate['avg_daily_rain_mm']:.1f}mm/day in this month")
        else:
            lines.append(f"Generally dry — low average rainfall ({climate.get('avg_daily_rain_mm', 0):.1f}mm/day)")

    if current:
        lines.append(
            f"Current conditions (for context): {current.get('condition')}, "
            f"{current.get('temp_c')}°C (feels {current.get('feels_like_c')}°C)"
        )
        forecast = current.get("forecast_3day", {})
        rain_chances = forecast.get("rain_chance_pct", [])
        if rain_chances:
            avg_rain_chance = sum(rain_chances) / len(rain_chances)
            lines.append(f"3-day rain probability: ~{avg_rain_chance:.0f}%")

    if not climate and not current:
        lines.append("Live weather data unavailable — advise user to check local forecasts.")

    return "\n".join(lines)
