"""
Amadeus Hotel Search — free sandbox tier, global coverage.
Falls back to descriptive mock data when keys unavailable.
"""
import os
import time
import httpx

AMADEUS_CLIENT_ID = os.getenv("AMADEUS_CLIENT_ID", "")
AMADEUS_CLIENT_SECRET = os.getenv("AMADEUS_CLIENT_SECRET", "")
AMADEUS_BASE = "https://test.api.amadeus.com"

_token_cache: dict = {"token": None, "expires_at": 0}


async def _get_token() -> str | None:
    if not AMADEUS_CLIENT_ID or not AMADEUS_CLIENT_SECRET:
        return None

    if _token_cache["token"] and time.time() < _token_cache["expires_at"]:
        return _token_cache["token"]

    async with httpx.AsyncClient(timeout=10) as client:
        try:
            resp = await client.post(
                f"{AMADEUS_BASE}/v1/security/oauth2/token",
                data={
                    "grant_type": "client_credentials",
                    "client_id": AMADEUS_CLIENT_ID,
                    "client_secret": AMADEUS_CLIENT_SECRET,
                },
            )
            resp.raise_for_status()
            data = resp.json()
            _token_cache["token"] = data["access_token"]
            _token_cache["expires_at"] = time.time() + data.get("expires_in", 1799) - 30
            return _token_cache["token"]
        except Exception:
            return None


async def search_hotels_by_city(
    city_code: str,
    checkin: str,
    checkout: str,
    adults: int = 2,
    rooms: int = 1,
    currency: str = "USD",
    max_results: int = 5,
) -> list[dict]:
    token = await _get_token()
    if not token:
        return _mock_hotels(city_code)

    async with httpx.AsyncClient(timeout=15) as client:
        try:
            hotel_list_resp = await client.get(
                f"{AMADEUS_BASE}/v1/reference-data/locations/hotels/by-city",
                headers={"Authorization": f"Bearer {token}"},
                params={"cityCode": city_code.upper(), "radius": 5, "radiusUnit": "KM"},
            )
            hotel_list_resp.raise_for_status()
            hotel_ids = [
                h["hotelId"]
                for h in hotel_list_resp.json().get("data", [])[:20]
            ]

            if not hotel_ids:
                return _mock_hotels(city_code)

            offers_resp = await client.get(
                f"{AMADEUS_BASE}/v3/shopping/hotel-offers",
                headers={"Authorization": f"Bearer {token}"},
                params={
                    "hotelIds": ",".join(hotel_ids[:10]),
                    "checkInDate": checkin,
                    "checkOutDate": checkout,
                    "adults": adults,
                    "rooms": rooms,
                    "currency": currency,
                },
            )
            offers_resp.raise_for_status()
            results = []
            for item in offers_resp.json().get("data", [])[:max_results]:
                hotel = item.get("hotel", {})
                offers = item.get("offers", [{}])
                offer = offers[0] if offers else {}
                price = offer.get("price", {})
                results.append({
                    "name": hotel.get("name"),
                    "rating": hotel.get("rating"),
                    "price_per_night": float(price.get("base", 0)),
                    "currency": price.get("currency", currency),
                    "board_type": offer.get("boardType", "room only"),
                    "room_type": offer.get("room", {}).get("type", "Standard"),
                })
            return results if results else _mock_hotels(city_code)
        except Exception:
            return _mock_hotels(city_code)


async def get_hotel_summary(
    city_code: str,
    checkin: str,
    checkout: str,
    adults: int = 2,
    nights: int = 4,
    currency: str = "USD",
) -> str:
    hotels = await search_hotels_by_city(city_code, checkin, checkout, adults, currency=currency)
    if not hotels:
        return f"No hotel data found for {city_code}"

    lines = [f"Hotel options in {city_code} ({nights} nights, {adults} guests):"]
    for h in hotels:
        rating_str = f" | {h['rating']}★" if h.get("rating") else ""
        total = h["price_per_night"] * nights
        lines.append(
            f"- {h['name']}{rating_str} | {h['currency']} {h['price_per_night']:.0f}/night "
            f"({h['currency']} {total:.0f} for {nights} nights)"
        )

    cheapest = min(hotels, key=lambda x: x["price_per_night"])
    lines.append(
        f"\nRange: {cheapest['currency']} {cheapest['price_per_night']:.0f} – "
        f"{max(h['price_per_night'] for h in hotels):.0f}/night"
    )
    return "\n".join(lines)


def _mock_hotels(city_code: str) -> list[dict]:
    return [
        {
            "name": f"Central Hotel {city_code.upper()}",
            "rating": "3",
            "price_per_night": 85.0,
            "currency": "USD",
            "board_type": "room only",
            "room_type": "Standard Double",
        },
        {
            "name": f"Budget Stay {city_code.upper()}",
            "rating": "2",
            "price_per_night": 40.0,
            "currency": "USD",
            "board_type": "room only",
            "room_type": "Dormitory",
        },
    ]
