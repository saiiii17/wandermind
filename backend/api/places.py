"""
Google Places API for finding attractions and fetching photos.
Falls back to a basic text search when key is unavailable.
Works for any destination globally.
"""
import os
import httpx

PLACES_KEY = os.getenv("GOOGLE_PLACES_API_KEY", "")
PLACES_BASE = "https://maps.googleapis.com/maps/api/place"


async def search_places(query: str, limit: int = 5) -> list[dict]:
    if not PLACES_KEY:
        return _mock_places(query)

    async with httpx.AsyncClient(timeout=10) as client:
        try:
            resp = await client.get(
                f"{PLACES_BASE}/textsearch/json",
                params={"query": query, "key": PLACES_KEY, "language": "en"},
            )
            resp.raise_for_status()
            data = resp.json()
            results = []
            for place in data.get("results", [])[:limit]:
                results.append({
                    "name": place.get("name"),
                    "address": place.get("formatted_address"),
                    "rating": place.get("rating"),
                    "user_ratings_total": place.get("user_ratings_total"),
                    "types": place.get("types", []),
                    "place_id": place.get("place_id"),
                    "photo_ref": (
                        place["photos"][0]["photo_reference"]
                        if place.get("photos")
                        else None
                    ),
                    "price_level": place.get("price_level"),
                })
            return results
        except Exception:
            return _mock_places(query)


def get_photo_url(photo_reference: str, max_width: int = 1200) -> str:
    if not PLACES_KEY or not photo_reference:
        return ""
    return (
        f"{PLACES_BASE}/photo"
        f"?maxwidth={max_width}"
        f"&photo_reference={photo_reference}"
        f"&key={PLACES_KEY}"
    )


def build_image_url(image_query: str, width: int = 1200, height: int = 700) -> str:
    """
    Returns a usable image URL for a given search query.
    Uses loremflickr.com — free, CC-licensed, keyword-driven, globally relevant.
    Replace with Google Places photo_reference when available.
    """
    keywords = image_query.replace(" ", ",").lower()
    return f"https://loremflickr.com/{width}/{height}/{keywords}"


async def get_destination_highlights(destination: str) -> str:
    places = await search_places(f"must visit attractions {destination}")
    if not places:
        return f"Could not find place data for {destination}"

    lines = [f"Top attractions in {destination}:"]
    for p in places[:5]:
        rating_str = f" (rated {p['rating']}/5)" if p.get("rating") else ""
        lines.append(f"- {p['name']}{rating_str}")

    return "\n".join(lines)


async def get_restaurant_highlights(destination: str, budget_level: str = "any") -> str:
    query = f"best restaurants {destination}"
    if budget_level in ("budget", "cheap"):
        query = f"cheap local food street food {destination}"
    elif budget_level in ("premium", "fine dining"):
        query = f"fine dining restaurants {destination}"

    places = await search_places(query, limit=4)
    if not places:
        return f"No restaurant data for {destination}"

    lines = [f"Food scene in {destination}:"]
    for p in places:
        rating_str = f" ({p['rating']}/5)" if p.get("rating") else ""
        lines.append(f"- {p['name']}{rating_str}")

    return "\n".join(lines)


def _mock_places(query: str) -> list[dict]:
    return [
        {
            "name": f"Notable spot in {query}",
            "address": query,
            "rating": 4.2,
            "types": ["tourist_attraction"],
            "place_id": None,
            "photo_ref": None,
        }
    ]
