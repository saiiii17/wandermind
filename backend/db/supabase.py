"""
Supabase client for room and session persistence.
Handles: room creation, member tracking, message logging.

Tables expected in Supabase:
  rooms(id text PK, created_at timestamptz, host_name text)
  room_members(room_id text, username text, joined_at timestamptz)
  messages(id uuid PK default gen_random_uuid(), room_id text, sender text,
           content text, ui jsonb, created_at timestamptz default now())
"""
import os
from supabase import create_client, Client

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

_client: Client | None = None


def get_client() -> Client | None:
    global _client
    if not SUPABASE_URL or not SUPABASE_KEY:
        return None
    if _client is None:
        try:
            _client = create_client(SUPABASE_URL, SUPABASE_KEY)
        except Exception as e:
            print(f"[Supabase] Could not connect: {e} — running without persistence")
            return None
    return _client


# ── Rooms ──────────────────────────────────────────────────────────────────────

async def create_room(room_id: str, host_name: str) -> bool:
    client = get_client()
    if not client:
        return True  # no-op in dev without Supabase

    try:
        client.table("rooms").insert({"id": room_id, "host_name": host_name}).execute()
        return True
    except Exception:
        return False


async def room_exists(room_id: str) -> bool:
    client = get_client()
    if not client:
        return False  # caller falls back to in-memory

    try:
        result = client.table("rooms").select("id").eq("id", room_id).execute()
        return len(result.data) > 0
    except Exception:
        return False


# ── Members ────────────────────────────────────────────────────────────────────

async def add_member(room_id: str, username: str) -> bool:
    client = get_client()
    if not client:
        return True

    try:
        client.table("room_members").upsert(
            {"room_id": room_id, "username": username}
        ).execute()
        return True
    except Exception:
        return False


async def get_members(room_id: str) -> list[str]:
    client = get_client()
    if not client:
        return []

    try:
        result = (
            client.table("room_members")
            .select("username")
            .eq("room_id", room_id)
            .execute()
        )
        return [row["username"] for row in result.data]
    except Exception:
        return []


# ── Messages ───────────────────────────────────────────────────────────────────

async def save_message(
    room_id: str,
    sender: str,
    content: str,
    ui: dict | None = None,
) -> bool:
    client = get_client()
    if not client:
        return True

    try:
        client.table("messages").insert(
            {"room_id": room_id, "sender": sender, "content": content, "ui": ui}
        ).execute()
        return True
    except Exception:
        return False


async def get_message_history(room_id: str, limit: int = 50) -> list[dict]:
    client = get_client()
    if not client:
        return []

    try:
        result = (
            client.table("messages")
            .select("sender, content, ui, created_at")
            .eq("room_id", room_id)
            .order("created_at", desc=False)
            .limit(limit)
            .execute()
        )
        return result.data
    except Exception:
        return []
