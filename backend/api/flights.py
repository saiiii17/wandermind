"""
Amadeus Flight Offers Search.
Uses Amadeus sandbox API — free tier, works globally.
Falls back to structured mock data when keys unavailable.
"""
import os
import time
import httpx

AMADEUS_CLIENT_ID = os.getenv("AMADEUS_CLIENT_ID", "")
AMADEUS_CLIENT_SECRET = os.getenv("AMADEUS_CLIENT_SECRET", "")

# Use test sandbox by default; swap to production.api.amadeus.com for live
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


async def search_flights(
    origin_iata: str,
    destination_iata: str,
    departure_date: str,  # YYYY-MM-DD
    adults: int = 2,
    return_date: str | None = None,
    currency: str = "USD",
) -> list[dict]:
    token = await _get_token()
    if not token:
        return _mock_flights(origin_iata, destination_iata, adults)

    params: dict = {
        "originLocationCode": origin_iata.upper(),
        "destinationLocationCode": destination_iata.upper(),
        "departureDate": departure_date,
        "adults": adults,
        "currencyCode": currency,
        "max": 5,
    }
    if return_date:
        params["returnDate"] = return_date

    async with httpx.AsyncClient(timeout=15) as client:
        try:
            resp = await client.get(
                f"{AMADEUS_BASE}/v2/shopping/flight-offers",
                headers={"Authorization": f"Bearer {token}"},
                params=params,
            )
            resp.raise_for_status()
            data = resp.json()
            results = []
            for offer in data.get("data", [])[:5]:
                price = offer.get("price", {})
                itineraries = offer.get("itineraries", [])
                segments = itineraries[0].get("segments", []) if itineraries else []
                carrier_codes = list({s.get("carrierCode") for s in segments})

                results.append({
                    "price": float(price.get("grandTotal", 0)),
                    "currency": price.get("currency", currency),
                    "carrier": ", ".join(carrier_codes),
                    "stops": len(segments) - 1,
                    "duration": itineraries[0].get("duration", "N/A") if itineraries else "N/A",
                    "departure": segments[0].get("departure", {}).get("at") if segments else None,
                    "arrival": segments[-1].get("arrival", {}).get("at") if segments else None,
                })
            return results
        except Exception:
            return _mock_flights(origin_iata, destination_iata, adults)


async def get_flight_summary(
    origin: str,
    destination: str,
    departure_date: str,
    adults: int = 2,
    currency: str = "USD",
) -> str:
    flights = await search_flights(origin, destination, departure_date, adults, currency=currency)
    if not flights:
        return f"No flight data found for {origin} → {destination} on {departure_date}"

    lines = [f"Flights {origin} → {destination} on {departure_date} ({adults} passengers):"]
    for i, f in enumerate(flights, 1):
        stops_str = "direct" if f["stops"] == 0 else f"{f['stops']} stop(s)"
        lines.append(
            f"{i}. {f['carrier']} | {stops_str} | {f['duration']} | "
            f"{f['currency']} {f['price']:.0f} total"
        )

    cheapest = min(flights, key=lambda x: x["price"])
    per_person = cheapest["price"] / adults
    lines.append(f"\nBest rate: {cheapest['currency']} {per_person:.0f}/person (approx)")
    return "\n".join(lines)


def _mock_flights(origin: str, destination: str, adults: int) -> list[dict]:
    return [
        {
            "price": 320.0 * adults,
            "currency": "USD",
            "carrier": "Search with Amadeus key for live data",
            "stops": 1,
            "duration": "PT8H30M",
            "departure": None,
            "arrival": None,
        }
    ]
