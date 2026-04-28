"""
LangChain tools that Daddy V (the LangGraph agent) can call.
Each tool returns a plain-text string — the LLM reads it and decides what to do with it.
"""
from langchain_core.tools import tool

from backend.api.weather import get_weather_for_planning
from backend.api.places import get_destination_highlights, get_restaurant_highlights
from backend.api.flights import get_flight_summary
from backend.api.hotels import get_hotel_summary


@tool
async def check_weather(destination: str, month: str) -> str:
    """
    Get weather and climate data for a destination in a specific month.
    Works for any city in the world.
    Use this when deciding if a destination is suitable for a given travel window.

    Args:
        destination: City or region name (e.g. "Lisbon", "Hokkaido", "Cape Town")
        month: Month name in English (e.g. "january", "june", "october")
    """
    return await get_weather_for_planning(destination, month)


@tool
async def explore_destination(destination: str) -> str:
    """
    Get top attractions and food highlights for any destination globally.
    Use this to understand what a destination offers before recommending it,
    or when building a day-by-day itinerary.

    Args:
        destination: City or region name (e.g. "Kyoto", "Marrakech", "Buenos Aires")
    """
    attractions = await get_destination_highlights(destination)
    food = await get_restaurant_highlights(destination)
    return f"{attractions}\n\n{food}"


@tool
async def find_flights(
    origin_iata: str,
    destination_iata: str,
    departure_date: str,
    passengers: int = 2,
    currency: str = "USD",
) -> str:
    """
    Search for available flights between two airports.
    Use IATA airport codes (e.g. BOM for Mumbai, CDG for Paris, JFK for New York).
    Use this to give the group real pricing context before recommending a destination.

    Args:
        origin_iata: 3-letter IATA code for origin airport (e.g. "DEL", "LHR", "SYD")
        destination_iata: 3-letter IATA code for destination airport (e.g. "BCN", "BKK", "NBO")
        departure_date: Date in YYYY-MM-DD format
        passengers: Number of passengers
        currency: Currency code (default USD)
    """
    return await get_flight_summary(origin_iata, destination_iata, departure_date, passengers, currency)


@tool
async def find_hotels(
    city_code: str,
    checkin: str,
    checkout: str,
    guests: int = 2,
    nights: int = 3,
    currency: str = "USD",
) -> str:
    """
    Search for hotel availability and pricing in a city.
    Use IATA city codes (e.g. PAR for Paris, TYO for Tokyo, BOM for Mumbai).
    Use this to give the group realistic accommodation cost estimates.

    Args:
        city_code: 3-letter IATA city code (e.g. "LON", "DXB", "SIN")
        checkin: Check-in date in YYYY-MM-DD format
        checkout: Check-out date in YYYY-MM-DD format
        guests: Number of guests
        nights: Number of nights (for total cost calculation)
        currency: Currency code (default USD)
    """
    return await get_hotel_summary(city_code, checkin, checkout, guests, nights, currency)


def get_tools():
    return [check_weather, explore_destination, find_flights, find_hotels]
